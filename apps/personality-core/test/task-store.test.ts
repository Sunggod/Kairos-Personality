import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { TaskStore } from "../src/task-store";

const childPath = fileURLToPath(
  new URL("./fixtures/running-task-child.ts", import.meta.url),
);

function fixedTime(): string {
  return "2026-11-21T12:00:00Z";
}

async function rmWithRetry(path: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EBUSY") throw error;
      await Bun.sleep(50);
    }
  }
}

describe("gerenciador de tarefas SQLite", () => {
  it("persiste intenção antes da tarefa e recusa duplicata", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-tasks-"));
    const store = new TaskStore({ path: join(root, "tasks.sqlite"), now: fixedTime });

    try {
      const intentKey = "b".repeat(64);
      store.begin({
        trace: "trace_tasks_01",
        taskId: "tsk_1",
        flow: "two-step",
        intentKey,
        slots: '{"objective":"teste"}',
      });

      expect(store.hasIntention(intentKey)).toBe(true);
      expect(store.get("trace_tasks_01", "tsk_1")?.state).toBe("running");
      expect(store.getIntention(intentKey)?.slots).toBe('{"objective":"teste"}');
      expect(() =>
        store.begin({
          trace: "trace_tasks_02",
          taskId: "tsk_2",
          flow: "two-step",
          intentKey,
          slots: "{}",
        }),
      ).toThrow();

      store.setState("trace_tasks_01", "tsk_1", "executed", "succeeded");
      expect(store.get("trace_tasks_01", "tsk_1")?.outcome).toBe("succeeded");
    } finally {
      store.close();
      await rmWithRetry(root);
    }
  });

  it("admite duas tarefas no mesmo trace (uma por delegação em voo)", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-tasks-trace-"));
    const store = new TaskStore({ path: join(root, "tasks.sqlite"), now: fixedTime });

    try {
      store.begin({
        trace: "trace_compartilhado",
        taskId: "tsk_a",
        flow: "two-step",
        intentKey: "c".repeat(64),
        slots: "{}",
      });
      store.begin({
        trace: "trace_compartilhado",
        taskId: "tsk_b",
        flow: "two-step",
        intentKey: "d".repeat(64),
        slots: "{}",
      });

      expect(store.get("trace_compartilhado", "tsk_a")?.state).toBe("running");
      expect(store.get("trace_compartilhado", "tsk_b")?.state).toBe("running");
      expect(store.recoverNonTerminal()).toHaveLength(2);
    } finally {
      store.close();
      await rmWithRetry(root);
    }
  });

  it("registra aprovação entregue e libera intenção para retry autorizado", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-tasks-appr-"));
    const store = new TaskStore({ path: join(root, "tasks.sqlite"), now: fixedTime });

    try {
      const key = "e".repeat(64);
      store.begin({
        trace: "trace_appr",
        taskId: "tsk_appr",
        flow: "two-step",
        intentKey: key,
        slots: "{}",
      });
      expect(store.hasApproval("appr_1")).toBe(false);
      store.recordApproval("appr_1", "trace_appr");
      expect(store.hasApproval("appr_1")).toBe(true);

      store.releaseIntention(key);
      expect(store.hasIntention(key)).toBe(false);
    } finally {
      store.close();
      await rmWithRetry(root);
    }
  });

  it("processo morto com tarefa running volta unknown, sem reenvio", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-tasks-crash-"));
    const dbPath = join(root, "tasks.sqlite");
    const child = Bun.spawn(["bun", childPath, dbPath], {
      stdout: "pipe",
      stderr: "pipe",
    });

    try {
      const reader = child.stdout.getReader();
      const decoder = new TextDecoder();
      let output = "";
      while (!output.includes("ready")) {
        const chunk = await reader.read();
        if (chunk.done) break;
        output += decoder.decode(chunk.value, { stream: true });
      }
      expect(output).toContain("ready");

      child.kill(9);
      await child.exited;

      const store = new TaskStore({ path: dbPath, now: fixedTime });
      try {
        const recovered = store.recoverNonTerminal();

        expect(recovered).toHaveLength(1);
        expect(recovered[0]?.state).toBe("unknown");
        expect(store.get("trace_crash_01", "tsk_crash_01")?.state).toBe("unknown");
        expect(store.hasIntention("a".repeat(64))).toBe(true);
        expect(store.recoverNonTerminal()).toHaveLength(0);
      } finally {
        store.close();
      }
    } finally {
      await rmWithRetry(root);
    }
  });

  it("awaiting-approval também volta unknown após morte do processo", async () => {
    const root = await mkdtemp(join(tmpdir(), "kairos-tasks-appr-crash-"));
    const store = new TaskStore({ path: join(root, "tasks.sqlite"), now: fixedTime });

    try {
      store.begin({
        trace: "trace_apcrash",
        taskId: "tsk_apcrash",
        flow: "two-step",
        intentKey: "f".repeat(64),
        slots: "{}",
      });
      store.setState("trace_apcrash", "tsk_apcrash", "awaiting-approval");
      store.recordApproval("apcrash_1", "trace_apcrash");

      expect(store.recoverNonTerminal()).toHaveLength(1);
      expect(store.get("trace_apcrash", "tsk_apcrash")?.state).toBe("unknown");
    } finally {
      store.close();
      await rmWithRetry(root);
    }
  });
});
