import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  modelsLockSchema,
  runtimeLockSchema,
  type ModelsLock,
  type RuntimeLock,
} from "@kairos-personality/schema";
import { ZodError } from "zod";

export interface FilePin {
  sha256: string;
  size: number;
}

export interface PinCheck {
  label: string;
  path: string;
  expectedSha256: string;
  actualSha256: string | null;
  expectedSize: number;
  actualSize: number | null;
  ok: boolean;
  reason?: "missing" | "size" | "hash";
}

export interface VerifyResult {
  ok: boolean;
  checks: PinCheck[];
}

export async function hashFile(
  path: string,
): Promise<{ sha256: string; size: number } | null> {
  try {
    const info = await stat(path);

    if (!info.isFile()) {
      return null;
    }

    const hash = createHash("sha256");
    let size = 0;

    for await (const chunk of createReadStream(path)) {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      size += buffer.length;
      hash.update(buffer);
    }

    return { sha256: hash.digest("hex"), size };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function checkFile(
  path: string,
  pin: FilePin,
  label: string,
): Promise<PinCheck> {
  const actual = await hashFile(path);

  if (!actual) {
    return {
      label,
      path,
      expectedSha256: pin.sha256,
      actualSha256: null,
      expectedSize: pin.size,
      actualSize: null,
      ok: false,
      reason: "missing",
    };
  }

  if (actual.size !== pin.size) {
    return {
      label,
      path,
      expectedSha256: pin.sha256,
      actualSha256: actual.sha256,
      expectedSize: pin.size,
      actualSize: actual.size,
      ok: false,
      reason: "size",
    };
  }

  if (actual.sha256.toLowerCase() !== pin.sha256.toLowerCase()) {
    return {
      label,
      path,
      expectedSha256: pin.sha256,
      actualSha256: actual.sha256,
      expectedSize: pin.size,
      actualSize: actual.size,
      ok: false,
      reason: "hash",
    };
  }

  return {
    label,
    path,
    expectedSha256: pin.sha256,
    actualSha256: actual.sha256,
    expectedSize: pin.size,
    actualSize: actual.size,
    ok: true,
  };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function readRuntimeLock(rootDir: string): Promise<RuntimeLock> {
  return runtimeLockSchema.parse(await readJson(resolve(rootDir, "runtime.lock.json")));
}

async function readModelsLock(rootDir: string): Promise<ModelsLock> {
  return modelsLockSchema.parse(await readJson(resolve(rootDir, "models.lock.json")));
}

export async function verifyRuntimePins(rootDir: string): Promise<VerifyResult> {
  const runtimeLock = await readRuntimeLock(rootDir);
  const modelsLock = await readModelsLock(rootDir);
  const checks: PinCheck[] = [];

  for (const [name, pin] of Object.entries(runtimeLock.archives)) {
    checks.push(
      await checkFile(
        resolve(rootDir, runtimeLock.archiveDir, pin.file),
        pin,
        "archive:" + name,
      ),
    );
  }

  for (const [name, pin] of Object.entries(runtimeLock.binaries)) {
    checks.push(
      await checkFile(
        resolve(rootDir, runtimeLock.installDir, name),
        pin,
        "binário:" + name,
      ),
    );
  }

  for (const [name, pin] of Object.entries(modelsLock.models)) {
    checks.push(
      await checkFile(resolve(rootDir, pin.file), pin, "modelo:" + name),
    );
  }

  return { ok: checks.every((check) => check.ok), checks };
}

function formatIssues(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(raiz)";
      return path + ": " + issue.message;
    })
    .join("; ");
}

async function main(): Promise<number> {
  try {
    const result = await verifyRuntimePins(process.cwd());

    for (const check of result.checks) {
      console.log((check.ok ? "ok   " : "FALHA") + " " + check.label + " (" + check.path + ")");

      if (!check.ok) {
        if (check.reason === "missing") {
          console.log("      arquivo ausente");
        } else if (check.reason === "size") {
          console.log(
            "      tamanho esperado " +
              check.expectedSize +
              ", obtido " +
              String(check.actualSize),
          );
        } else {
          console.log(
            "      sha256 esperado " +
              check.expectedSha256 +
              ", obtido " +
              String(check.actualSha256),
          );
        }
      }
    }

    console.log(result.ok ? "pins OK" : "pins divergentes");
    return result.ok ? 0 : 1;
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("manifesto inválido: " + formatIssues(error));
      return 1;
    }

    if (error instanceof SyntaxError) {
      console.error("manifesto inválido: JSON malformado");
      return 1;
    }

    throw error;
  }
}

if (import.meta.main) {
  process.exitCode = await main();
}
