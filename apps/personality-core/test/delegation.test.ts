import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrainReport } from "@kairos-personality/schema";
import { createBrainClient, BrainTransportError, type BrainClient } from "../src/brain-client";
import { canonicalize, intentKey } from "../src/intentions";
import { aggregate, worstOutcome } from "../src/report-aggregation";
import { createDelegate, loadDelegations, validateSlots } from "../src/delegate";
import { TaskStore } from "../src/task-store";

const delegationsPath = fileURLToPath(
  new URL("../../../packages/schema/data/delegations.json", import.meta.url),
);

const trace = "trace_delegate_01";
const reportBase: BrainReport = {
  proto: "kairos/1",
  kind: "report",
  reportId: "rep_1",
  taskId: "tsk_1",
  trace,
  node: "kairos-brain",
  nodeVersion: "0.1.0",
  schemaVersion: "1.0",
  workspace: "f2-unit",
  lang: "pt-BR",
  outcome: "succeeded",
  headline: "Plano executado",
  did: [],
  effected: [],
};

function report(outcome: "succeeded" | "partial" | "failed") {
  return { ...reportBase, outcome, headline: outcome === "partial" ? "Ficou uma parte" : reportBase.headline };
}

function fakeClient(overrides: Partial<BrainClient> = {}): BrainClient {
  return {
    async planRun() {
      return {
        status: "executed" as const,
        origin: { kind: "flow" as const, name: "two-step" },
        trace,
        workspace: "f2-unit",
        results: [],
        report: report("succeeded"),
      };
    },
    async decideApproval() { return {}; },
    async cancel() { return {}; },
    async stream() { return { close() {}, closed: true }; },
    ...overrides,
  };
}

function setup() {
  return {
    delegations: loadDelegations("{\"schemaVersion\":1,\"entries\":[{\"schemaVersion\":1,\"flow\":\"two-step\",\"description\":\"Fluxo de teste\",\"risk\":\"none\",\"tier\":\"open\",\"lang\":\"pt-BR\",\"slots\":{\"type\":\"object\",\"properties\":{\"objective\":{\"type\":\"string\"}},\"required\":[\"objective\"]}},{\"schemaVersion\":1,\"flow\":\"pagamento\",\"description\":\"Irreversivel\",\"risk\":\"irreversible\",\"tier\":\"sensitive\",\"lang\":\"pt-BR\",\"slots\":{\"type\":\"object\",\"properties\":{\"destino\":{\"type\":\"string\"}},\"required\":[\"destino\"]}}]}"),
  };
}

describe("chave de intenção e agregação", () => {
  it("canonicaliza independente da ordem das chaves", () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
    const key = intentKey({ turnId: "t1", flow: "two-step", slots: { a: 1, b: 2 } });
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).toBe(intentKey({ turnId: "t1", flow: "two-step", slots: { b: 2, a: 1 } }));
  });

  it("o pior outcome vence mesmo quando o report final é succeeded", () => {
    const outcome = worstOutcome([report("partial"), report("succeeded")]);
    expect(outcome).toBe("partial");

    const aggregated = aggregate({
      status: "executed",
      origin: { kind: "flow", name: "two-step" },
      trace,
      workspace: "f2-unit",
      results: [{ ok: true, alias: "inspect", report: report("partial") }],
      report: report("succeeded"),
    });

    expect(aggregated.outcome).toBe("partial");
    expect(aggregated.report.outcome).toBe("succeeded");
    expect(aggregated.reportsRead).toBe(2);
  });

  it("usa o arquivo real de delegações do F1", async () => {
    const text = await readFile(delegationsPath, "utf8");
    const loaded = loadDelegations(text);
    expect(loaded.entries[0]?.flow).toBe("two-step");
  });
});

