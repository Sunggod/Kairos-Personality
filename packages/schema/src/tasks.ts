import { z } from "zod";
import { schemaVersionSchema, traceSchema } from "./common";
import { reportOutcomeSchema } from "./brain";

export const storedTaskStateSchema = z.enum([
  "running",
  "awaiting-approval",
  "executed",
  "failed",
  "cancelled",
  "unknown",
]);

export type StoredTaskState = z.infer<typeof storedTaskStateSchema>;

export const taskRecordSchema = z.strictObject({
  schemaVersion: schemaVersionSchema,
  trace: traceSchema,
  taskId: z.string().min(1),
  flow: z.string().min(1),
  state: storedTaskStateSchema,
  intentKey: z.string().regex(/^[0-9a-f]{64}$/, "intentKey deve ser SHA-256"),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  outcome: reportOutcomeSchema.or(z.literal("unknown")).optional(),
});

export type TaskRecord = z.infer<typeof taskRecordSchema>;

export const intentionRecordSchema = z.strictObject({
  schemaVersion: schemaVersionSchema,
  intentKey: z.string().regex(/^[0-9a-f]{64}$/, "intentKey deve ser SHA-256"),
  trace: traceSchema,
  flow: z.string().min(1),
  slots: z.string().min(1),
  createdAt: z.string().min(1),
});

export type IntentionRecord = z.infer<typeof intentionRecordSchema>;
