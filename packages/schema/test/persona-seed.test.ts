import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { personaLayersSchema } from "../src";

const seedPath = fileURLToPath(new URL("../data/persona.seed.json", import.meta.url));
const studyPath = fileURLToPath(
  new URL("../../../docs/estudo-arquitetura.md", import.meta.url),
);

function studySeed(): Record<string, unknown> {
  const text = readFileSync(studyPath, "utf8").replace(/^\uFEFF/, "");
  const section = text.indexOf("### 6.2 Semente da persona");

  if (section < 0) {
    throw new Error("secao 6.2 nao encontrada no estudo");
  }

  const start = text.indexOf("```json", section);
  const end = text.indexOf("```", start + 7);

  if (start < 0 || end < 0) {
    throw new Error("bloco JSON da secao 6.2 nao encontrado");
  }

  return JSON.parse(text.slice(start + 7, end).trim()) as Record<string, unknown>;
}

test("persona.seed.json e validado pelo schema de PersonaLayers", async () => {
  const raw = JSON.parse(await readFile(seedPath, "utf8")) as unknown;
  const parsed = personaLayersSchema.parse(raw);

  expect(parsed.schemaVersion).toBe(1);
  expect(parsed.floors).toEqual({
    facts: "P1",
    approval: "P2",
    pii_third_party: "never",
    identity_disclosure: "on_request",
    influence_disclosure: "on_request",
    explicit_content: "allow",
    crisis: "care",
  });
  expect(parsed.traits_base).toEqual({
    openness: 0.85,
    conscientiousness: 0.55,
    extraversion: 0.75,
    agreeableness: 0.25,
    neuroticism: 0.45,
  });
});

test("a semente copia exatamente o JSON de §6.2, sem suavizar valores", async () => {
  const parsed = personaLayersSchema.parse(
    JSON.parse(await readFile(seedPath, "utf8")) as unknown,
  );
  const {
    schemaVersion: _version,
    lexicon: _lexicon,
    goals: _goals,
    ...seedCore
  } = parsed;

  expect(seedCore).toEqual(studySeed() as typeof seedCore);
});
