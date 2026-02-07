import Icon from '@ant-design/icons';
import { NodeProps } from '@xyflow/react';
import { useMemoizedFn } from '@zeroDraw/common';
import { Container, Icons, ToolItem, ToolTypes } from '@zeroDraw/core';
import { Divider, Tooltip } from 'antd';
import { saveAs } from 'file-saver';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Actions, ToolMenus } from '../../../components/ToolBar/type';

interface ImageToolProps extends NodeProps {}

const ImageTool: React.FC<ImageToolProps> = (props) => {
  const { id, data, selected } = props;

  const navigate = useNavigate();

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
        type: ToolTypes.STATE,
        onClick: () => {},
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
