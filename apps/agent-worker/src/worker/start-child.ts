import type { AgentWorkerChildConfig } from './child-runtime';
import { AgentWorkerChildRuntime } from './child-runtime';
import type { WorkerParentMessage } from './protocol';

/** 在 fork 子进程内启动 Agent worker runtime（由宿主或独立服务注入 tooling / storage） */
export function startAgentWorkerChild(config: AgentWorkerChildConfig): void {
  const runtime = new AgentWorkerChildRuntime((message) => {
    if (process.send) process.send(message);
  }, config);

  process.on('message', (message: WorkerParentMessage) => {
    void runtime.handle(message).catch((error) => {
      if (process.send) {
        process.send({
          type: 'worker_error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  });

  process.on('uncaughtException', (error) => {
    if (process.send) process.send({ type: 'worker_error', message: error.message });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    if (process.send) process.send({ type: 'worker_error', message });
    process.exit(1);
  });

  if (process.send) {
    process.send({ type: 'ready' });
  }
}
