import { z } from "zod";

export const vectorExpectSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true) }),
  z.strictObject({
    ok: z.literal(false),
    reject: z.string().min(1),
    path: z.string().min(1).optional(),
  }),
]);

export const vectorSchema = z.strictObject({
  id: z.string().min(1),
  input: z.unknown(),
  expect: vectorExpectSchema,
});

export const vectorFileSchema = z.strictObject({
  schema: z.string().min(1),
  vectors: z.array(vectorSchema).min(1),
});

export type Vector = z.infer<typeof vectorSchema>;
export type VectorFile = z.infer<typeof vectorFileSchema>;
export type VectorExpect = z.infer<typeof vectorExpectSchema>;

export interface VectorResult {
  ok: boolean;
  reason?: string;
  path?: string;
}

export type VectorWithSchema = Vector & { readonly schema: string };

/** Motivo estável: o código vem prefixado na mensagem do Zod quando é uma recusa nomeada. */
export function rejectionReason(error: z.ZodError): string {
  for (const issue of error.issues) {
    const match = /^([a-z][a-z0-9_]*):/.exec(issue.message);
    if (match?.[1]) {
      return match[1];
    }
  }

  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      return "unknown_field";
    }
  }

  return "schema_rejection";
}

export function runVector(vector: Vector, schema: z.ZodType): VectorResult {
  const parsed = schema.safeParse(vector.input);

  if (parsed.success) {
    return { ok: true };
  }

  const first = parsed.error.issues[0];
  const path = first?.path.join(".") || "";

  return {
    ok: false,
    reason: rejectionReason(parsed.error),
    ...(path.length > 0 ? { path } : {}),
  };
}

export function parseVectorFile(text: string): VectorFile {
  return vectorFileSchema.parse(JSON.parse(text) as unknown);
}

export function vectorsFromFile(file: VectorFile): VectorWithSchema[] {
  return file.vectors.map((vector) => ({ ...vector, schema: file.schema }));
}
