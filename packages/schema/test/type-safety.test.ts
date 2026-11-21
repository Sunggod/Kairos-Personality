import { expect, test } from "bun:test";
import {
  autoWriteSchema,
  lockedWriteSchema,
  type AutoWrite,
  type LockedWrite,
  type StyleLayer,
} from "../src";

const style: StyleLayer = {
  slang: 0.7,
  humor: 0.8,
  sarcasm: 0.8,
  drama: 0.7,
  profanity: "livre",
  task_verbosity: "curta",
  verbosity: "media",
  formality: "baixa",
  proactivity: 0.5,
};

// @ts-expect-error P13: `auto` nao pode escrever em `floors` (tipo separado)
const autoFloors: AutoWrite = { layer: "floors", value: {} };

// @ts-expect-error P13: `auto` nao pode escrever em `traits_base` (tipo separado)
const autoTraits: AutoWrite = { layer: "traits_base", value: {} };

// @ts-expect-error escrita travada exige autoridade explicita
const lockedSemAutoridade: LockedWrite = { layer: "floors", value: {} };

const autoValido: AutoWrite = { layer: "style", value: style };

test("P13: o tipo de escrita auto so aceita as quatro camadas auto", () => {
  expect(autoWriteSchema.safeParse({ layer: "style", value: style }).success).toBe(true);
  expect(
    autoWriteSchema.safeParse({
      layer: "floors",
      value: {
        facts: "P1",
        approval: "P2",
        pii_third_party: "never",
        identity_disclosure: "on_request",
        influence_disclosure: "on_request",
        explicit_content: "allow",
        crisis: "care",
      },
    }).success,
  ).toBe(false);
  expect(autoValido.layer).toBe("style");
  expect([autoFloors, autoTraits, lockedSemAutoridade]).toHaveLength(3);
});

test("escrita travada exige authority responsible", () => {
  expect(
    lockedWriteSchema.safeParse({
      layer: "floors",
      authority: "responsible",
      value: {
        facts: "P1",
        approval: "P2",
        pii_third_party: "never",
        identity_disclosure: "on_request",
        influence_disclosure: "on_request",
        explicit_content: "allow",
        crisis: "care",
      },
    }).success,
  ).toBe(true);
  expect(
    lockedWriteSchema.safeParse({ layer: "floors", value: {} }).success,
  ).toBe(false);
});
