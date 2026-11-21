import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { delegationsFileSchema, type DelegationsFile } from "@kairos-personality/schema";
import { z, ZodError } from "zod";

export const BRAIN_FLOWS_DIR = "C:\\KairosBrain\\flows";
export const DELEGATIONS_FILE = "packages/schema/data/delegations.json";

const brainFlowSchema = z.looseObject({ name: z.string().min(1) });

export interface CheckOptions {
  delegationsPath?: string;
  brainFlowsDir?: string;
}

export interface CheckResult {
  fatal: boolean;
  warnings: string[];
  flowsChecked: number;
  entriesChecked: number;
}

export class DelegationsInvalidError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(issues.join("; "));
    this.name = "DelegationsInvalidError";
    this.issues = issues;
  }
}

async function readDelegations(path: string): Promise<DelegationsFile> {
  let text: string;

  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DelegationsInvalidError([path + ": arquivo ausente"]);
    }
    throw error;
  }

  const parsed = delegationsFileSchema.safeParse(JSON.parse(text) as unknown);

  if (!parsed.success) {
    throw new DelegationsInvalidError(
      parsed.error.issues.map((issue) => {
        const field = issue.path.join(".") || "(raiz)";
        return field + ": " + issue.message;
      }),
    );
  }

  return parsed.data;
}

async function readBrainFlowNames(dir: string): Promise<string[] | null> {
  let files: string[];

  try {
    files = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const names: string[] = [];

  for (const file of files) {
    if (!/\.(yaml|yml|json)$/.test(file)) {
      continue;
    }

    try {
      const text = await readFile(resolve(dir, file), "utf8");
      const parsed = brainFlowSchema.safeParse(JSON.parse(text) as unknown);
      if (parsed.success) {
        names.push(parsed.data.name);
      }
    } catch {
      // Arquivo de fluxo ilegível é aviso, nunca erro fatal (o Brain pode estar ausente).
    }
  }

  return names;
}

export async function checkDelegations(
  options: CheckOptions = {},
): Promise<CheckResult> {
  const delegationsPath = resolve(options.delegationsPath ?? DELEGATIONS_FILE);
  const brainFlowsDir = resolve(options.brainFlowsDir ?? BRAIN_FLOWS_DIR);
  const delegations = await readDelegations(delegationsPath);
  const warnings: string[] = [];
  const flowNames = await readBrainFlowNames(brainFlowsDir);

  if (flowNames === null) {
    warnings.push(
      "aviso: diretorio de fluxos do Brain ausente (" +
        brainFlowsDir +
        "); comparacao pulada",
    );
    return {
      fatal: false,
      warnings,
      flowsChecked: 0,
      entriesChecked: delegations.entries.length,
    };
  }

  const known = new Set(flowNames);

  for (const entry of delegations.entries) {
    if (!known.has(entry.flow)) {
      warnings.push('aviso: flow "' + entry.flow + '" sem YAML no Brain');
    }
  }

  const declared = new Set(delegations.entries.map((entry) => entry.flow));

  for (const name of flowNames) {
    if (!declared.has(name)) {
      warnings.push('aviso: fluxo "' + name + '" do Brain sem entrada em delegations.json');
    }
  }

  return {
    fatal: false,
    warnings,
    flowsChecked: flowNames.length,
    entriesChecked: delegations.entries.length,
  };
}

async function main(): Promise<number> {
  try {
    const result = await checkDelegations();

    for (const warning of result.warnings) {
      console.warn(warning);
    }

    console.log(
      "check:delegations — " +
        result.entriesChecked +
        " entradas, " +
        result.flowsChecked +
        " fluxos do Brain, " +
        result.warnings.length +
        " aviso(s)",
    );

    return result.fatal ? 1 : 0;
  } catch (error) {
    if (error instanceof DelegationsInvalidError) {
      console.error("delegations.json invalido: " + error.issues.join("; "));
      return 1;
    }

    if (error instanceof ZodError) {
      console.error("delegations.json invalido: " + error.issues.length + " erro(s) de schema");
      return 1;
    }

    if (error instanceof SyntaxError) {
      console.error("delegations.json invalido: JSON malformado");
      return 1;
    }

    throw error;
  }
}

if (import.meta.main) {
  process.exitCode = await main();
}
