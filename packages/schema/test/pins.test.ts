import { describe, expect, it } from "bun:test";
import { modelsLockSchema, runtimeLockSchema } from "../src/pins";

const sha = "a".repeat(64);
const commit = "b".repeat(40);

const runtimeLock = {
  schemaVersion: 1,
  runtime: "llama.cpp",
  release: "v1.0.0",
  build: "b12359",
  commit,
  platform: "windows-x64-cuda-12.4",
  archiveDir: "runtime/archives",
  installDir: "runtime/llama-b12359",
  archives: {
    main: { file: "llama.zip", sha256: sha, size: 10 },
  },
  binaries: {
    "llama-server.exe": { sha256: sha, size: 5 },
  },
};

const modelsLock = {
  schemaVersion: 1,
  models: {
    test: {
      file: "models/test.gguf",
      sha256: sha,
      size: 20,
      role: "test",
      source: "https://example.com/test.gguf",
      provisional: true,
    },
  },
};

describe("pins", () => {
  it("aceita um runtime.lock válido", () => {
    expect(runtimeLockSchema.safeParse(runtimeLock).success).toBe(true);
  });

  it("recusa hash que não é SHA-256", () => {
    const invalid = {
      ...runtimeLock,
      binaries: { "llama-server.exe": { sha256: "abc", size: 5 } },
    };

    expect(runtimeLockSchema.safeParse(invalid).success).toBe(false);
  });

  it("recusa build fora do formato b<numero>", () => {
    expect(
      runtimeLockSchema.safeParse({ ...runtimeLock, build: "12359" }).success,
    ).toBe(false);
  });

  it("aceita um models.lock válido", () => {
    expect(modelsLockSchema.safeParse(modelsLock).success).toBe(true);
  });

  it("exige a marca de provisório no modelo", () => {
    const invalid = {
      ...modelsLock,
      models: {
        test: {
          ...modelsLock.models.test,
          provisional: undefined,
        },
      },
    };

    expect(modelsLockSchema.safeParse(invalid).success).toBe(false);
  });
});
