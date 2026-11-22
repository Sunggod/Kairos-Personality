import { startE2EFixture } from "./e2e/harness";

const trace = "trace_e2e_buffer_" + Date.now();
const EMITTED = 300;
const BUFFER = 256;

const fixture = await startE2EFixture({
  trace,
  mode: "stream",
  emitEvents: EMITTED,
  eventDelayMs: 1,
  invokeDelayMs: 700,
});

try {
  const result = await fixture.client.planRun({
    trace,
    workspace: "f2-e2e-buffer",
    flow: "two-step",
    slots: { objective: "plano com muito evento" },
  });

  if (result.status !== "executed") {
    throw new Error("esperava plano executado, veio " + result.status);
  }

  const received: string[] = [];
  const handle = await fixture.client.stream({
    trace,
    onEvent: (event) => received.push(event.id),
  });
  await Bun.sleep(500);
  handle.close();

  const indices = received.map((id) => Number(id.slice(id.lastIndexOf("_") + 1)));

  const firstIndex = Math.min(...indices);
  const dropped = firstIndex;

  console.log(
    JSON.stringify({
      b15: {
        emittedByNode: EMITTED,
        receivedByLateSubscriber: received.length,
        brainBufferCap: BUFFER,
        firstEventIndex: firstIndex,
        droppedInferred: dropped,
        droppedExposedOverRpc: false,
      },
    }),
  );

  if (received.length !== BUFFER) {
    throw new Error("esperava " + BUFFER + " eventos no buffer, veio " + received.length);
  }
  if (dropped <= 0) {
    throw new Error("nenhum evento descartado: B15 não confirmado");
  }
} catch (error) {
  console.error("E2E falhou:", error);
  process.exitCode = 1;
} finally {
  await fixture.close();
}
