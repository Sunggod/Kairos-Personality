import { z } from "zod";
import {
  idSchema,
  isoDateTimeSchema,
  schemaVersionSchema,
  traceSchema,
} from "./common";

export const taskStateSchema = z.enum([
  "pending",
  "running",
  "awaiting-approval",
  "executed",
  "failed",
  "cancelled",
  "unknown",
]);

export type TaskState = z.infer<typeof taskStateSchema>;

export const turnOriginSchema = z.enum(["user", "persona"]);

export type TurnOrigin = z.infer<typeof turnOriginSchema>;

export const interactiveFrameSchema = z.strictObject({
  id: idSchema,
  kind: z.literal("interactive"),
  trace: traceSchema,
  startedAt: isoDateTimeSchema,
});

export type InteractiveFrame = z.infer<typeof interactiveFrameSchema>;

export const taskFrameSchema = z.strictObject({
  id: idSchema,
  kind: z.literal("task"),
  trace: traceSchema,
  state: taskStateSchema,
  flow: idSchema,
  origin: turnOriginSchema,
  startedAt: isoDateTimeSchema,
  pending: z.boolean(),
  /** Verbatim do Brain (P1): guardado como dado opaco, nunca reinterpretado aqui. */
  lastReport: z.record(z.string(), z.unknown()).optional(),
});

export type TaskFrame = z.infer<typeof taskFrameSchema>;

/**
 * §5.1: um frame raiz `interactive` por turno e um frame por delegação em voo.
 * A forma com `root` + `tasks` torna dois roots impossíveis no tipo.
 */
export const workingFrameSchema = z.strictObject({
  schemaVersion: schemaVersionSchema,
  trace: traceSchema,
  root: interactiveFrameSchema,
  tasks: z.array(taskFrameSchema).default([]),
});

export type WorkingFrame = z.infer<typeof workingFrameSchema>;
