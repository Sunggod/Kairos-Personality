import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const mainPath = fileURLToPath(new URL("../src/main.ts", import.meta.url));

function cleanEnv(overrides: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !key.startsWith("KAIROS_PERSONALITY_")) {
      env[key] = value;
    }
  }

  return { ...env, ...overrides };
}

describe("boot", () => {
  it("aborta com config inválida citando o campo e sem stack trace", () => {
    const result = spawnSync(process.execPath, [mainPath], {
      encoding: "utf8",
      env: cleanEnv({ KAIROS_PERSONALITY_RUNTIME_PORT: "abc" }),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("runtime.port");
    expect(result.stderr).not.toMatch(/^\s+at /m);
  });

  it("sobe com config válida e loga o boot", () => {
    const result = spawnSync(process.execPath, [mainPath], {
      encoding: "utf8",
      env: cleanEnv({ KAIROS_PERSONALITY_LOGGING_LEVEL: "info" }),
    });

    expect(result.status).toBe(0);

    const line = result.stdout.trim().split("\n")[0];

    if (line === undefined || line.length === 0) {
      throw new Error("boot não escreveu log");
    }

    const entry = JSON.parse(line) as Record<string, unknown>;
    expect(entry.event).toBe("boot");
    expect(entry.service).toBe("personality-core");
  });
});
