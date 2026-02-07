import type { Node } from '@xyflow/react';

declare global {
  type ImageNode = Node<
    {
      src?: string;
    },
    'img'
  >;

  type CreateWithAINode = Node<
    {
      prompt?: string;
    },
    'createWithAI'
  >;

  type AppNode = ImageNode | CreateWithAINode;
}
