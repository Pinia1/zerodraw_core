/** 同一会话 prompt 串行化，避免 LaneBusy。 */
const chains = new Map<string, Promise<void>>();

export function withAgentPromptLock<T>(sessionId: string, task: () => Promise<T>): Promise<T> {
  const prev = chains.get(sessionId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const chained = prev
    .catch(() => undefined)
    .then(() => gate);
  chains.set(sessionId, chained);

  const run = prev
    .catch(() => undefined)
    .then(task)
    .finally(() => {
      release();
      if (chains.get(sessionId) === chained) chains.delete(sessionId);
    });

  return run;
}
