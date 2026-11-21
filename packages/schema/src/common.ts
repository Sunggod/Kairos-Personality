import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;

export const schemaVersionSchema = z.literal(SCHEMA_VERSION, {
  error: "schema_version: schemaVersion deve ser 1",
});

export const idSchema = z.string().min(1).max(256);

export const traceSchema = z
  .string()
  .min(1, { error: "trace_required: trace obrigatoria por turno (P9)" })
  .max(256);

export const isoDateTimeSchema = z.iso.datetime();

export const sha256Schema = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, "sha256_invalido: esperados 64 caracteres hexadecimais");

export function reason(code: string, message: string): string {
  return code + ": " + message;
}
