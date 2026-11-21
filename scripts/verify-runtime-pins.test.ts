import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyRuntimePins } from "./verify-runtime-pins";

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function fixture(): Promise<{
  root: string;
  archive: string;
  binary: string;
  model: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "kairos-pins-"));
  const archive = "archive-content";
  const binary = "binary-content";
  const model = "model-content";

  await mkdir(join(root, "runtime", "archives"), { recursive: true });
  await mkdir(join(root, "runtime", "llama-b12359"), { recursive: true });
  await mkdir(join(root, "models"), { recursive: true });

  await writeFile(join(root, "runtime", "archives", "llama.zip"), archive);
  await writeFile(join(root, "runtime", "llama-b12359", "llama-server.exe"), binary);
  await writeFile(join(root, "models", "test.gguf"), model);

  const runtimeLock = {
    schemaVersion: 1,
    runtime: "llama.cpp",
    release: "v1.0.0",
    build: "b12359",
    commit: "a".repeat(40),
    platform: "test",
    archiveDir: "runtime/archives",
    installDir: "runtime/llama-b12359",
    archives: {
      main: { file: "llama.zip", sha256: sha256(archive), size: archive.length },
    },
    binaries: {
      "llama-server.exe": { sha256: sha256(binary), size: binary.length },
    },
  };

  const modelsLock = {
    schemaVersion: 1,
    models: {
      test: {
        file: "models/test.gguf",
        sha256: sha256(model),
        size: model.length,
        role: "test",
        source: "https://example.com/test.gguf",
        provisional: true,
      },
    },
  };

  await writeFile(join(root, "runtime.lock.json"), JSON.stringify(runtimeLock));
  await writeFile(join(root, "models.lock.json"), JSON.stringify(modelsLock));

  return { root, archive, binary, model };
}

describe("verify:runtime-pins", () => {
  it("passa quando os hashes batem", async () => {
    const { root } = await fixture();

    try {
      const result = await verifyRuntimePins(root);
      expect(result.ok).toBe(true);
      expect(result.checks).toHaveLength(3);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("falha quando o hash diverge", async () => {
    const { root, binary } = await fixture();

    try {
      const corrupted = "x".repeat(binary.length);
      await writeFile(join(root, "runtime", "llama-b12359", "llama-server.exe"), corrupted);
      const result = await verifyRuntimePins(root);
      const failed = result.checks.find((check) => !check.ok);

      expect(result.ok).toBe(false);
      expect(failed?.reason).toBe("hash");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("falha quando o arquivo falta", async () => {
    const { root } = await fixture();

    try {
      await rm(join(root, "models", "test.gguf"));
      const result = await verifyRuntimePins(root);
      const failed = result.checks.find((check) => !check.ok);

      expect(result.ok).toBe(false);
      expect(failed?.reason).toBe("missing");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("falha quando o tamanho diverge", async () => {
    const { root } = await fixture();

    try {
      await writeFile(join(root, "runtime", "archives", "llama.zip"), "curto");
      const result = await verifyRuntimePins(root);
      const failed = result.checks.find((check) => !check.ok);

      expect(result.ok).toBe(false);
      expect(failed?.reason).toBe("size");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
