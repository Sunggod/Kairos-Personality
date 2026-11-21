import { describe, expect, it } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  affectStateSchema,
  autoWriteSchema,
  lockedWriteSchema,
  memoryRecordSchema,
  parseVectorFile,
  personaLayersSchema,
  runVector,
  vectorsFromFile,
  type VectorWithSchema,
} from "../src";

const vectorSchemas: Record<string, z.ZodType> = {
  "persona-layers": personaLayersSchema,
  "auto-write": autoWriteSchema,
  "locked-write": lockedWriteSchema,
  "affect-state": affectStateSchema,
  "memory-record": memoryRecordSchema,
};

const vectorsDir = fileURLToPath(new URL("../vectors/", import.meta.url));

async function loadVectors(): Promise<VectorWithSchema[]> {
  const files = (await readdir(vectorsDir)).filter((name) => name.endsWith(".json"));
  const vectors: VectorWithSchema[] = [];

  for (const file of files) {
    const text = await readFile(vectorsDir + file, "utf8");
    vectors.push(...vectorsFromFile(parseVectorFile(text)));
  }

  return vectors;
}

describe("vetores de contrato", () => {
  it("todo vetor aponta para um schema registrado", async () => {
    const vectors = await loadVectors();

    for (const vector of vectors) {
      expect(vectorSchemas[vector.schema], vector.id + ": " + vector.schema).toBeDefined();
    }
  });

  it("todo vetor passa no que espera, pela razao que espera", async () => {
    const vectors = await loadVectors();

    for (const vector of vectors) {
      const schema = vectorSchemas[vector.schema];

      if (!schema) {
        throw new Error("schema nao registrado: " + vector.schema);
      }

      const result = runVector(vector, schema);

      if (vector.expect.ok) {
        expect(result.ok, vector.id).toBe(true);
        continue;
      }

      expect(result.ok, vector.id).toBe(false);
      expect(result.reason, vector.id).toBe(vector.expect.reject);

      if (vector.expect.path) {
        expect(result.path, vector.id).toBe(vector.expect.path);
      }
    }
  });

  it("metade dos vetores e de rejeicao", async () => {
    const vectors = await loadVectors();
    const rejections = vectors.filter((vector) => !vector.expect.ok).length;

    expect(rejections).toBeGreaterThan(0);
    expect(rejections * 2).toBeGreaterThanOrEqual(vectors.length);
  });
});
