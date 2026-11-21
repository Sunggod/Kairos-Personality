import { z } from "zod";
import { idSchema, schemaVersionSchema } from "./common";
import { affectGainsSchema, bigFiveSchema, type BigFive } from "./affect";

export const identityLayerSchema = z.strictObject({
  name: z.string().min(1),
  language: z.string().min(2),
  tone: z.string().min(1),
  self_intro: z.string().min(1),
});

export type IdentityLayer = z.infer<typeof identityLayerSchema>;

export const styleLayerSchema = z.strictObject({
  slang: z.number().min(0).max(1),
  humor: z.number().min(0).max(1),
  sarcasm: z.number().min(0).max(1),
  drama: z.number().min(0).max(1),
  profanity: z.enum(["livre", "moderado", "nenhum"]),
  task_verbosity: z.enum(["curta", "media", "longa"]),
  verbosity: z.enum(["curta", "media", "longa"]),
  formality: z.enum(["baixa", "media", "alta"]),
  proactivity: z.number().min(0).max(1),
});

export type StyleLayer = z.infer<typeof styleLayerSchema>;

export const lexiconEntrySchema = z.strictObject({
  term: z.string().min(1),
  meaning: z.string().min(1),
  register: z.string().min(1),
  example: z.string().min(1),
  provenance: z.string().min(1),
});

export type LexiconEntry = z.infer<typeof lexiconEntrySchema>;

export const goalSchema = z.strictObject({
  id: idSchema,
  description: z.string().min(1),
  priority: z.number().min(0).max(1),
});

export type Goal = z.infer<typeof goalSchema>;

export const floorsSchema = z.strictObject({
  facts: z.literal("P1"),
  approval: z.literal("P2"),
  pii_third_party: z.literal("never"),
  identity_disclosure: z.literal("on_request"),
  influence_disclosure: z.literal("on_request"),
  explicit_content: z.literal("allow"),
  crisis: z.literal("care"),
});

export type Floors = z.infer<typeof floorsSchema>;

export const failureReactionSchema = z.strictObject({
  partial: z.string().min(1),
  failed: z.string().min(1),
  synthetic: z.string().min(1),
  unknown: z.string().min(1),
});

export type FailureReaction = z.infer<typeof failureReactionSchema>;

export const personaLayersSchema = z.strictObject({
  schemaVersion: schemaVersionSchema,
  identity: identityLayerSchema,
  style: styleLayerSchema,
  lexicon: z.array(lexiconEntrySchema).default([]),
  goals: z.array(goalSchema).default([]),
  traits_base: bigFiveSchema,
  affect_gains: affectGainsSchema,
  floors: floorsSchema,
  failure_reaction: failureReactionSchema,
});

export type PersonaLayers = z.infer<typeof personaLayersSchema>;

/**
 * P13/D12: as únicas camadas que `auto` pode escrever. `floors` e `traits_base`
 * não aparecem aqui — o compilador recusa antes de qualquer verificação em runtime.
 */
export type AutoWrite =
  | { readonly layer: "identity"; readonly value: IdentityLayer }
  | { readonly layer: "style"; readonly value: StyleLayer }
  | { readonly layer: "lexicon"; readonly value: readonly LexiconEntry[] }
  | { readonly layer: "goals"; readonly value: readonly Goal[] };

export type AutoWritableLayer = AutoWrite["layer"];
export type LockedLayer = "floors" | "traits_base";

/**
 * Escrita nas camadas travadas exige autoridade explícita do responsável.
 * Não é produzida por `auto` em nenhum caminho do núcleo.
 */
export type LockedWrite =
  | { readonly layer: "floors"; readonly value: Floors; readonly authority: "responsible" }
  | { readonly layer: "traits_base"; readonly value: BigFive; readonly authority: "responsible" };

export const autoWriteSchema = z.discriminatedUnion(
  "layer",
  [
    z.strictObject({ layer: z.literal("identity"), value: identityLayerSchema }),
    z.strictObject({ layer: z.literal("style"), value: styleLayerSchema }),
    z.strictObject({ layer: z.literal("lexicon"), value: z.array(lexiconEntrySchema) }),
    z.strictObject({ layer: z.literal("goals"), value: z.array(goalSchema) }),
  ],
  {
    error:
      "locked_layer_write: auto nao pode escrever em floors nem em traits_base (P13)",
  },
);

export type AutoWritePayload = z.infer<typeof autoWriteSchema>;

export const lockedWriteSchema = z.discriminatedUnion(
  "layer",
  [
    z.strictObject({
      layer: z.literal("floors"),
      value: floorsSchema,
      authority: z.literal("responsible", {
        error: "locked_authority_required: escrita travada exige o responsavel",
      }),
    }),
    z.strictObject({
      layer: z.literal("traits_base"),
      value: bigFiveSchema,
      authority: z.literal("responsible", {
        error: "locked_authority_required: escrita travada exige o responsavel",
      }),
    }),
  ],
  { error: "locked_authority_required: escrita travada exige o responsavel" },
);

export type LockedWritePayload = z.infer<typeof lockedWriteSchema>;
