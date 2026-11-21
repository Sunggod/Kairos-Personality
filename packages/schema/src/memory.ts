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
  // Normalização estrutural: NFKC (fullwidth), homóglifos e traços Unicode.
  const normalized = content
    .normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[аеорсіјѕумктбнгхοαερικντχ]/g, (char) => HOMOGLYPHS[char] ?? char);
  const flat = normalized.replace(/\s+/g, "");
  const digits = normalized.replace(/\D/g, "");

  // 1. Token ou credencial em prosa. Vem primeiro para um token com muitos
  //    dígitos ser classificado como segredo, não como CPF/telefone.
  if (/\b(?:sk|rk|ghp|gho|github_pat|xox[baprs]|AKIA)[-_][A-Za-z0-9_-]{10,}/i.test(normalized)) {
    return "secret_or_token";
  }

  if (/\b(?:senha|password|passwd|secret|segredo|secreta|chave|token|api|key|credencial)\b[\s\S]{0,60}?(?:[:=]|é|eh|seria|será|seja|\s+e\s+)\s*\S+/i.test(normalized)) {
    return "secret_or_token";
  }

  // 2. E-mail estrutural, independente do alfabeto.
  if (/[^\s@]+@[^\s@]+\.[^\s@]{2,}/u.test(flat)) {
    return "third_party_pii";
  }

  // 3. CPF e telefone: qualquer sequência de 10 ou 11 dígitos, com qualquer
  //    separador. Fail-closed: um ID longo pode ser descartado, PII não pode entrar.
  if (/\d{10,11}/.test(digits)) {
    return "third_party_pii";
  }

  // 4. Caminho absoluto, UNC, relativo ou unidade com extensão de arquivo.
  if (/\b[A-Za-z]:(?:[\\/]|[\w.-]+\.[A-Za-z0-9]{1,5})/.test(normalized)) {
    return "file_path";
  }

  if (/(?:^|[^\w])[\\/][\w.~-]+/.test(normalized) ||
      /(?:\.\.|~)[\\/]/.test(flat) ||
      /[\\/]{2}[^\\/\s]+[\\/]/.test(flat)) {
    return "file_path";
  }

  // 5. Report cru: presença das chaves, em qualquer ordem, aspas ou valor.
  if (/\boutcome\b\\?["']?\s*[:=]/i.test(normalized) &&
      /\b(?:caveats|effected)\b\\?["']?\s*[:=]/i.test(normalized)) {
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
