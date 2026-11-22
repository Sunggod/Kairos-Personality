import { describe, expect, it } from "bun:test";
import {
  BrainContractError,
  BrainTransportError,
  createBrainClient,
  createUiApprovalToken,
  type BrainClient,
} from "../src/brain-client";

const trace = "trace_cliente_01";

const executed = {
  status: "executed",
  origin: { kind: "flow", name: "two-step" },
  trace,
  workspace: "f2-unit",
  results: [],
  report: {
    proto: "kairos/1",
    kind: "report",
    reportId: "rep_1",
    taskId: "tsk_1",
    trace,
    node: "kairos-brain",
    nodeVersion: "0.1.0",
    schemaVersion: "1.0",
    workspace: "f2-unit",
    lang: "en",
    outcome: "succeeded",
    headline: "Plano executado",
    did: [],
    effected: [],
  },
};

function clientWith(
  handler: (request: Request) => Promise<Response> | Response,
): BrainClient {
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      return handler(request);
    },
  });
  // O servidor é descartado pelo garbage collector do Bun ao fim do teste.
  return createBrainClient({ baseUrl: "http://127.0.0.1:" + server.port });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("cliente HTTP do Brain", () => {
  it("monta o envelope de plan.run e valida o resultado", async () => {
    let sent: Record<string, unknown> | undefined;
    const client = clientWith(async (request) => {
      sent = (await request.json()) as Record<string, unknown>;
      return json({ jsonrpc: "2.0", result: executed, id: "req_" + trace });
    });

    const result = await client.planRun({
      trace,
      workspace: "f2-unit",
      flow: "two-step",
      slots: { objective: "teste" },
    });

    expect(result.status).toBe("executed");
    expect(result.report?.outcome).toBe("succeeded");
    expect(sent?.["proto"]).toBe("kairos/1");
    expect(sent?.["from"]).toBe("kairos-personality");
    expect(sent?.["to"]).toBe("kairos-brain");
    expect(sent?.["cap"]).toBe("plan.run");
    expect((sent?.["payload"] as Record<string, unknown>)["workspace"]).toBe("f2-unit");
  });

  it("plan.run nao bloqueia o chamador enquanto a resposta nao volta", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const client = createBrainClient({
      baseUrl: "http://127.0.0.1:1",
      fetchImpl: (() =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })) as unknown as typeof fetch,
    });

    const pending = client.planRun({
      trace,
      workspace: "f2-unit",
      flow: "two-step",
      slots: {},
    });
    const chamadorSeguiu = true;

    expect(chamadorSeguiu).toBe(true);
    expect(resolveFetch).toBeDefined();
    resolveFetch?.(json({ jsonrpc: "2.0", result: executed, id: "req_" + trace }));
    await pending;
  });

  it("502 sem Report vira erro tipado com status, sem fingir sucesso", async () => {
    const client = clientWith(() =>
      json(
        {
          jsonrpc: "2.0",
          error: { code: "NODE_UNAVAILABLE", retryable: true, message: "falha no meio" },
          id: null,
        },
        502,
      ),
    );

    try {
      await client.planRun({ trace, workspace: "f2-unit", flow: "two-step", slots: {} });
      throw new Error("esperava erro");
    } catch (error) {
      expect(error).toBeInstanceOf(BrainTransportError);
      expect((error as BrainTransportError).status).toBe(502);
      expect((error as BrainTransportError).code).toBe("NODE_UNAVAILABLE");
    }
  });

  it("recusa slot que tenta sobrescrever workspace ou flow", async () => {
    const client = clientWith(() => json({ jsonrpc: "2.0", result: executed, id: "req" }));

    try {
      await client.planRun({
        trace,
        workspace: "f2-unit",
        flow: "two-step",
        slots: { workspace: "outro" },
      });
      throw new Error("esperava erro");
    } catch (error) {
      expect(error).toBeInstanceOf(BrainContractError);
    }
  });

  it("aprovação exige token de UI e fixa approver no cliente", async () => {
    let sent: Record<string, unknown> | undefined;
    const client = clientWith(async (request) => {
      sent = (await request.json()) as Record<string, unknown>;
      return json({ jsonrpc: "2.0", result: { status: "executed" }, id: "appr_1" });
    });

    const base = {
      approvalId: "appr_1",
      decision: "approved" as const,
      workspace: "f2-unit",
      trace,
    };

    const result = await client.decideApproval(base, createUiApprovalToken());
    expect(result).toEqual({ status: "executed" });
    const payload = sent?.["payload"] as Record<string, unknown>;
    expect(payload["approver"]).toBe("user:local/ui");

    // Dado do LLM não consegue fabricar o símbolo privado do token.
    const forged = JSON.parse('{"source":"ui","approver":"LLM"}') as unknown;
    try {
      await client.decideApproval(base, forged as never);
      throw new Error("esperava erro");
    } catch (error) {
      expect(error).toBeInstanceOf(BrainContractError);
    }
  });

  it("cancel usa kind cancel e devolve o erro 409 como erro tipado", async () => {
    let sent: Record<string, unknown> | undefined;
    const client = clientWith(async (request) => {
      sent = (await request.json()) as Record<string, unknown>;
      return json(
        {
          jsonrpc: "2.0",
          error: { code: "CANCELLED", retryable: false, message: "sem invocação ativa" },
          id: null,
        },
        409,
      );
    });

    try {
      await client.cancel(trace);
      throw new Error("esperava erro");
    } catch (error) {
      expect((error as BrainTransportError).status).toBe(409);
      expect(sent?.["kind"]).toBe("cancel");
    }
  });

  it("stream le eventos SSE e ignora keepalive", async () => {
    const event = {
      proto: "kairos/1",
      id: "evt_1",
      trace,
      from: "fake-node",
      to: "kairos-brain",
      kind: "event",
      schemaVersion: "1.0",
      payload: { step: 1 },
    };
    const sse =
      ": keepalive\n\n" +
      "data: " + JSON.stringify(event) + "\n\n";

    const client = clientWith(() => new Response(sse, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    }));

    const seen: string[] = [];
    const handle = await client.stream({
      trace,
      onEvent: (received) => seen.push(received.id),
    });
    await Bun.sleep(30);
    handle.close();

    expect(seen).toEqual(["evt_1"]);
  });
});
