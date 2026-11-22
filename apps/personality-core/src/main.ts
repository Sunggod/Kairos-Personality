import { ConfigError, formatConfigError, loadConfig } from "./config";
import { createLogger } from "./logger";
import { TaskStore } from "./task-store";

function main(): number {
  let config;

  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(formatConfigError(error));
      return 1;
    }

    throw error;
  }

  const logger = createLogger({ level: config.logging.level });

  // P11: tarefa não terminal de um processo morto vira unknown no boot,
  // sem reenvio automático ao Brain.
  const tasks = new TaskStore({ path: config.paths.tasksDb });
  const recovered = tasks.recoverNonTerminal();
  tasks.close();

  logger.info({ event: "tasks.recovered", count: recovered.length }, "tarefas recuperadas");

  logger.info(
    {
      event: "boot",
      runtime: {
        host: config.runtime.host,
        port: config.runtime.port,
        modelPath: config.runtime.modelPath,
        contextSize: config.runtime.contextSize,
        gpuLayers: config.runtime.gpuLayers,
        parallel: config.runtime.parallel,
        kvCacheType: config.runtime.kvCacheType,
      },
    },
    "núcleo pronto; nenhum motor iniciado nesta fase",
  );

  return 0;
}

if (import.meta.main) {
  process.exitCode = main();
}
