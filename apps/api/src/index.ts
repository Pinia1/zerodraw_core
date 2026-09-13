import { createApp } from './app';
import { env, isRedisEnabled } from './config/env';
import { closeDatabase } from './db';
import { closeRedis } from './redis';
import { logger } from './utils/logger';

async function start() {
  try {
    const app = await createApp();

    await app.listen({ port: env.PORT, host: env.HOST });

    logger.info(`Server started successfully`, {
      port: env.PORT,
      host: env.HOST,
      env: env.NODE_ENV,
      agentRuntimeHost: env.AGENT_RUNTIME_HOST,
    });

    const shutdown = async () => {
      try {
        await app.close();
        if (isRedisEnabled) {
          await closeRedis();
        }
        await closeDatabase();
        logger.info(`Server shutdown successfully`);
        process.exit(0);
      } catch (error) {
        logger.error(`Server shutdown failed`, { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error(`Server startup failed`, { error });
    process.exit(1);
  }
}
start();
