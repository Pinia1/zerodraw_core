import type { FlowNodeSummary } from '@zeroDraw/api-contract';

const CONTENT_MAX = 8000;

function truncateContent(content: string): { text: string; truncated: boolean } {
  if (content.length <= CONTENT_MAX) {
    return { text: content, truncated: false };
  }
  return {
    text: `${content.slice(0, CONTENT_MAX)}\n\n…(已截断，共 ${content.length} 字)`,
    truncated: true,
  };
}

/** 将 Studio 节点转为 Agent 可读摘要（含内容） */
export function summarizeStudioNode(
  node: StudioNode,
  includeContent = true,
): FlowNodeSummary {
  const data = node.data as Record<string, unknown>;
  const base: FlowNodeSummary = {
    id: node.id,
    type: (node.type ?? 'markdown') as FlowNodeSummary['type'],
    position: node.position,
    label: typeof data.label === 'string' ? data.label : null,
    width: typeof data.width === 'number' ? data.width : null,
    height: typeof data.height === 'number' ? data.height : null,
  };

  if (node.type === 'markdown') {
    const raw = typeof data.content === 'string' ? data.content : '';
    if (includeContent && raw) {
      const { text, truncated } = truncateContent(raw);
      base.content = text;
      if (truncated) base.contentTruncated = true;
    } else {
      base.content = raw || null;
    }
  }

  if (node.type === 'img') {
    base.src = typeof data.src === 'string' ? data.src : null;
    base.s3Key = typeof data.s3Key === 'string' ? data.s3Key : null;
    base.taskId = typeof data.taskId === 'string' ? data.taskId : null;
  }

  if (node.type === 'video') {
    base.src = typeof data.src === 'string' ? data.src : null;
    base.status = typeof data.status === 'string' ? data.status : null;
    base.error = typeof data.error === 'string' ? data.error : null;
  }

  return base;
}
