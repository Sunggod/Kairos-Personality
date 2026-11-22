import { BrainTransportError } from "@kairos-personality/core";
import { startE2EFixture } from "./e2e/harness";

const trace = "trace_e2e_cancel_" + Date.now();
const fixture = await startE2EFixture({
  trace,
  mode: "stream",
  emitEvents: 4,
  eventDelayMs: 20,
  invokeDelayMs: 1500,
});

try {
  const pending = fixture.client.planRun({
    trace,
    workspace: "f2-e2e-cancel",
    flow: "two-step",
    slots: { objective: "plano longo" },
  });
  // Não deixar promise rejeitada sem tratamento: o plano pode falhar depois do cancel.
  let planFailure = "";
  let planSettled = false;
  let planStatus = "";
  let planOutcome = "";
  void pending.then(
    (result) => {
      planSettled = true;
      planStatus = result.status;
      planOutcome = result.report?.outcome ?? "sem-report";
    },
    (error: unknown) => {
      planSettled = true;
      planFailure =
        error instanceof BrainTransportError
          ? error.code + "/" + error.status
          : "erro desconhecido";
    },
  );

  await Bun.sleep(250);

  let cancelStatus = "accepted";
  let cancelCode = "";

  try {
    await fixture.client.cancel(trace);
  } catch (error) {
    if (!(error instanceof BrainTransportError)) throw error;
    cancelStatus = "rejected";
    cancelCode = error.code;
  }

  const nodeCancelled = fixture.node.cancelledTraces().includes(trace);
  await Bun.sleep(500);

  // Segundo cancel: registrado como observação, não como expectativa.
  let secondStatus = "accepted";
  let secondCode = "";
  try {
    await fixture.client.cancel(trace);
  } catch (error) {
    if (!(error instanceof BrainTransportError)) throw error;
    secondStatus = "rejected";
    secondCode = error.code;
  }

  const observation = {
    b14: {
      firstCancel: { status: cancelStatus, code: cancelCode },
      nodeCancelled,
      planSettledAfter750ms: planSettled,
      planStatus,
      planOutcome,
      planFailure,
      secondCancel: { status: secondStatus, code: secondCode },
    },
  };
  console.log(JSON.stringify(observation));

  // O E2E existe para descobrir: exige apenas que o cancel tenha efeito
  // observável, seja rejeitando (409, como o estudo previa) seja alcançando
  // a invocação ativa do nó (comportamento real observado).
  if (!nodeCancelled && cancelCode !== "CANCELLED") {
    throw new Error("cancel não produziu nenhum efeito observável");
  }
} catch (error) {
  console.error("E2E falhou:", error);
  process.exitCode = 1;
} finally {
  await fixture.close();
}
