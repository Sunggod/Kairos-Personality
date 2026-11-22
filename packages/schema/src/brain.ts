import { z } from "zod";
import { schemaVersionSchema, traceSchema } from "./common";

export const BRAIN_PROTOCOL_VERSION = "kairos/1";
export const BRAIN_REPORT_SCHEMA_VERSION = "1.0";

/** Envelope mínimo aceito por `POST /rpc` do Brain (B1). */
export const brainEnvelopeSchema = z.looseObject({
  proto: z.literal(BRAIN_PROTOCOL_VERSION),
  id: z.string().min(1),
  trace: traceSchema,
  from: z.string().min(1),
  to: z.string().min(1),
  kind: z.enum(["request", "response", "event", "cancel", "report"]),
});

export const brainRequestEnvelopeSchema = brainEnvelopeSchema.extend({
  kind: z.literal("request"),
  cap: z.string().min(1),
  acceptLang: z.string().min(1).optional(),
  idempotencyKey: z
    .string()
    .regex(/^[0-9a-f]{64}$/, "idempotencyKey deve ser SHA-256")
    .optional(),
  schemaVersion: z.literal(BRAIN_REPORT_SCHEMA_VERSION),
  payload: z.record(z.string(), z.unknown()),
});

export const brainCancelEnvelopeSchema = brainEnvelopeSchema.extend({
  kind: z.literal("cancel"),
  cap: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

/** Erro do Brain é consumido; a lista de códigos pertence ao Brain, não é redefinida aqui. */
export const brainErrorSchema = z.looseObject({
  code: z.string().min(1),
  field: z.string().optional(),
  retryable: z.boolean(),
  message: z.string(),
});

export const rpcResponseSchema = z.union([
  z.looseObject({
    jsonrpc: z.literal("2.0"),
    result: z.unknown(),
    id: z.string(),
  }),
  z.looseObject({
    jsonrpc: z.literal("2.0"),
    error: brainErrorSchema,
    id: z.string().nullable(),
  }),
]);

export const reportOutcomeSchema = z.enum([
  "succeeded",
  "partial",
  "failed",
  "aborted",
]);

/** Report do Brain validado no consumidor; campos extras são preservados. */
export const brainReportSchema = z.looseObject({
  proto: z.literal(BRAIN_PROTOCOL_VERSION),
  kind: z.literal("report"),
  reportId: z.string().min(1),
  taskId: z.string().min(1),
  trace: traceSchema,
  node: z.string().min(1),
  nodeVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  workspace: z.string().min(1),
  lang: z.string().min(1),
  outcome: reportOutcomeSchema,
  headline: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  did: z.array(z.string()),
  effected: z.array(
    z.looseObject({
      verb: z.string(),
      object: z.string(),
      reversible: z.boolean(),
    }),
  ),
  caveats: z.array(z.string()).optional(),
  detailRef: z.string().optional(),
  synthetic: z.boolean().optional(),
});

export const planStepResultSchema = z.looseObject({
  ok: z.boolean(),
  alias: z.string().min(1),
  result: z.unknown().optional(),
  error: brainErrorSchema.optional(),
  report: brainReportSchema.optional(),
});

export const approvalRecordSchema = z.looseObject({
  id: z.string().min(1),
  trace: traceSchema,
  workspace: z.string().min(1),
  step: z.string(),
  reason: z.string(),
  requestedAt: z.number(),
  expiresAt: z.number(),
  decision: z.enum(["approved", "denied"]).optional(),
  approver: z.string().optional(),
});

export const planRunResultSchema = z.looseObject({
  status: z.enum(["executed", "awaiting-approval"]),
  origin: z.looseObject({ kind: z.enum(["flow", "planner"]), name: z.string() }),
  trace: traceSchema,
  workspace: z.string().min(1),
  results: z.array(planStepResultSchema).default([]),
  report: brainReportSchema.optional(),
  approval: approvalRecordSchema.optional(),
});

export const approvalDecisionSchema = z.enum(["approved", "denied"]);

export const streamEventEnvelopeSchema = z.looseObject({
  proto: z.literal(BRAIN_PROTOCOL_VERSION),
  id: z.string().min(1),
  trace: traceSchema,
  from: z.string().min(1),
  to: z.string().min(1),
  kind: z.string().min(1),
  schemaVersion: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type BrainEnvelope = z.infer<typeof brainEnvelopeSchema>;
export type BrainRequestEnvelope = z.infer<typeof brainRequestEnvelopeSchema>;
export type BrainError = z.infer<typeof brainErrorSchema>;
export type BrainReport = z.infer<typeof brainReportSchema>;
export type PlanRunResult = z.infer<typeof planRunResultSchema>;
export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;
export type StreamEventEnvelope = z.infer<typeof streamEventEnvelopeSchema>;
