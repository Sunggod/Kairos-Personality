import { intentKey } from "@kairos-personality/core";
import { startE2EFixture } from "./e2e/harness";

const trace = "trace_e2e_happy_" + Date.now();
const fixture = await startE2EFixture({ trace });

try {
  const slots = { objective: "teste de ponta a ponta" };
  const idempotencyKey = intentKey({
    turnId: trace,
    flow: "two-step",
    slots,
  });
  const result = await fixture.client.planRun({
    trace,
    workspace: "f2-e2e-happy",
    flow: "two-step",
    slots,
    idempotencyKey,
  });

  if (result.status !== "executed") {
    throw new Error("esperava status executed, veio " + result.status);
  }
  if (result.results.length !== 2) {
    throw new Error("esperava 2 passos, veio " + result.results.length);
  }
  if (result.report?.outcome !== "succeeded") {
    throw new Error("esperava report succeeded");
  }

  // B12: o envelope do plano leva a chave, mas os passos não a recebem.
  const nodeRequests = fixture.node.requests();
  const stepRequests = nodeRequests.filter((request) => request["cap"] === "echo");
  const propagated = stepRequests.some((request) =>
    Object.hasOwn(request, "idempotencyKey"),
  );

  console.log(
    JSON.stringify({
      ok: true,
      status: result.status,
      steps: result.results.map((step) => step.alias),
      outcome: result.report.outcome,
      workspace: result.workspace,
      b12: {
        sentInPlanEnvelope: true,
        stepRequests: stepRequests.length,
        propagatedToSteps: propagated,
      },
    }),
  );

  if (stepRequests.length === 0) {
    throw new Error("nenhuma requisição de passo observada no nó");
  }
  if (propagated) {
    throw new Error("B12 mudou: idempotencyKey chegou aos passos");
  }
} catch (error) {
  console.error("E2E falhou:", error);
  process.exitCode = 1;
} finally {
  await fixture.close();
}
