import Icon, { LeftOutlined } from '@ant-design/icons';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position, useNodes, useReactFlow } from '@xyflow/react';
import { generateUUID, useMemoizedFn } from '@zeroDraw/common';
import { Container, Icons, ToolItem } from '@zeroDraw/core';
import { Input, Menu, Tooltip } from 'antd';
import React, { memo, useMemo, useState } from 'react';
import { httpSeedreamGenerate } from '../../../../services/generate';
import { Header, InputRow, Title, TitleRow } from './components';
import type { MentionItem } from './components/MentionList';
import Prompt from './components/Prompt';

const MENU_ITEMS = [
  { key: 'new_view', icon: <Icon component={Icons.IconViews} />, label: 'New view' },
  { key: 'expression', icon: <Icon component={Icons.IconFace} />, label: 'Change expression' },
];

const NODE_WIDTH = 280;
const GAP = 80;

const CreateWithAI: React.FC<NodeProps> = ({ id, selected, height, data }) => {
  const { imageId } = data;
  const [menuKey, setMenuKey] = useState<(typeof MENU_ITEMS)[number]['key'] | 'prompt' | null>(
    null
  );

  const nodes = useNodes();
  const { getNode, setNodes } = useReactFlow();

  const handlerGenerate = useMemoizedFn(
    async (values: {
      prompt: { text: string; mentions: [] };
      size: { width: number; height: number };
    }) => {
      const imageNode = getNode(imageId as string);
      const targetWidth = values.size.width as number;
      const targetHeight = values.size.height as number;

      const { taskId } = await httpSeedreamGenerate({
        action: 'SEEDDREAM_IMAGE',
        s3Key: [imageNode?.data.s3Key as string],
        args: {
          prompt: values.prompt?.text || '',
          size: targetWidth + 'x' + targetHeight,
        },
      });

      const nextImageRatio = targetWidth / targetHeight;
      //withai
      const currentNode = getNode(id);
      const currentX = currentNode?.position.x ?? 0;
      const currentY = currentNode?.position.y ?? 0;
      const currentH = height ?? 200;
      const newNodeWidth = 250;
      const newNodeHeight = newNodeWidth / nextImageRatio;
      setNodes((pre) => [
        ...pre,
        {
          id: generateUUID(),
          type: 'img',
          position: {
            x: currentX + NODE_WIDTH + GAP,
            y: currentY + (currentH - newNodeHeight) / 2,
          },
          data: {
            taskId,
            width: imageNode?.data.width,
            height: newNodeHeight,
          },
        },
      ]);
    }
  );

  const content = useMemo(() => {
    const imageNodes = nodes
      .filter((node) => node.type === 'img')
      .map((node, idx) => ({
        id: node.id,
        label: `image-${idx + 1}`,
        url: node.data.src,
        s3Key: node.data.s3Key,
      })) as MentionItem[];

    switch (menuKey) {
      case 'prompt':
        return <Prompt onSubmit={handlerGenerate} mentionItems={imageNodes} />;
      default:
        return (
          <>
            <InputRow>
              <Input
                size="large"
                placeholder="Describe your changes"
                suffix={
                  <ToolItem style={{ width: 24 }}>
                    <Icon component={Icons.IconRightArrow} />
                  </ToolItem>
                }
                onClick={() => setMenuKey('prompt')}
              />
            </InputRow>

            <div
              style={{
                padding: '0 12px',
              }}
            >
              <Menu
                items={MENU_ITEMS.map((item) => ({
                  key: item.key,
                  label: item.label,
                  icon: item.icon,
                }))}
              />
            </div>
          </>
        );
    }
  }, [menuKey, nodes.length]);

  return (
    <Container
      style={{
        width: 280,
        borderRadius: 16,
        overflow: 'hidden',
        outline: selected ? '1px solid var(--color-primary-active)' : 'none',
        padding: 8,
        cursor: 'default',
      }}
    >
      <Header>
        <TitleRow
          style={{
            cursor: menuKey ? 'pointer' : 'default',
          }}
          onClick={() => setMenuKey(null)}
        >
          {menuKey && <LeftOutlined />}
          <Title>Modify</Title>
        </TitleRow>
        <Tooltip title="Modify lets you generatevariations with control andextract valuable assets likematerials, or different viewsfrom an already visualizedbase idea.">
          <Icon component={Icons.IconTip} />
        </Tooltip>
      </Header>

      {content}

      <Handle type="source" position={Position.Right} style={{ opacity: selected ? 1 : 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: selected ? 1 : 0 }} />
    </Container>
  );
};

export default memo(CreateWithAI);
