export interface AgentRuntimeLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
}

const noop = () => undefined;

export const noopAgentRuntimeLogger: AgentRuntimeLogger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};

let agentRuntimeLogger: AgentRuntimeLogger = noopAgentRuntimeLogger;

export function setAgentRuntimeLogger(logger: AgentRuntimeLogger): void {
  agentRuntimeLogger = logger;
}

export function getAgentRuntimeLogger(): AgentRuntimeLogger {
  return agentRuntimeLogger;
}
