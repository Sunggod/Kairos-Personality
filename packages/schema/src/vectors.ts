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

export interface Rejection {
  code: string;
  path?: string;
}

type ZodIssueLike = z.ZodError["issues"][number];

function pathOf(issue: ZodIssueLike): string {
  return issue.path.join(".");
}

function withPath(code: string, issue: ZodIssueLike): Rejection {
  const path = pathOf(issue);
  return path.length > 0 ? { code, path } : { code };
}

/**
 * Motivo estável: o código vem prefixado na mensagem do Zod quando é uma
 * recusa nomeada. O caminho devolvido é o da mesma issue que deu o motivo,
 * para não casar razão de um erro com campo de outro.
 */
export function rejectionReason(error: z.ZodError): Rejection {
  for (const issue of error.issues) {
    const match = /^([a-z][a-z0-9_]*):/.exec(issue.message);
    if (match?.[1]) {
      return withPath(match[1], issue);
    }
  }

  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      const code = issue.keys.includes("content")
        ? "tombstone_with_content"
        : "unknown_field";
      return withPath(code, issue);
    }
  }

  const pathFallbacks: ReadonlyArray<readonly [string, string]> = [
    ["trace", "trace_required"],
    ["slots", "slots_required"],
  ];

  for (const issue of error.issues) {
    const path = pathOf(issue);
    for (const [fragment, code] of pathFallbacks) {
      if (path === fragment || path.endsWith("." + fragment)) {
        return withPath(code, issue);
      }
    }
  }

  const first = error.issues[0];
  return first ? withPath("schema_rejection", first) : { code: "schema_rejection" };
}

export function runVector(vector: Vector, schema: z.ZodType): VectorResult {
  const parsed = schema.safeParse(vector.input);

  if (parsed.success) {
    return { ok: true };
  }

  const rejection = rejectionReason(parsed.error);

  return {
    ok: false,
    reason: rejection.code,
    ...(rejection.path ? { path: rejection.path } : {}),
  };
}

export function parseVectorFile(text: string): VectorFile {
  return vectorFileSchema.parse(JSON.parse(text) as unknown);
}

export function vectorsFromFile(file: VectorFile): VectorWithSchema[] {
  return file.vectors.map((vector) => ({ ...vector, schema: file.schema }));
}
