import { createServer } from "node:net";
import { pathToFileURL } from "node:url";
import {
  createBrainClient,
  type BrainClient,
} from "@kairos-personality/core";

export const BRAIN_DIR = "C:\\KairosBrain";
export const BRAIN_PORT = Number(
  process.env.KAIROS_PERSONALITY_E2E_BRAIN_PORT ?? "4317",
);

const FIXTURE_PATH =
  "C:\\KairosBrain\\packages\\conformance\\fixtures\\node-fake\\index.ts";

interface FakeNodeHandle {
  readonly url: string;
  readonly port: number;
  close(): Promise<void>;
  cancelledTraces(): readonly string[];
  requests(): readonly Record<string, unknown>[];
}

interface FakeNodeModule {
  readonly fakeManifest: {
    readonly node: string;
    readonly caps: ReadonlyArray<{ readonly name: string; readonly mode: string }>;
  };
  startFakeNode(options: Record<string, unknown>): Promise<FakeNodeHandle>;
}

export interface E2EFixtureOptions {
  readonly trace: string;
  readonly mode?: "sync" | "stream";
  readonly emitEvents?: number;
  readonly eventDelayMs?: number;
  readonly invokeDelayMs?: number;
  readonly invalidReportField?: "outcome" | "headline";
}

export interface E2EFixture {
  readonly brainUrl: string;
  readonly nodeUrl: string;
  readonly trace: string;
  readonly client: BrainClient;
  readonly node: FakeNodeHandle;
  readonly brainLog: () => string;
  close(): Promise<void>;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close(() => reject(new Error("porta livre não encontrada")));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function drain(stream: ReadableStream<Uint8Array>, into: { text: string }): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      into.text = (into.text + decoder.decode(chunk.value, { stream: true })).slice(-8000);
    }
  } catch {
    // stream fechado na finalização
  }
}

async function waitHealth(url: string, timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "sem resposta";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = "HTTP " + response.status;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await Bun.sleep(100);
  }

  throw new Error("Brain não subiu em " + url + ": " + lastError);
}

/**
 * Sobe o nó falso do repositório do Brain (somente leitura) e o Brain real
 * com `bun run start` como processo filho. Nada é escrito em C:\KairosBrain:
 * o SQLite do Brain é :memory:.
 */
export async function startE2EFixture(options: E2EFixtureOptions): Promise<E2EFixture> {
  const mod = (await import(
    /* @vite-ignore */ pathToFileURL(FIXTURE_PATH).href
  )) as unknown as FakeNodeModule;

  const nodePort = await freePort();
  const mode = options.mode ?? "sync";
  const manifest = {
    ...mod.fakeManifest,
    caps: mod.fakeManifest.caps.map((cap) => ({ ...cap, mode })),
  };

  const node = await mod.startFakeNode({
    port: nodePort,
    manifest,
    ...(options.emitEvents !== undefined ? { emitEvents: options.emitEvents } : {}),
    ...(options.eventDelayMs !== undefined ? { eventDelayMs: options.eventDelayMs } : {}),
    ...(options.invokeDelayMs !== undefined ? { invokeDelayMs: options.invokeDelayMs } : {}),
    ...(options.invalidReportField !== undefined
      ? { invalidReportField: options.invalidReportField }
      : {}),
  });

  const log = { text: "" };
  const brain = Bun.spawn(["bun", "run", "start"], {
    cwd: BRAIN_DIR,
    env: {
      ...process.env,
      KAIROS_PORT: String(BRAIN_PORT),
      KAIROS_DB_PATH: ":memory:",
      KAIROS_NODE: "kairos-brain",
      KAIROS_ACCEPT_LANG: "en",
      KAIROS_LOG_LEVEL: "silent",
      KAIROS_NODES: JSON.stringify([
        {
          node: manifest.node,
          address: node.url,
          autostart: false,
          healthInterval: 500,
          describeTtl: 60_000,
        },
      ]),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  void drain(brain.stdout, log);
  void drain(brain.stderr, log);

  const brainUrl = "http://127.0.0.1:" + BRAIN_PORT;

  try {
    await waitHealth(brainUrl + "/healthz");
    // O catálogo é reconstruído via handshake describe; espera um tick.
    await Bun.sleep(500);
  } catch (error) {
    await stopBrain(brain);
    await node.close();
    throw error;
  }

  return {
    brainUrl,
    nodeUrl: node.url,
    trace: options.trace,
    node,
    brainLog: () => log.text,
    client: createBrainClient({ baseUrl: brainUrl }),
    async close() {
      await stopBrain(brain);
      await node.close();
    },
  };
}

async function stopBrain(
  brain: Bun.Subprocess<"ignore", "pipe", "pipe">,
): Promise<void> {
  if (process.platform === "win32") {
    const killer = Bun.spawn(
      ["taskkill", "/PID", String(brain.pid), "/T", "/F"],
      { stdout: "ignore", stderr: "ignore" },
    );
    await killer.exited;
  } else {
    brain.kill();
  }
  await brain.exited;
}
