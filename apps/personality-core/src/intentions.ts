import { createHash } from "node:crypto";

type Json = null | boolean | number | string | Json[] | { readonly [key: string]: Json };

function canonical(value: unknown): Json {
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonical(item));
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const keys = Object.keys(source).sort();
    // Object.create(null) + defineProperty impede que chaves como `__proto__`
    // alterem o prototype e desapareçam da serialização (chave de intenção fiel).
    const result = Object.create(null) as Record<string, Json>;
    for (const key of keys) {
      Object.defineProperty(result, key, {
        value: canonical(source[key]),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return result;
  }
  throw new Error("slot não serializável: " + typeof value);
}

/** JSON canônico: chaves ordenadas recursivamente, sem depender da ordem de inserção. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(canonical(value));
}

/** P11: chave = hash de (turno, flow, slots canonicalizados). */
export function intentKey(input: {
  readonly turnId: string;
  readonly flow: string;
  readonly slots: Readonly<Record<string, unknown>>;
}): string {
  return createHash("sha256")
    .update(
      canonicalize({
        turnId: input.turnId,
        flow: input.flow,
        slots: input.slots,
      }),
    )
    .digest("hex");
}
