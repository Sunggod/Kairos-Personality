import pino, { type Logger, type LoggerOptions } from "pino";
import type { LogLevel } from "./config";

export interface LogSink {
  write(line: string): void;
}

export const SENSITIVE_LOG_PATHS = [
  "transcript",
  "audio",
  "image",
  "screenText",
  "memory",
  "prompt",
  "completion",
  "*.transcript",
  "*.audio",
  "*.image",
  "*.screenText",
  "*.memory",
  "*.prompt",
  "*.completion",
] as const;

export class MissingTraceError extends Error {
  constructor() {
    super("todo log de turno precisa de trace (P9)");
    this.name = "MissingTraceError";
  }
}

export function createLogger(options: {
  level: LogLevel;
  sink?: LogSink;
}): Logger {
  const pinoOptions: LoggerOptions = {
    level: options.level,
    base: { service: "personality-core" },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [...SENSITIVE_LOG_PATHS],
      censor: "[redacted]",
    },
  };

  if (options.sink) {
    return pino(pinoOptions, options.sink);
  }

  return pino(pinoOptions, pino.destination({ dest: 1, sync: true }));
}

export function createTurnLogger(logger: Logger, trace: string): Logger {
  const normalized = trace.trim();

  if (normalized.length === 0) {
    throw new MissingTraceError();
  }

  return logger.child({ trace: normalized });
}
