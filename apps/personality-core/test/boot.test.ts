import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { TaskStore } from "../src/task-store";

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

    const entries = result.stdout
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const boot = entries.find((entry) => entry["event"] === "boot");

    if (boot === undefined) {
      throw new Error("boot não escreveu log");
    }

    expect(boot["service"]).toBe("personality-core");
  });

  it("no boot, tarefa running de processo morto vira unknown", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-boot-recovery-"));
    const dbPath = join(root, "tasks.sqlite");
    const store = new TaskStore({ path: dbPath });
    store.begin({
      trace: "trace_boot_recovery",
      taskId: "tsk_boot_recovery",
      flow: "two-step",
      intentKey: "1".repeat(64),
      slots: "{}",
    });
    store.close();

    try {
      const result = spawnSync(process.execPath, [mainPath], {
        encoding: "utf8",
        env: cleanEnv({ KAIROS_PERSONALITY_TASKS_DB: dbPath }),
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('"event":"tasks.recovered","count":1');

      const reopened = new TaskStore({ path: dbPath });
      try {
        expect(reopened.get("trace_boot_recovery", "tsk_boot_recovery")?.state).toBe("unknown");
      } finally {
        reopened.close();
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
