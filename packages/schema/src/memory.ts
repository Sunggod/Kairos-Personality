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
const HOMOGLYPHS: Readonly<Record<string, string>> = {
  а: "a", е: "e", о: "o", р: "p", с: "c", х: "x", і: "i", ј: "j",
  ѕ: "s", у: "y", м: "m", к: "k", т: "t", б: "b", н: "h", г: "r",
  ο: "o", α: "a", ε: "e", ρ: "p", ι: "i", κ: "k", ν: "v", τ: "t", χ: "x",
};

export function sensitiveContentCode(content: string): string | null {
  // NFKC resolve fullwidth; o mapa resolve homóglifos cirílicos/gregos; os
  // traços Unicode viram '-'. `flat` remove espaços para separadores gráficos.
  const normalized = content
    .normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[аеорсіјѕумктбнгхοαερικντχ]/g, (char) => HOMOGLYPHS[char] ?? char);
  const flat = normalized.replace(/\s+/g, "");

  const piiPatterns: ReadonlyArray<RegExp> = [
    // E-mail estrutural: pega qualquer alfabeto depois da normalização.
    /[^\s@]+@[^\s@]+\.[^\s@]{2,}/u,
    // CPF: colado, pontuado, com espaços ou com traços em qualquer posição.
    /\b\d{3}[.-]?\d{3}[.-]?\d{3}[.-]?\d{2}\b/,
    // Telefone: exige +55, DDD entre parênteses, separador explícito ou 11 dígitos com 9.
    /\+55\d{2}\d{4,5}[.-]?\d{4}/,
    /\(\d{2}\)\d{4,5}[.-]?\d{4}/,
    /\b\d{2}[.-]\d{4,5}[.-]?\d{4}\b/,
    /\b\d{2}9\d{8}\b/,
  ];

  for (const pattern of piiPatterns) {
    if (pattern.test(flat)) {
      return "third_party_pii";
    }
  }

  const secretPattern =
    /\b(?:sk|rk|ghp|gho|github_pat|xox[baprs]|AKIA)[-_][A-Za-z0-9_-]{10,}|\b(?:senha|password|passwd|secret|segredo|chave|token|api[_-]?key|api\s+key)\b(?:\s+(?:de|da|do|api|key)){0,2}\s*(?:[:=]|é|eh|e|seria|será|seja)\s*\S+/i;

  if (secretPattern.test(normalized)) {
    return "secret_or_token";
  }

  const drivePattern = /\b[A-Za-z]:[\\/]?/;
  const pathPattern = /~[\\/]|\.\.[\\/]|[\\/]{2}[^\\/\s]+[\\/]|[\\/][\w.~-]+[\\/]/;

  if (drivePattern.test(normalized) || pathPattern.test(flat)) {
    return "file_path";
  }

  // Report cru: chaves outcome e caveats/effected em qualquer ordem, aspas ou valor.
  if (/\boutcome\b["']?\s*[:=]/i.test(normalized) &&
      /\b(?:caveats|effected)\b["']?\s*[:=]/i.test(normalized)) {
    return "raw_report";
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
