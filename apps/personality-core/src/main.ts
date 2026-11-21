import { ConfigError, formatConfigError, loadConfig } from "./config";
import { createLogger } from "./logger";

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
