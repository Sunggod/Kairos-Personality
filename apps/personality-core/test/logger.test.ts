import { describe, expect, it } from "bun:test";
import {
  MissingTraceError,
  createLogger,
  createTurnLogger,
  type LogSink,
} from "../src/logger";

function memorySink(): { sink: LogSink; lines: string[] } {
  const lines: string[] = [];

  return {
    lines,
    sink: {
      write(line: string) {
        lines.push(line);
      },
    },
  };
}

function firstLine(lines: string[]): Record<string, unknown> {
  const line = lines[0];

  if (line === undefined) {
    throw new Error("nenhuma linha de log foi escrita");
  }

  return JSON.parse(line) as Record<string, unknown>;
}

describe("logger", () => {
  it("toda linha de turno carrega trace", () => {
    const { sink, lines } = memorySink();
    const logger = createLogger({ level: "info", sink });
    const turn = createTurnLogger(logger, "trace-abc");

    turn.info({ event: "turn.start" }, "início do turno");

    const entry = firstLine(lines);
    expect(entry.trace).toBe("trace-abc");
    expect(entry.event).toBe("turn.start");
  });

  it("recusa trace vazio", () => {
    const { sink } = memorySink();
    const logger = createLogger({ level: "info", sink });

    expect(() => createTurnLogger(logger, "   ")).toThrow(MissingTraceError);
  });

  it("redige conteúdo sensível mesmo dentro do turno", () => {
    const { sink, lines } = memorySink();
    const logger = createLogger({ level: "info", sink });
    const turn = createTurnLogger(logger, "trace-xyz");

    turn.info({
      event: "turn.data",
      transcript: "segredo-do-usuario",
      payload: { transcript: "outro-segredo" },
    });

    const raw = lines.join("\n");
    expect(raw).not.toContain("segredo-do-usuario");
    expect(raw).not.toContain("outro-segredo");
    expect(raw).toContain("[redacted]");
    expect(firstLine(lines).trace).toBe("trace-xyz");
  });
});
