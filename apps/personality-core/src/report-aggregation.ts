import { brainReportSchema, type BrainReport, type PlanRunResult } from "@kairos-personality/schema";

export type AggregatedOutcome = "succeeded" | "partial" | "failed" | "aborted";

const RANK: Readonly<Record<AggregatedOutcome, number>> = {
  succeeded: 1,
  aborted: 2,
  partial: 3,
  failed: 4,
};

/** D2/B10: o pior outcome entre todos os results[].report, não só o report final. */
export function worstOutcome(
  reports: readonly BrainReport[],
  extra: readonly AggregatedOutcome[] = [],
): AggregatedOutcome {
  const first = reports[0];
  let worst: AggregatedOutcome =
    first === undefined ? "succeeded" : brainReportSchema.parse(first).outcome;

  for (const candidate of reports) {
    const parsed = brainReportSchema.parse(candidate);
    if (RANK[parsed.outcome] > RANK[worst]) {
      worst = parsed.outcome;
    }
  }

  for (const outcome of extra) {
    if (RANK[outcome] > RANK[worst]) {
      worst = outcome;
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

  const failedSteps = result.results.filter((step) => !step.ok).length;

  return {
    outcome: worstOutcome(all, failedSteps > 0 ? ["failed"] : []),
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
    : outcome === "aborted"
      ? "A ação foi interrompida; quer que eu retome ou mude o caminho?"
      : outcome === "partial"
      ? "Fiz parte do que era pedido; o que ficou de fora está nas ressalvas."
      : "Pronto.";
}
