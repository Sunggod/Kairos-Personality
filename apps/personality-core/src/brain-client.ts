import {
  BRAIN_PROTOCOL_VERSION,
  brainCancelEnvelopeSchema,
  brainRequestEnvelopeSchema,
  planRunResultSchema,
  rpcResponseSchema,
  streamEventEnvelopeSchema,
  type BrainError,
  type PlanRunResult,
  type StreamEventEnvelope,
} from "@kairos-personality/schema";

export class BrainTransportError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field: string | undefined;
  readonly retryable: boolean;

  constructor(status: number, error: BrainError) {
    super(error.message);
    this.name = "BrainTransportError";
    this.status = status;
    this.code = error.code;
    this.field = error.field;
    this.retryable = error.retryable;
  }
}

export class BrainContractError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super("resposta do Brain fora do contrato: " + detail);
    this.name = "BrainContractError";
    this.detail = detail;
  }
}

export interface PlanRunInput {
  readonly trace: string;
  readonly workspace: string;
  readonly flow: string;
  readonly slots: Readonly<Record<string, unknown>>;
  readonly acceptLang?: string;
  readonly idempotencyKey?: string;
}

export interface ApprovalFromUi {
  readonly source: "ui";
  readonly approvalId: string;
  readonly decision: "approved" | "denied";
  readonly approver: string;
  readonly workspace: string;
  readonly trace: string;
}

export interface StreamHandle {
  close(): void;
  readonly closed: boolean;
}

export interface BrainClient {
  planRun(input: PlanRunInput): Promise<PlanRunResult>;
  decideApproval(event: ApprovalFromUi): Promise<Record<string, unknown>>;
  cancel(trace: string): Promise<Record<string, unknown>>;
  stream(options: {
    trace: string;
    onEvent: (event: StreamEventEnvelope) => void;
  }): Promise<StreamHandle>;
}

export interface BrainClientOptions {
  readonly baseUrl: string;
  readonly from?: string;
  readonly fetchImpl?: typeof fetch;
}

function issuePaths(detail: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return detail.issues
    .map((issue) => (issue.path.join(".") || "(raiz)") + ": " + issue.message)
    .join("; ");
}

export function createBrainClient(options: BrainClientOptions): BrainClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const from = options.from ?? "kairos-personality";
  const fetchImpl = options.fetchImpl ?? fetch;

  async function rpc(
    envelope: Record<string, unknown>,
  ): Promise<unknown> {
    const response = await fetchImpl(baseUrl + "/rpc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope),
    });

    const raw: unknown = await response.json();

    const parsed = rpcResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BrainContractError(issuePaths(parsed.error));
    }

    const body: { result?: unknown; error?: BrainError } = parsed.data;
    if (body.error !== undefined) {
      throw new BrainTransportError(response.status, body.error);
    }

    return body.result;
  }

  return {
    async planRun(input) {
      for (const reserved of ["workspace", "flow"]) {
        if (Object.hasOwn(input.slots, reserved)) {
          throw new BrainContractError("slot reservado: " + reserved);
        }
      }

      const envelope = brainRequestEnvelopeSchema.parse({
        proto: BRAIN_PROTOCOL_VERSION,
        id: "req_" + input.trace,
        trace: input.trace,
        from,
        to: "kairos-brain",
        kind: "request",
        cap: "plan.run",
        ...(input.acceptLang !== undefined ? { acceptLang: input.acceptLang } : {}),
        ...(input.idempotencyKey !== undefined
          ? { idempotencyKey: input.idempotencyKey }
          : {}),
        schemaVersion: "1.0",
        payload: { workspace: input.workspace, flow: input.flow, ...input.slots },
      });

      const result = await rpc(envelope);
      const checked = planRunResultSchema.safeParse(result);
      if (!checked.success) {
        throw new BrainContractError(issuePaths(checked.error));
      }
      return checked.data;
    },

    async decideApproval(event) {
      // P2/B8: o canal de aprovação é determinístico e vem da UI, nunca do LLM.
      if (event.source !== "ui") {
        throw new BrainContractError("aprovação só pode vir da UI (P2)");
      }

      const envelope = brainRequestEnvelopeSchema.parse({
        proto: BRAIN_PROTOCOL_VERSION,
        id: "appr_" + event.approvalId,
        trace: event.trace,
        from,
        to: "kairos-brain",
        kind: "request",
        cap: "approval.decide",
        schemaVersion: "1.0",
        payload: {
          workspace: event.workspace,
          approvalId: event.approvalId,
          decision: event.decision,
          approver: event.approver,
        },
      });

      const result = await rpc(envelope);
      return result as Record<string, unknown>;
    },

    async cancel(trace) {
      const envelope = brainCancelEnvelopeSchema.parse({
        proto: BRAIN_PROTOCOL_VERSION,
        id: "cancel_" + trace,
        trace,
        from,
        to: "kairos-brain",
        kind: "cancel",
        cap: "cancel",
        payload: { trace },
      });

      const result = await rpc(envelope);
      return result as Record<string, unknown>;
    },

    async stream(options) {
      const url =
        baseUrl + "/stream?trace=" + encodeURIComponent(options.trace);
      const response = await fetchImpl(url);
      if (!response.ok || response.body === null) {
        throw new BrainTransportError(response.status, {
          code: "STREAM_UNAVAILABLE",
          retryable: false,
          message: "stream indisponível",
        });
      }

      const controller = new AbortController();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      const pump = async (): Promise<void> => {
        try {
          while (!controller.signal.aborted) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            let separator = buffer.indexOf("\n\n");
            while (separator !== -1) {
              const block = buffer.slice(0, separator);
              buffer = buffer.slice(separator + 2);
              const data = block
                .split("\n")
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trimStart())
                .join("\n");
              separator = buffer.indexOf("\n\n");
              if (data.length === 0 || data.startsWith("[")) continue;
              const raw: unknown = JSON.parse(data);
              const parsed = streamEventEnvelopeSchema.safeParse(raw);
              if (parsed.success) options.onEvent(parsed.data);
            }
          }
        } finally {
          finished = true;
        }
      };

      void pump();

      return {
        close() {
          controller.abort();
          void reader.cancel();
        },
        get closed() {
          return finished || controller.signal.aborted;
        },
      };
    },
  };
}
