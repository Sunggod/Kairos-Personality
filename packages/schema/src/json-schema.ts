import { z } from "zod";
import { affectStateSchema } from "./affect";
import {
  brainReportSchema,
  brainRequestEnvelopeSchema,
  planRunResultSchema,
} from "./brain";
import {
  delegationEntrySchema,
  delegationsFileSchema,
} from "./delegation";
import { memoryRecordSchema } from "./memory";
import {
  autoWriteSchema,
  lockedWriteSchema,
  personaLayersSchema,
} from "./persona";
import { modelsLockSchema, runtimeLockSchema } from "./pins";
import { intentionRecordSchema, taskRecordSchema } from "./tasks";
import { workingFrameSchema } from "./working";

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
  "working-frame": toSchema(
    workingFrameSchema,
    "Kairos Personality Working Frame",
    "https://kairos-personality.local/schema/working-frame.json",
  ),
  "delegation-entry": toSchema(
    delegationEntrySchema,
    "Kairos Personality Delegation Entry",
    "https://kairos-personality.local/schema/delegation-entry.json",
  ),
  "delegations-file": toSchema(
    delegationsFileSchema,
    "Kairos Personality Delegations File",
    "https://kairos-personality.local/schema/delegations-file.json",
  ),
  "brain-request-envelope": toSchema(
    brainRequestEnvelopeSchema,
    "Kairos Brain Request Envelope",
    "https://kairos-personality.local/schema/brain-request-envelope.json",
  ),
  "brain-report": toSchema(
    brainReportSchema,
    "Kairos Brain Report",
    "https://kairos-personality.local/schema/brain-report.json",
  ),
  "plan-run-result": toSchema(
    planRunResultSchema,
    "Kairos Brain plan.run Result",
    "https://kairos-personality.local/schema/plan-run-result.json",
  ),
  "task-record": toSchema(
    taskRecordSchema,
    "Kairos Personality Task Record",
    "https://kairos-personality.local/schema/task-record.json",
  ),
  "intention-record": toSchema(
    intentionRecordSchema,
    "Kairos Personality Intention Record",
    "https://kairos-personality.local/schema/intention-record.json",
  ),
} as const;

export type JsonSchemaName = keyof typeof jsonSchemas;
