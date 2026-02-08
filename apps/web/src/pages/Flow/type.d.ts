import type { Node } from '@xyflow/react';

declare global {
  type ImageNode = Node<
    {
      src?: string;
      width?: number;
      height?: number;
      args?: any;
      s3Key?: string;
      taskId?: string;
    },
    'img'
  >;

  type CreateWithAINode = Node<
    {
      prompt?: string;
      imageId?: string;
    },
    'createWithAI'
  >;

  type AppNode = ImageNode | CreateWithAINode;
}
