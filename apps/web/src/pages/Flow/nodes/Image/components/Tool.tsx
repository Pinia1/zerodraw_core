import Icon from '@ant-design/icons';
import { NodeProps, useReactFlow } from '@xyflow/react';
import { useMemoizedFn } from '@zeroDraw/common';
import { Container, generateUUID, Icons, ToolItem, ToolTypes } from '@zeroDraw/core';
import { Divider, Tooltip } from 'antd';
import { saveAs } from 'file-saver';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Actions, ToolMenus } from '../../../components/ToolBar/type';

interface ImageToolProps extends NodeProps {}

const ImageTool: React.FC<ImageToolProps> = (props) => {
  const { id, data } = props;

  const navigate = useNavigate();
  const { getNode, setNodes, addEdges } = useReactFlow();

  const handleCreateWithAI = useMemoizedFn(() => {
    const currentNode = getNode(id);
    if (!currentNode) return;

    const nodeWidth = (data.width as number) || 250;
    const gap = 80;

    const newNodeId = generateUUID();
    const newNode: CreateWithAINode = {
      id: newNodeId,
      type: 'createWithAI',
      position: {
        x: currentNode.position.x + nodeWidth + gap,
        y: currentNode.position.y,
      },
      data: {
        imageId: id,
      },
    };

    const newEdge = {
      id: `e-${id}-${newNodeId}`,
      source: id,
      target: newNodeId,
      type: 'smoothstep',
    };

    setNodes((nds) => [...nds, newNode]);
    addEdges([newEdge]);
  });

  const toolMenus: ToolMenus[] = useMemo(() => {
    return [
      {
        key: Actions.ROPE,
        icon: <Icon component={Icons.IconEdit} />,
        type: ToolTypes.ACTION,
        onClick: () => navigate('/drawing'),
        tip: 'Edit',
      },
      {
        key: Actions.TEXT,
        icon: <Icon component={Icons.IconDownload} />,
        type: ToolTypes.ACTION,
        onClick: () => {
          saveAs(data.src as string, 'image.png');
        },
        tip: 'Download',
      },
      {
        key: Actions.NOTE,
        icon: <Icon component={Icons.IconStar} />,
        type: ToolTypes.ACTION,
        onClick: handleCreateWithAI,
        tip: 'Create with AI',
      },
      {
        key: Actions.SECTION,
        icon: <Icon component={Icons.IconSection} />,
        type: ToolTypes.STATE,
        onClick: () => {},
      },

      {
        key: Actions.DIVIDER,
        icon: <Icon component={Icons.IconAdd} />,
        type: ToolTypes.DIVIDER,
      },
      {
        key: Actions.UNDO,
        icon: <Icon component={Icons.IconUndo} />,
        type: ToolTypes.ACTION,
        onClick: () => {},
        disabled: false,
      },
      {
        key: Actions.REDO,
        icon: <Icon component={Icons.IconRedo} />,
        type: ToolTypes.ACTION,
        onClick: () => {},
        disabled: false,
      },
    ];
  }, []);

  const handleSetActiveKey = useMemoizedFn(async (item: ToolMenus) => {
    if (item.disabled) return;

    await item.onClick?.(item);
    if (item.type !== ToolTypes.STATE) return;
  });

  return (
    <Container
      style={{
        width: 'fit-content',
        top: '1rem',
        left: '0px',
        right: '0px',
        margin: '0 auto',
        zIndex: 10,
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        height: '42px',
        padding: '6px',
        overflow: 'hidden',
        borderRadius: '16px',
        fontSize: 14,
      }}
    >
      {toolMenus.map((item, idx) => {
        const key = `${item.key}+${idx}`;
        if (item.type === ToolTypes.DIVIDER) {
          return <Divider key={key} style={{ height: '60%' }} type="vertical" />;
        }
        return (
          <Tooltip key={key} title={item.tip || ''}>
            <ToolItem
              $disabled={item.disabled}
              onClick={() => handleSetActiveKey(item)}
              $active={!!item.isActive}
              style={{
                width: 'fit-content',
                minWidth: 38,
              }}
            >
              {item.icon}
            </ToolItem>
          </Tooltip>
        );
      })}
    </Container>
  );
};

export default ImageTool;
