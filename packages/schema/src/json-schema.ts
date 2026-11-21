import { z } from "zod";
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
} as const;

export type JsonSchemaName = keyof typeof jsonSchemas;
