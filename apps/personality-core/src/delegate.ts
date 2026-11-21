import {
  delegationsFileSchema,
  type DelegationEntry,
  type DelegationsFile,
  type ApprovalRecord,
  type Slots,
} from "@kairos-personality/schema";
import {
  BrainTransportError,
  type ApprovalFromUi,
  type BrainClient,
} from "./brain-client";
import { intentKey } from "./intentions";
import {
  aggregate,
  CANCEL_UNAVAILABLE_SPEECH,
  UNKNOWN_SPEECH,
  type AggregatedResult,
} from "./report-aggregation";
import type { TaskStore } from "./task-store";

export class DelegateError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DelegateError";
    this.code = code;
  }
}

export function loadDelegations(text: string): DelegationsFile {
  return delegationsFileSchema.parse(JSON.parse(text) as unknown);
}

/** Valida o subconjunto de JSON Schema usado em `delegations.json` (D2). */
export function validateSlots(
  entry: DelegationEntry,
  slots: Readonly<Record<string, unknown>>,
): string[] {
  const schema = entry.slots as Slots;
  const errors: string[] = [];
  const properties = schema.properties;
  const required = Array.isArray(schema.required)
    ? (schema.required as unknown as string[])
    : [];
  const additionalProperties = schema.additionalProperties;

  for (const key of required) {
    if (!Object.hasOwn(slots, key)) {
      errors.push(key + ": obrigatório");
    }
  }

  for (const [key, value] of Object.entries(slots)) {
    const spec: unknown = properties[key];
    if (spec !== undefined && typeof spec === "object" && spec !== null && "type" in spec) {
      const expected = (spec as { type: unknown }).type;
      if (typeof expected === "string") {
        const actual = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
        if (expected !== actual) {
          errors.push(key + ": esperado " + expected + ", recebido " + actual);
        }
      }
    } else if (additionalProperties === false) {
      errors.push(key + ": não declarado no slots");
    }
  }

  return errors;
}

export interface DelegateInput {
  readonly turnId: string;
  readonly trace: string;
  readonly flow: string;
  readonly slots: Readonly<Record<string, unknown>>;
  readonly origin: "user" | "persona";
}

export interface DelegateOutcome {
  readonly status: "executed" | "awaiting-approval" | "unknown" | "deduped" | "blocked" | "not_cancelled";
  readonly trace: string;
  readonly intentKey: string;
  readonly reason?: string;
  readonly speech?: string;
  readonly aggregate?: AggregatedResult;
  readonly approval?: ApprovalRecord;
}

export interface TurnLog {
  info(data: Record<string, unknown>, message: string): void;
}

export interface DelegateDeps {
  readonly client: BrainClient;
  readonly tasks: TaskStore;
  readonly delegations: DelegationsFile;
  readonly log: TurnLog;
  readonly workspace: string;
}

export function createDelegate(deps: DelegateDeps) {
  return {
    async delegate(input: DelegateInput): Promise<DelegateOutcome> {
      const entry = deps.delegations.entries.find((item) => item.flow === input.flow);

      if (entry === undefined) {
        return {
          status: "blocked",
          trace: input.trace,
          intentKey: "",
          reason: "unknown_flow",
        };
      }

      const slotErrors = validateSlots(entry, input.slots);
      if (slotErrors.length > 0) {
        return {
          status: "blocked",
          trace: input.trace,
          intentKey: "",
          reason: "slot_invalid",
          speech: slotErrors.join("; "),
        };
      }

      // D13: fail-closed antes do envelope, julgado pelo núcleo, não pelo LLM.
      if (entry.tier === "sensitive" && input.origin === "persona") {
        return {
          status: "blocked",
          trace: input.trace,
          intentKey: "",
          reason: "tier_requires_user_request",
        };
      }

      const key = intentKey(input);

      if (deps.tasks.hasIntention(key)) {
        deps.log.info(
          { event: "delegate.deduped", trace: input.trace, intentKey: key, flow: input.flow },
          "intenção repetida: segunda chamada descartada",
        );
        return { status: "deduped", trace: input.trace, intentKey: key };
      }

      // P11: intenção e tarefa gravadas ANTES do plan.run.
      deps.tasks.begin({
        trace: input.trace,
        taskId: "tsk_" + key.slice(0, 12),
        flow: input.flow,
        intentKey: key,
        slots: JSON.stringify(input.slots),
      });

      try {
        const result = await deps.client.planRun({
          trace: input.trace,
          workspace: deps.workspace,
          flow: input.flow,
          slots: input.slots,
          acceptLang: entry.lang,
        });

        if (result.status === "awaiting-approval") {
          deps.tasks.setState(input.trace, "awaiting-approval");
          return {
            status: "awaiting-approval",
            trace: input.trace,
            intentKey: key,
            ...(result.approval !== undefined ? { approval: result.approval } : {}),
          };
        }

        const aggregated = aggregate(result);
        deps.tasks.setState(input.trace, "executed", aggregated.outcome);

        return {
          status: "executed",
          trace: input.trace,
          intentKey: key,
          aggregate: aggregated,
        };
      } catch (error) {
        if (error instanceof BrainTransportError && error.status === 502) {
          // B11: 502 sem Report não é "falhou limpo".
          deps.tasks.setState(input.trace, "unknown");
          return {
            status: "unknown",
            trace: input.trace,
            intentKey: key,
            speech: UNKNOWN_SPEECH,
          };
        }

        throw error;
      }
    },

    async approve(event: ApprovalFromUi): Promise<Record<string, unknown>> {
      return deps.client.decideApproval(event);
    },

    async cancel(trace: string): Promise<DelegateOutcome> {
      try {
        await deps.client.cancel(trace);
        return {
          status: "executed",
          trace,
          intentKey: "",
        };
      } catch (error) {
        if (error instanceof BrainTransportError && error.code === "CANCELLED") {
          return {
            status: "not_cancelled",
            trace,
            intentKey: "",
            speech: CANCEL_UNAVAILABLE_SPEECH,
          };
        }
        throw error;
      }
    },
  };
}
