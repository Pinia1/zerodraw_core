import type { Edge } from '@xyflow/react';

/** 生视频流程 demo：脚本 + 参考图 → 视频 */
export const initialNodes: StudioNode[] = [
  {
    id: 'studio-script',
    type: 'markdown',
    position: { x: -420, y: 40 },
    data: {
      label: '脚本',
      width: 300,
      height: 260,
    },
  },
  {
    id: 'studio-ref-image',
    type: 'img',
    position: { x: -420, y: 340 },
    data: {
      label: '参考图',
      src: '/zero.png',
      width: 220,
      height: 216,
      s3Key: '4b06f6136e4642e69feed9fc376d508e',
    },
  },
  {
    id: 'studio-video',
    type: 'video',
    position: { x: 80, y: 120 },
    data: {
      label: '视频',
      status: 'empty',
      width: 360,
      height: 202,
    },
  },
];

export const initialEdges: Edge[] = [
  { id: 'e-script-video', source: 'studio-script', target: 'studio-video' },
  { id: 'e-ref-video', source: 'studio-ref-image', target: 'studio-video' },
];
