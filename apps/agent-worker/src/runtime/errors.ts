/** Runtime 层可预期的业务错误（宿主可映射为 HTTP 4xx） */
export class AgentRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentRuntimeError';
  }
}
