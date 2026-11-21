import { TaskStore } from "../../src/task-store";

const dbPath = process.argv[2];

if (dbPath === undefined || dbPath.length === 0) {
  throw new Error("caminho do banco obrigatório");
}

const store = new TaskStore({
  path: dbPath,
  now: () => "2026-11-21T12:00:00Z",
});

store.begin({
  trace: "trace_crash_01",
  taskId: "tsk_crash_01",
  flow: "two-step",
  intentKey: "a".repeat(64),
  slots: "{}",
});

console.log("ready");
setInterval(() => {}, 1000);
