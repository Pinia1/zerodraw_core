import { Type } from '@earendil-works/pi-ai';
import type { AgentHarnessTool } from '@earendil-works/pi-agent-core';
import type { GenerateParams } from '../../AIGenerate/generators/base.generator';
import type { AgentToolContext } from '../session/types';

const GenerateImageToolParameters = Type.Object({
  action: Type.String(),
  s3Key: Type.Optional(Type.Array(Type.String())),
  args: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export function createGenerateImageTool(): AgentHarnessTool<
  AgentToolContext,
  typeof GenerateImageToolParameters
> {
  return {
    name: 'generate_image',
    description:
      '提交一个图像生成任务（异步）。复用 zeroDraw 现有生成管线（Seedream / NanoBanana / BullMQ），返回 taskId 供轮询。',
    label: '生成图像',
    parameters: GenerateImageToolParameters,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async execute(_toolCallId, params, onUpdate, toolContext, _invocation, _context) {
      onUpdate({ content: [{ type: 'text', text: '已提交图像生成任务…' }], details: undefined });
      const { taskId } = await toolContext.deps.generate.run(
        toolContext.userId,
        {
          action: params.action,
          s3Key: params.s3Key ?? [],
          args: params.args ?? {},
        } as unknown as GenerateParams,
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              taskId,
              hint: '轮询 GET /api/generate/task/:id 获取生成结果',
            }),
          },
        ],
        details: { taskId },
      };
    },
  };
}
