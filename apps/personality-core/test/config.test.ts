import { describe, expect, it } from "bun:test";
import {
  ConfigError,
  configSchema,
  defaultConfig,
  formatConfigError,
  loadConfig,
} from "../src/config";

function captureConfigError(fn: () => unknown): ConfigError {
  try {
    fn();
  } catch (error) {
    if (error instanceof ConfigError) {
      return error;
    }

    throw error;
  }

  throw new Error("esperava ConfigError");
}

describe("config", () => {
  it("aceita os padrões", () => {
    const config = loadConfig({});

    expect(config.runtime.host).toBe("127.0.0.1");
    expect(config.runtime.port).toBe(8099);
    expect(config.runtime.kvCacheType).toBe("q8_0");
    expect(config.logging.level).toBe("info");
  });

  it("o defaultConfig passa pelo schema", () => {
    expect(configSchema.safeParse(defaultConfig).success).toBe(true);
  });

  it("aplica override por KAIROS_PERSONALITY_*", () => {
    const config = loadConfig({
      KAIROS_PERSONALITY_RUNTIME_PORT: "9090",
      KAIROS_PERSONALITY_RUNTIME_CONTEXT_SIZE: "8192",
      KAIROS_PERSONALITY_RUNTIME_KV_CACHE_TYPE: "f16",
      KAIROS_PERSONALITY_LOGGING_LEVEL: "debug",
      KAIROS_PERSONALITY_DATA_DIR: "dados-teste",
    });

    expect(config.runtime.port).toBe(9090);
    expect(config.runtime.contextSize).toBe(8192);
    expect(config.runtime.kvCacheType).toBe("f16");
    expect(config.logging.level).toBe("debug");
    expect(config.paths.dataDir).toBe("dados-teste");
  });

  it("recusa host fora do loopback citando o campo", () => {
    const error = captureConfigError(() =>
      loadConfig({ KAIROS_PERSONALITY_RUNTIME_HOST: "0.0.0.0" }),
    );

    expect(error.issues.join("; ")).toContain("runtime.host");
    expect(error.issues.join("; ")).toContain("127.0.0.1");
  });

  it("recusa porta inválida citando o campo", () => {
    const error = captureConfigError(() =>
      loadConfig({ KAIROS_PERSONALITY_RUNTIME_PORT: "abc" }),
    );

    expect(error.issues.join("; ")).toContain("runtime.port");
  });

  it("recusa variável KAIROS_PERSONALITY_* desconhecida", () => {
    const error = captureConfigError(() =>
      loadConfig({ KAIROS_PERSONALITY_RUNTIME_PORTS: "9090" }),
    );

    expect(error.issues.join("; ")).toContain("KAIROS_PERSONALITY_RUNTIME_PORTS");
  });

  it("recusa nível de log inválido", () => {
    const error = captureConfigError(() =>
      loadConfig({ KAIROS_PERSONALITY_LOGGING_LEVEL: "barulhento" }),
    );

    expect(error.issues.join("; ")).toContain("logging.level");
  });

  it("formata o erro sem stack trace", () => {
    const error = new ConfigError(["runtime.port: inválido"]);
    const formatted = formatConfigError(error);

    expect(formatted).toContain("runtime.port");
    expect(formatted).not.toContain("    at ");
  });
});
