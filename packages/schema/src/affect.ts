import { z } from "zod";
import { isoDateTimeSchema, schemaVersionSchema } from "./common";

export const padAxisSchema = z.number().refine(
  (value) => value >= -1 && value <= 1,
  { error: "pad_axis_out_of_range: eixo PAD deve estar em [-1, 1]" },
);

export const padSchema = z.strictObject({
  valence: padAxisSchema,
  arousal: padAxisSchema,
  dominance: padAxisSchema,
});

export type Pad = z.infer<typeof padSchema>;

export const bigFiveValueSchema = z.number().refine(
  (value) => value >= 0 && value <= 1,
  { error: "big_five_out_of_range: traço deve estar em [0, 1]" },
);

export const bigFiveSchema = z.strictObject({
  openness: bigFiveValueSchema,
  conscientiousness: bigFiveValueSchema,
  extraversion: bigFiveValueSchema,
  agreeableness: bigFiveValueSchema,
  neuroticism: bigFiveValueSchema,
});

export type BigFive = z.infer<typeof bigFiveSchema>;

export const affectGainsSchema = z.strictObject({
  valence_gain: z.number().finite(),
  arousal_gain: z.number().finite(),
  dominance_gain: z.number().finite(),
  decay_per_min: z.number().min(0),
  mood_drift: z.number().min(0),
});

export type AffectGains = z.infer<typeof affectGainsSchema>;

export const affectStateSchema = z.strictObject({
  schemaVersion: schemaVersionSchema,
  emotion: padSchema,
  mood: padSchema,
  baseline: padSchema,
  traits: bigFiveSchema,
  gains: affectGainsSchema,
  label: z.string().min(1).max(64),
  intensity: z.number().min(0).max(1),
  updatedAt: isoDateTimeSchema,
});

export type AffectState = z.infer<typeof affectStateSchema>;
