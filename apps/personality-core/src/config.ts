import { z } from "zod";

export const LOG_LEVELS = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "silent",
] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export const KV_CACHE_TYPES = ["f16", "q8_0", "q4_0"] as const;

export type KvCacheType = (typeof KV_CACHE_TYPES)[number];

const pathSchema = z.string().min(1, "não pode ser vazio");

export const configSchema = z.object({
  runtime: z.object({
    host: z.string().refine((value) => value === "127.0.0.1", {
      message: "P10 exige loopback: use 127.0.0.1",
    }),
    port: z.coerce.number().int().min(1).max(65535),
    llamaServerPath: pathSchema,
    modelPath: pathSchema,
    apiKeyFile: pathSchema,
    contextSize: z.coerce.number().int().min(512).max(131072),
    gpuLayers: z.coerce.number().int().min(0).max(999),
    parallel: z.coerce.number().int().min(1).max(8),
    kvCacheType: z.enum(KV_CACHE_TYPES),
  }),
  logging: z.object({
    level: z.enum(LOG_LEVELS),
  }),
  paths: z.object({
    dataDir: pathSchema,
    secretsDir: pathSchema,
    modelsDir: pathSchema,
  }),
});

export type Config = z.infer<typeof configSchema>;

export const defaultConfig: Config = {
  runtime: {
    host: "127.0.0.1",
    port: 8099,
    llamaServerPath: "runtime/llama-b12359/llama-server.exe",
    modelPath: "models/Qwen3.5-4B-Q4_K_M.gguf",
    apiKeyFile: "secrets/llama-api-key.local",
    contextSize: 4096,
    gpuLayers: 99,
    parallel: 1,
    kvCacheType: "q8_0",
  },
  logging: {
    level: "info",
  },
  paths: {
    dataDir: "data",
    secretsDir: "secrets",
    modelsDir: "models",
  },
};

type RawConfig = {
  runtime: {
    host: unknown;
    port: unknown;
    llamaServerPath: unknown;
    modelPath: unknown;
    apiKeyFile: unknown;
    contextSize: unknown;
    gpuLayers: unknown;
    parallel: unknown;
    kvCacheType: unknown;
  };
  logging: {
    level: unknown;
  };
  paths: {
    dataDir: unknown;
    secretsDir: unknown;
    modelsDir: unknown;
  };
};

const ENV_PREFIX = "KAIROS_PERSONALITY_";

export class ConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(issues.join("; "));
    this.name = "ConfigError";
    this.issues = issues;
  }
}

export function formatConfigError(error: ConfigError): string {
  return "configuração inválida: " + error.issues.join("; ");
}

function applyEnv(
  base: Config,
  env: Record<string, string | undefined>,
): RawConfig {
  const next: RawConfig = structuredClone(base);

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || !key.startsWith(ENV_PREFIX)) {
      continue;
    }

    switch (key) {
      case "KAIROS_PERSONALITY_RUNTIME_HOST":
        next.runtime.host = value;
        break;
      case "KAIROS_PERSONALITY_RUNTIME_PORT":
        next.runtime.port = value;
        break;
      case "KAIROS_PERSONALITY_RUNTIME_LLAMA_SERVER_PATH":
        next.runtime.llamaServerPath = value;
        break;
      case "KAIROS_PERSONALITY_RUNTIME_MODEL_PATH":
        next.runtime.modelPath = value;
        break;
      case "KAIROS_PERSONALITY_RUNTIME_API_KEY_FILE":
        next.runtime.apiKeyFile = value;
        break;
      case "KAIROS_PERSONALITY_RUNTIME_CONTEXT_SIZE":
        next.runtime.contextSize = value;
        break;
      case "KAIROS_PERSONALITY_RUNTIME_GPU_LAYERS":
        next.runtime.gpuLayers = value;
        break;
      case "KAIROS_PERSONALITY_RUNTIME_PARALLEL":
        next.runtime.parallel = value;
        break;
      case "KAIROS_PERSONALITY_RUNTIME_KV_CACHE_TYPE":
        next.runtime.kvCacheType = value;
        break;
      case "KAIROS_PERSONALITY_LOGGING_LEVEL":
        next.logging.level = value;
        break;
      case "KAIROS_PERSONALITY_DATA_DIR":
        next.paths.dataDir = value;
        break;
      case "KAIROS_PERSONALITY_SECRETS_DIR":
        next.paths.secretsDir = value;
        break;
      case "KAIROS_PERSONALITY_MODELS_DIR":
        next.paths.modelsDir = value;
        break;
      default:
        throw new ConfigError([
          key + ": variável de ambiente KAIROS_PERSONALITY_* desconhecida",
        ]);
    }
  }

  return next;
}

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): Config {
  const withEnv = applyEnv(defaultConfig, env);
  const parsed = configSchema.safeParse(withEnv);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(raiz)";
      return path + ": " + issue.message;
    });
    throw new ConfigError(issues);
  }

  return parsed.data;
}
