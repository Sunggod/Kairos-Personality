import { z } from "zod";

const sha256Schema = z
  .string()
  .regex(/^[0-9a-f]{64}$/i, "SHA-256 deve ter 64 caracteres hexadecimais");

export const filePinSchema = z.object({
  sha256: sha256Schema,
  size: z.number().int().nonnegative(),
});

export const archivePinSchema = filePinSchema.extend({
  file: z.string().min(1),
});

export const runtimeLockSchema = z.object({
  schemaVersion: z.literal(1),
  runtime: z.literal("llama.cpp"),
  release: z.string().min(1),
  build: z.string().regex(/^b\d+$/, "build deve ter a forma b<numero>"),
  commit: z.string().regex(/^[0-9a-f]{40}$/, "commit deve ser um SHA-1 completo"),
  platform: z.string().min(1),
  archiveDir: z.string().min(1),
  installDir: z.string().min(1),
  archives: z.record(z.string(), archivePinSchema),
  binaries: z.record(z.string(), filePinSchema),
});

export type RuntimeLock = z.infer<typeof runtimeLockSchema>;

export const modelPinSchema = filePinSchema.extend({
  file: z.string().min(1),
  role: z.string().min(1),
  source: z.string().url(),
  provisional: z.boolean(),
  note: z.string().min(1).optional(),
});

export type ModelPin = z.infer<typeof modelPinSchema>;

export const modelsLockSchema = z.object({
  schemaVersion: z.literal(1),
  models: z.record(z.string(), modelPinSchema),
});

export type ModelsLock = z.infer<typeof modelsLockSchema>;
