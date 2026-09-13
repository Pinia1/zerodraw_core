import type { ClientToolDefinition } from '@zeroDraw/api-contract';

/** Studio 页 createSession 注册的 client tools（与 frontend tools 名称一致） */
export const studioClientToolDefinitions: ClientToolDefinition[] = [
  {
    name: 'get_flow_state',
    label: '读取流程图',
    description:
      '【必须调用】读取 Studio 画布：节点类型/位置/尺寸、Markdown 脚本正文、参考图 URL、视频状态、连线关系。用户问画布内容、脚本、节点时必须调用，不得编造。',
    parameters: {
      type: 'object',
      properties: {
        nodeIds: {
          type: 'array',
          items: { type: 'string' },
          description: '仅返回指定节点；省略则返回全部',
        },
        includeContent: {
          type: 'boolean',
          description: '是否包含 Markdown 正文等完整内容，默认 true',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_flow_node',
    label: '创建节点',
    description:
      '在画布上创建 markdown（脚本）/ img（参考图）/ video（视频）节点。可指定 position、label、content、src 等。',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['markdown', 'img', 'video'] },
        id: { type: 'string' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
          required: ['x', 'y'],
        },
        label: { type: 'string' },
        content: { type: 'string', description: 'markdown 节点脚本正文' },
        src: { type: 'string', description: 'img / video 媒体 URL' },
        width: { type: 'number', exclusiveMinimum: 0 },
        height: { type: 'number', exclusiveMinimum: 0 },
        status: {
          type: 'string',
          enum: ['empty', 'generating', 'ready', 'failed'],
          description: 'video 节点状态',
        },
      },
      required: ['type'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_flow_node',
    label: '更新节点',
    description:
      '更新已有节点的位置、label、Markdown 正文、图片 src、尺寸或 video 状态。修改脚本/内容前建议先 get_flow_state。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
          required: ['x', 'y'],
        },
        label: { type: 'string' },
        content: { type: 'string' },
        src: { type: 'string' },
        width: { type: 'number', exclusiveMinimum: 0 },
        height: { type: 'number', exclusiveMinimum: 0 },
        status: {
          type: 'string',
          enum: ['empty', 'generating', 'ready', 'failed'],
        },
        error: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_flow_node',
    label: '删除节点',
    description: '按 id 删除节点，并自动移除相关连线。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'connect_flow_nodes',
    label: '连接节点',
    description: '创建从 source 到 target 的有向连线（如脚本→视频、参考图→视频）。',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string' },
        target: { type: 'string' },
        id: { type: 'string' },
      },
      required: ['source', 'target'],
      additionalProperties: false,
    },
  },
];
