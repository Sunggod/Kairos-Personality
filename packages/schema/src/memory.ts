import { z } from "zod";
import {
  idSchema,
  isoDateTimeSchema,
  schemaVersionSchema,
  sha256Schema,
  traceSchema,
} from "./common";

export const memoryTierSchema = z.enum(["M0", "M1", "M2", "M3", "M4"]);

export type MemoryTier = z.infer<typeof memoryTierSchema>;

export const memoryOriginSchema = z.enum(["user", "persona"]);

export type MemoryOrigin = z.infer<typeof memoryOriginSchema>;

/**
 * D14: filtro de escrita determinístico. Segredo, token, senha, caminho de
 * arquivo, PII de terceiro e Report cru não entram em M2/M3 (R26, P14).
 * Os padrões são sintéticos por construção: nenhum dado real é necessário.
 */
export function sensitiveContentCode(content: string): string | null {
  const patterns: ReadonlyArray<readonly [string, RegExp]> = [
    [
      "third_party_pii",
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|(?:\+55\s?)?\(?\d{2}\)?\s+\d{4,5}[- ]?\d{4}\b/,
    ],
    [
      "secret_or_token",
      /\b(?:sk|rk|ghp|gho|github_pat|xox[baprs]|AKIA)[-_][A-Za-z0-9_-]{10,}|\b(?:senha|password|passwd|secret|token|api[_-]?key)\s*[:=]\s*\S+/i,
    ],
    ["file_path", /[A-Za-z]:\\|[\\/](?:Users|home|etc|var)[\\/]/i],
    [
      "raw_report",
      /"outcome"\s*:\s*"(?:succeeded|partial|failed|aborted|synthetic)"[\s\S]*"caveats"/i,
    ],
  ];

  for (const [code, pattern] of patterns) {
    if (pattern.test(content)) {
      return code;
    }
  }

  return null;
}

const memoryBase = {
  schemaVersion: schemaVersionSchema,
  id: idSchema,
  tier: memoryTierSchema,
  origin: memoryOriginSchema,
  createdAt: isoDateTimeSchema,
};

const contentRecordSchema = z
  .strictObject({
    ...memoryBase,
    kind: z.literal("content"),
    content: z.string().min(1),
    trace: traceSchema.optional(),
    expiresAt: isoDateTimeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tier !== "M2" && value.tier !== "M3") {
      return;
    }

    const code = sensitiveContentCode(value.content);

    if (code) {
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: code + ": conteudo sensivel nao entra em M2/M3 (R26)",
      });
    }
  });

const tombstoneRecordSchema = z.strictObject({
  ...memoryBase,
  kind: z.literal("tombstone"),
  forgottenAt: isoDateTimeSchema,
  hash: sha256Schema,
});

export const memoryRecordSchema = z.discriminatedUnion(
  "kind",
  [contentRecordSchema, tombstoneRecordSchema],
  { error: "memory_kind_invalid: kind deve ser content ou tombstone" },
);

export type MemoryRecord = z.infer<typeof memoryRecordSchema>;
