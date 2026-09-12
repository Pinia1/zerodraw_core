import type { FrontendToolName } from '@zeroDraw/api-contract';
import type { FrontendToolContext, FrontendToolDefinition } from './types';

export class FrontendToolRegistry {
  private readonly tools = new Map<FrontendToolName, FrontendToolDefinition>();

  constructor(definitions: FrontendToolDefinition[] = []) {
    for (const tool of definitions) {
      this.tools.set(tool.name, tool);
    }
  }

  has(name: string): name is FrontendToolName {
    return this.tools.has(name as FrontendToolName);
  }

  list(): FrontendToolName[] {
    return [...this.tools.keys()];
  }

  async execute(name: FrontendToolName, args: unknown, ctx: FrontendToolContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`未注册的前端工具: ${name}`);
    }
    return tool.execute(args, ctx);
  }

  requiresApproval(name: FrontendToolName): boolean {
    return this.tools.get(name)?.requiresApproval ?? false;
  }
}

export function createFrontendToolRegistry(
  definitions: FrontendToolDefinition[],
): FrontendToolRegistry {
  return new FrontendToolRegistry(definitions);
}
