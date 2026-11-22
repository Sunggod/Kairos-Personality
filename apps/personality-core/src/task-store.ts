import { Database } from "bun:sqlite";
import {
  intentionRecordSchema,
  taskRecordSchema,
  type IntentionRecord,
  type StoredTaskState,
  type TaskRecord,
} from "@kairos-personality/schema";

export interface TaskStoreOptions {
  readonly path: string;
  readonly now?: () => string;
}

interface TaskRow {
  trace: string;
  task_id: string;
  flow: string;
  state: string;
  intent_key: string;
  created_at: string;
  updated_at: string;
  outcome: string | null;
}

export class TaskStore {
  readonly #db: Database;
  readonly #now: () => string;
  readonly #schemaVersion: number;

  constructor(options: TaskStoreOptions) {
    this.#db = new Database(options.path);
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS intentions (
        intent_key TEXT PRIMARY KEY,
        trace TEXT NOT NULL,
        flow TEXT NOT NULL,
        slots TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        trace TEXT NOT NULL,
        task_id TEXT NOT NULL,
        flow TEXT NOT NULL,
        state TEXT NOT NULL,
        intent_key TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        outcome TEXT,
        PRIMARY KEY (trace, task_id)
      );
      CREATE TABLE IF NOT EXISTS approvals (
        approval_id TEXT PRIMARY KEY,
        trace TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      INSERT OR IGNORE INTO meta (key, value) VALUES ('schemaVersion', '1');
    `);

    const meta = this.#db
      .query("SELECT value FROM meta WHERE key = 'schemaVersion'")
      .get() as { value: string } | null;

    if (meta === null || meta.value !== "1") {
      throw new Error("schemaVersion de tarefas incompatível");
    }
    this.#schemaVersion = 1;
  }

  hasIntention(intentKey: string): boolean {
    const row = this.#db
      .query("SELECT intent_key FROM intentions WHERE intent_key = ?")
      .get(intentKey);
    return row !== null;
  }

  /** P11: libera a intenção apenas para um retry autorizado pela UI. */
  releaseIntention(intentKey: string): void {
    this.#db.query("DELETE FROM intentions WHERE intent_key = ?").run(intentKey);
  }

  hasApproval(approvalId: string): boolean {
    const row = this.#db
      .query("SELECT approval_id FROM approvals WHERE approval_id = ?")
      .get(approvalId);
    return row !== null;
  }

  /** Registra que o pedido de aprovação foi entregue ao canal da UI. */
  recordApproval(approvalId: string, trace: string): void {
    this.#db
      .query(
        "INSERT OR IGNORE INTO approvals (approval_id, trace, created_at) VALUES (?, ?, ?)",
      )
      .run(approvalId, trace, this.#now());
  }

  /** Persiste a intenção ANTES de qualquer plan.run (P11). */
  begin(input: {
    readonly trace: string;
    readonly taskId: string;
    readonly flow: string;
    readonly intentKey: string;
    readonly slots: string;
  }): TaskRecord {
    if (this.hasIntention(input.intentKey)) {
      throw new Error("intenção já registrada");
    }

    const at = this.#now();
    const intention = intentionRecordSchema.parse({
      schemaVersion: this.#schemaVersion,
      intentKey: input.intentKey,
      trace: input.trace,
      flow: input.flow,
      slots: input.slots,
      createdAt: at,
    });
    const record = taskRecordSchema.parse({
      schemaVersion: this.#schemaVersion,
      trace: input.trace,
      taskId: input.taskId,
      flow: input.flow,
      state: "running",
      intentKey: input.intentKey,
      createdAt: at,
      updatedAt: at,
    });

    const tx = this.#db.transaction(() => {
      this.#db
        .query(
          "INSERT INTO intentions (intent_key, trace, flow, slots, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          intention.intentKey,
          intention.trace,
          intention.flow,
          intention.slots,
          intention.createdAt,
        );
      this.#db
        .query(
          "INSERT INTO tasks (trace, task_id, flow, state, intent_key, created_at, updated_at, outcome) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)",
        )
        .run(
          record.trace,
          record.taskId,
          record.flow,
          record.state,
          record.intentKey,
          record.createdAt,
          record.updatedAt,
        );
    });
    tx();

    return record;
  }

  get(trace: string, taskId: string): TaskRecord | null {
    const row = this.#db
      .query("SELECT * FROM tasks WHERE trace = ? AND task_id = ?")
      .get(trace, taskId) as TaskRow | null;
    return row === null ? null : this.#toRecord(row);
  }

  getIntention(intentKey: string): IntentionRecord | null {
    const row = this.#db
      .query("SELECT * FROM intentions WHERE intent_key = ?")
      .get(intentKey) as {
      intent_key: string;
      trace: string;
      flow: string;
      slots: string;
      created_at: string;
    } | null;
    if (row === null) return null;
    return intentionRecordSchema.parse({
      schemaVersion: this.#schemaVersion,
      intentKey: row.intent_key,
      trace: row.trace,
      flow: row.flow,
      slots: row.slots,
      createdAt: row.created_at,
    });
  }

  setState(
    trace: string,
    taskId: string,
    state: StoredTaskState,
    outcome?: string,
  ): void {
    const at = this.#now();
    this.#db
      .query(
        "UPDATE tasks SET state = ?, outcome = ?, updated_at = ? WHERE trace = ? AND task_id = ?",
      )
      .run(state, outcome ?? null, at, trace, taskId);
  }

  /**
   * Chamado no boot: toda tarefa em estado não terminal (`running` ou
   * `awaiting-approval`) passa a `unknown`. Não há reenvio.
   */
  recoverNonTerminal(): TaskRecord[] {
    const rows = this.#db
      .query("SELECT * FROM tasks WHERE state IN ('running', 'awaiting-approval')")
      .all() as TaskRow[];
    const recovered: TaskRecord[] = [];
    const at = this.#now();

    const tx = this.#db.transaction(() => {
      for (const row of rows) {
        this.#db
          .query(
            "UPDATE tasks SET state = 'unknown', updated_at = ? WHERE trace = ? AND task_id = ?",
          )
          .run(at, row.trace, row.task_id);
        recovered.push(
          taskRecordSchema.parse({
            schemaVersion: this.#schemaVersion,
            trace: row.trace,
            taskId: row.task_id,
            flow: row.flow,
            state: "unknown",
            intentKey: row.intent_key,
            createdAt: row.created_at,
            updatedAt: at,
            outcome: row.outcome ?? undefined,
          }),
        );
      }
    });
    tx();

    return recovered;
  }

  close(): void {
    this.#db.close();
  }

  #toRecord(row: TaskRow): TaskRecord {
    return taskRecordSchema.parse({
      schemaVersion: this.#schemaVersion,
      trace: row.trace,
      taskId: row.task_id,
      flow: row.flow,
      state: row.state,
      intentKey: row.intent_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      outcome: row.outcome ?? undefined,
    });
  }
}
