import { z } from "zod";
import { schemaVersionSchema } from "./common";

export const delegationRiskSchema = z.enum(["none", "reversible", "irreversible"]);

export type DelegationRisk = z.infer<typeof delegationRiskSchema>;

export const delegationTierSchema = z.enum(["open", "notify", "sensitive"]);

export type DelegationTier = z.infer<typeof delegationTierSchema>;

export const delegationLangSchema = z
  .string()
  .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, {
    error: "lang_invalido: use um tag de idioma como pt-BR",
  });

/** `slots` é um JSON Schema de objeto (D2). Palavras-chave extras são permitidas. */
export const slotsSchema = z.looseObject({
  type: z.literal("object", {
    error: "slots_invalidos: slots devem ser um JSON Schema de objeto",
  }),
  properties: z.record(z.string(), z.unknown()).default({}),
});

export type Slots = z.infer<typeof slotsSchema>;

const delegationBase = {
  schemaVersion: schemaVersionSchema,
  flow: z.string().min(1).max(512),
  description: z.string().min(1),
  risk: delegationRiskSchema,
  lang: delegationLangSchema,
};

export const delegationEntrySchema = z.discriminatedUnion(
  "tier",
  [
    z.strictObject({ ...delegationBase, tier: z.literal("open"), slots: slotsSchema }),
    z.strictObject({ ...delegationBase, tier: z.literal("notify"), slots: slotsSchema }),
    z.strictObject({
      ...delegationBase,
      tier: z.literal("sensitive"),
      slots: slotsSchema,
    }),
  ],
  { error: "tier_required: tier deve ser open, notify ou sensitive (D13)" },
);

export type DelegationEntry = z.infer<typeof delegationEntrySchema>;

export const delegationsFileSchema = z.strictObject({
  schemaVersion: schemaVersionSchema,
  entries: z.array(delegationEntrySchema).min(1),
});

export type DelegationsFile = z.infer<typeof delegationsFileSchema>;
