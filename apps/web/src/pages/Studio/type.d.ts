import type { Node } from '@xyflow/react';

declare global {
  type ImageNodeData = {
    src?: string;
    width?: number;
    height?: number;
    s3Key?: string;
    label?: string;
  };

  type ImageNode = Node<ImageNodeData, 'img'>;

  type VideoNodeData = {
    src?: string;
    poster?: string;
    width?: number;
    height?: number;
    s3Key?: string;
    taskId?: string;
    status?: 'empty' | 'generating' | 'ready' | 'failed';
    error?: string;
    duration?: number;
    label?: string;
  };

  type VideoNode = Node<VideoNodeData, 'video'>;

  type MarkdownNodeData = {
    content?: string;
    width?: number;
    height?: number;
    status?: 'complete' | 'drag' | 'empty';
    label?: string;
  };

  type MarkdownNode = Node<MarkdownNodeData, 'markdown'>;

  /** Studio 画布仅使用 img / markdown / video */
  type StudioNode = ImageNode | MarkdownNode | VideoNode;
}

export {};
