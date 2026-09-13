import type { TSchema } from '@earendil-works/pi-ai';
import type { ClientToolDefinition } from '@zeroDraw/api-contract';
import type { RegisteredAgentTool } from '../framework';
import { createFrontendTool } from './frontend/createFrontendTool';

/** 将前端注册的 ClientToolDefinition 转为 harness deferred 工具 */
export function createRegisteredClientTool(def: ClientToolDefinition): RegisteredAgentTool {
  return {
    kind: 'frontend',
    capabilities: ['frontend.bridge'],
    tool: createFrontendTool({
      name: def.name,
      description: def.description,
      label: def.label,
      parameters: def.parameters as TSchema,
      timeoutMs: def.timeoutMs,
    }),
  };
}
