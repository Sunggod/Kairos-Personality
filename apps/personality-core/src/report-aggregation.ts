import { brainReportSchema, type BrainReport, type PlanRunResult } from "@kairos-personality/schema";

export type AggregatedOutcome = "succeeded" | "partial" | "failed" | "aborted";

const RANK: Readonly<Record<AggregatedOutcome, number>> = {
  aborted: 0,
  succeeded: 1,
  partial: 2,
  failed: 3,
};

/** D2/B10: o pior outcome entre todos os results[].report, não só o report final. */
export function worstOutcome(reports: readonly BrainReport[]): AggregatedOutcome {
  let worst: AggregatedOutcome = "succeeded";

  for (const candidate of reports) {
    const parsed = brainReportSchema.parse(candidate);
    if (RANK[parsed.outcome] > RANK[worst]) {
      worst = parsed.outcome;
    }
  }

  return worst;
}

export interface AggregatedResult {
  readonly outcome: AggregatedOutcome;
  readonly report: BrainReport;
  readonly steps: number;
  readonly reportsRead: number;
}

export function aggregate(result: PlanRunResult): AggregatedResult {
  const stepReports = result.results.flatMap((step) =>
    step.report === undefined ? [] : [brainReportSchema.parse(step.report)],
  );
  const finalReport =
    result.report === undefined ? undefined : brainReportSchema.parse(result.report);
  const all = [...stepReports, ...(finalReport === undefined ? [] : [finalReport])];

  if (all.length === 0) {
    throw new Error("plano executado sem nenhum Report para agregar");
  }

  // O Report final é conservado verbatim (P1): apenas o rótulo agregado muda.
  const report = finalReport ?? stepReports[stepReports.length - 1];

  if (report === undefined) {
    throw new Error("plano executado sem nenhum Report para agregar");
  }

  return {
    outcome: worstOutcome(all),
    report,
    steps: result.results.length,
    reportsRead: all.length,
  };
}

export const UNKNOWN_SPEECH =
  "Não consegui terminar, e algo pode ter ficado feito pela metade; quer que eu confira?";

export const CANCEL_UNAVAILABLE_SPEECH = "não consegui cancelar";

export const CANCEL_SENT_SPEECH =
  "Enviei o cancelamento e o nó foi interrompido, mas o Brain pode ter reportado sucesso; quer que eu confira?";

export function conservativeSpeech(outcome: AggregatedOutcome | "unknown"): string {
  if (outcome === "unknown") return UNKNOWN_SPEECH;
  return outcome === "failed"
    ? "Não consegui terminar. Quer que eu tente de outro jeito?"
    : outcome === "partial"
      ? "Fiz parte do que era pedido; o que ficou de fora está nas ressalvas."
      : "Pronto.";
}
