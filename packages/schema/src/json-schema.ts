import { z } from "zod";
import { affectStateSchema } from "./affect";
import { memoryRecordSchema } from "./memory";
import {
  autoWriteSchema,
  lockedWriteSchema,
  personaLayersSchema,
} from "./persona";
import { modelsLockSchema, runtimeLockSchema } from "./pins";

const draft = "https://json-schema.org/draft/2020-12/schema" as const;

function toSchema(
  schema: z.ZodType,
  title: string,
  id: string,
): Record<string, unknown> {
  return {
    ...z.toJSONSchema(schema),
    $schema: draft,
    $id: id,
    title,
  };
}

export const jsonSchemas = {
  "runtime-lock": toSchema(
    runtimeLockSchema,
    "Kairos Personality Runtime Lock",
    "https://kairos-personality.local/schema/runtime-lock.json",
  ),
  "models-lock": toSchema(
    modelsLockSchema,
    "Kairos Personality Models Lock",
    "https://kairos-personality.local/schema/models-lock.json",
  ),
  "persona-layers": toSchema(
    personaLayersSchema,
    "Kairos Personality Persona Layers",
    "https://kairos-personality.local/schema/persona-layers.json",
  ),
  "auto-write": toSchema(
    autoWriteSchema,
    "Kairos Personality Auto Write",
    "https://kairos-personality.local/schema/auto-write.json",
  ),
  "locked-write": toSchema(
    lockedWriteSchema,
    "Kairos Personality Locked Write",
    "https://kairos-personality.local/schema/locked-write.json",
  ),
  "affect-state": toSchema(
    affectStateSchema,
    "Kairos Personality Affect State",
    "https://kairos-personality.local/schema/affect-state.json",
  ),
  "memory-record": toSchema(
    memoryRecordSchema,
    "Kairos Personality Memory Record",
    "https://kairos-personality.local/schema/memory-record.json",
  ),
} as const;

export type JsonSchemaName = keyof typeof jsonSchemas;