describe("delegate", () => {
  it("P11: duas chamadas iguais geram um plan.run", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-delegate-"));
    const tasks = new TaskStore({ path: join(root, "tasks.sqlite") });
    let calls = 0;
    const logs: Array<Record<string, unknown>> = [];
    const client = fakeClient({
      async planRun() {
        calls += 1;
        return {
          status: "executed",
          origin: { kind: "flow", name: "two-step" },
          trace,
          workspace: "f2-unit",
          results: [],
          report: report("succeeded"),
        };
      },
    });
    const delegate = createDelegate({
      client,
      tasks,
      delegations: setup().delegations,
      workspace: "f2-unit",
      log: { info(data) { logs.push(data); } },
    });

    try {
      const input = {
        turnId: "turn_1",
        trace,
        flow: "two-step",
        slots: { objective: "teste" },
        origin: "user" as const,
      };
      const first = await delegate.delegate(input);
      const second = await delegate.delegate(input);

      expect(first.status).toBe("executed");
      expect(second.status).toBe("deduped");
      expect(calls).toBe(1);
      expect(logs[0]?.["event"]).toBe("delegate.deduped");
      expect(tasks.get(trace)?.state).toBe("executed");
    } finally {
      tasks.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("B11: 502 sem Report vira unknown com fala conservadora", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-delegate-b11-"));
    const tasks = new TaskStore({ path: join(root, "tasks.sqlite") });
    const client = fakeClient({
      async planRun() {
        throw new BrainTransportError(502, {
          code: "NODE_UNAVAILABLE",
          retryable: true,
          message: "falha no meio do plano",
        });
      },
    });
    const delegate = createDelegate({
      client,
      tasks,
      delegations: setup().delegations,
      workspace: "f2-unit",
      log: { info() {} },
    });

    try {
      const result = await delegate.delegate({
        turnId: "turn_2",
        trace,
        flow: "two-step",
        slots: { objective: "teste" },
        origin: "user",
      });

      expect(result.status).toBe("unknown");
      expect(result.speech).toContain("algo pode ter ficado feito");
      expect(tasks.get(trace)?.state).toBe("unknown");
    } finally {
      tasks.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("tier sensitive com origem persona é bloqueado antes do envelope", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-delegate-tier-"));
    const tasks = new TaskStore({ path: join(root, "tasks.sqlite") });
    let calls = 0;
    const delegate = createDelegate({
      client: fakeClient({
        async planRun() { calls += 1; throw new Error("não deveria chamar"); },
      }),
      tasks,
      delegations: setup().delegations,
      workspace: "f2-unit",
      log: { info() {} },
    });

    try {
      const result = await delegate.delegate({
        turnId: "turn_3",
        trace,
        flow: "pagamento",
        slots: { destino: "exemplo" },
        origin: "persona",
      });

      expect(result.status).toBe("blocked");
      expect(result.reason).toBe("tier_requires_user_request");
      expect(calls).toBe(0);
    } finally {
      tasks.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("slot de tipo errado nunca chega ao plan.run", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-delegate-slots-"));
    const tasks = new TaskStore({ path: join(root, "tasks.sqlite") });
    let calls = 0;
    const delegate = createDelegate({
      client: fakeClient({
        async planRun() { calls += 1; throw new Error("não deveria chamar"); },
      }),
      tasks,
      delegations: setup().delegations,
      workspace: "f2-unit",
      log: { info() {} },
    });

    try {
      const result = await delegate.delegate({
        turnId: "turn_4",
        trace,
        flow: "two-step",
        slots: { objective: 42 },
        origin: "user",
      });

      expect(result.status).toBe("blocked");
      expect(result.reason).toBe("slot_invalid");
      expect(calls).toBe(0);
    } finally {
      tasks.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("cancel 409 vira fala 'não consegui cancelar' (R19)", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-delegate-cancel-"));
    const tasks = new TaskStore({ path: join(root, "tasks.sqlite") });
    const delegate = createDelegate({
      client: fakeClient({
        async cancel() {
          throw new BrainTransportError(409, {
            code: "CANCELLED",
            retryable: false,
            message: "sem invocação ativa",
          });
        },
      }),
      tasks,
      delegations: setup().delegations,
      workspace: "f2-unit",
      log: { info() {} },
    });

    try {
      const result = await delegate.cancel(trace);
      expect(result.status).toBe("not_cancelled");
      expect(result.speech).toBe("não consegui cancelar");
    } finally {
      tasks.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("valida slots diretamente com motivo", () => {
    const entry = setup().delegations.entries[0];
    if (entry === undefined) throw new Error("entry ausente");
    expect(validateSlots(entry, { objective: "ok" })).toEqual([]);
    expect(validateSlots(entry, { objective: 3 })).toContain("objective: esperado string, recebido number");
  });
});
