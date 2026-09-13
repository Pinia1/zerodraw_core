export interface SandboxRunRequest {
  language: 'js' | 'python' | 'wasm';
  code: string;
  inputs?: unknown;
  limits?: {
    timeoutMs?: number;
    memoryMb?: number;
  };
}

/** 隔离运行时：kind=sandbox 工具通过此接口执行不可信代码（预留） */
export interface SandboxRuntime {
  run(request: SandboxRunRequest): Promise<unknown>;
}

export const noopSandboxRuntime: SandboxRuntime = {
  async run() {
    throw new Error('Sandbox runtime 未配置');
  },
};
