import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkDelegations,
  DelegationsInvalidError,
} from "./check-delegations";

const validDelegations = {
  schemaVersion: 1,
  entries: [
    {
      schemaVersion: 1,
      flow: "two-step",
      description: "Fluxo sintetico de duas etapas.",
      risk: "none",
      tier: "open",
      lang: "pt-BR",
      slots: { type: "object", properties: {} },
    },
  ],
};

async function fixture(invalid = false): Promise<{
  root: string;
  delegationsPath: string;
  brainDir: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "kairos-delegations-"));
  const brainDir = join(root, "flows");
  const delegationsPath = join(root, "delegations.json");

  await mkdir(brainDir, { recursive: true });
  await writeFile(
    delegationsPath,
    JSON.stringify(
      invalid
        ? {
            ...validDelegations,
            entries: [
              {
                schemaVersion: 1,
                flow: "two-step",
                description: "Sem tier.",
                risk: "none",
                lang: "pt-BR",
                slots: { type: "object", properties: {} },
              },
            ],
          }
        : validDelegations,
    ),
  );
  await writeFile(
    join(brainDir, "two-step.yaml"),
    JSON.stringify({ name: "two-step", version: "1.0.0", steps: [] }),
  );

  return { root, delegationsPath, brainDir };
}

describe("check:delegations", () => {
  it("passa sem aviso quando o YAML existe", async () => {
    const { root, delegationsPath, brainDir } = await fixture();

    try {
      const result = await checkDelegations({ delegationsPath, brainFlowsDir: brainDir });
      expect(result.fatal).toBe(false);
      expect(result.warnings).toHaveLength(0);
      expect(result.flowsChecked).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("flow sem YAML e aviso, nao erro fatal", async () => {
    const { root, delegationsPath, brainDir } = await fixture();

    try {
      await rm(join(brainDir, "two-step.yaml"));
      const result = await checkDelegations({ delegationsPath, brainFlowsDir: brainDir });

      expect(result.fatal).toBe(false);
      expect(result.warnings.join(" ")).toContain("two-step");
      expect(result.warnings.join(" ")).toContain("sem YAML");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("Brain ausente e aviso, nao erro fatal", async () => {
    const { root, delegationsPath, brainDir } = await fixture();

    try {
      await rm(brainDir, { recursive: true, force: true });
      const result = await checkDelegations({ delegationsPath, brainFlowsDir: brainDir });

      expect(result.fatal).toBe(false);
      expect(result.warnings.join(" ")).toContain("ausente");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("entrada sem tier reprova o load", async () => {
    const { root, delegationsPath, brainDir } = await fixture(true);

    try {
      await expect(
        checkDelegations({ delegationsPath, brainFlowsDir: brainDir }),
      ).rejects.toBeInstanceOf(DelegationsInvalidError);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("so le o diretorio do Brain: nenhum arquivo e alterado", async () => {
    const { root, delegationsPath, brainDir } = await fixture();

    try {
      const before = new Map<string, string>();
      for (const name of await readdir(brainDir)) {
        before.set(name, await readFile(join(brainDir, name), "utf8"));
      }

      await checkDelegations({ delegationsPath, brainFlowsDir: brainDir });

      const after = new Map<string, string>();
      for (const name of await readdir(brainDir)) {
        after.set(name, await readFile(join(brainDir, name), "utf8"));
      }

      expect(after).toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
