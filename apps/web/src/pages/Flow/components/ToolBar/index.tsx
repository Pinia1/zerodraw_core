import { useFlowStore } from '@/store/useFlowStore';
import Icon, { LoadingOutlined } from '@ant-design/icons';
import { useMemoizedFn } from '@zeroDraw/common';
import { Container, generateUUID, Icons, ToolItem, ToolTypes } from '@zeroDraw/core';
import { Divider } from 'antd';
import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { apiUrl, fileUrl } from '../../../../utils';
import useUpload from '../../../hooks/useUpload';
import DropMenu from './components/Dropmenu';
import { Actions, ToolBarProps, ToolMenus } from './type';

const Toolbar: React.FC<ToolBarProps> = ({ onFitView, setNodes }: ToolBarProps) => {
  const { toolActive, setToolActive } = useFlowStore(
    useShallow((state) => ({
      toolActive: state.toolActive,
      setToolActive: state.setToolActive,
    }))
  );

  const { run: runUpload, loading } = useUpload({
    accept: 'image/*',
    multiple: false,
    onSuccess: async ({ s3Key, width, height }) => {
      const image = new Image();
      const url = `${apiUrl}${fileUrl}/${s3Key}`;
      image.src = url;
      const ratio = width / height;
      const targetWidth = Math.min(width, 120);
      const targetHeight = Math.round(targetWidth / ratio);
      setNodes((nodes) => [
        ...nodes,
        {
          id: generateUUID(),
          type: 'img',
          position: { x: 0, y: 0 },
          data: { src: url, width: targetWidth, height: targetHeight, s3Key },
        },
      ]);
    },
    onError: (error) => {
      console.log(error, 'error');
    },
  });
  const toolMenus: ToolMenus[] = useMemo(() => {
    return [
      {
        key: Actions.ADD,
        icon: (
          <DropMenu>
            <Icon component={loading ? (LoadingOutlined as any) : Icons.IconAdd} />
          </DropMenu>
        ),
        type: ToolTypes.ACTION,
        onClick: () => {},
      },
      {
        key: Actions.DIVIDER,
        type: ToolTypes.DIVIDER,
      },
      {
        key: Actions.ROPE,
        icon: <Icon component={Icons.IconPoint} />,
        type: ToolTypes.STATE,
        get isActive() {
          return toolActive === Actions.ROPE;
        },
        onClick: () => {},
      },
      {
        key: Actions.TEXT,
        icon: <Icon component={Icons.IconText} />,
        type: ToolTypes.STATE,
        get isActive() {
          return toolActive === Actions.TEXT;
        },
        onClick: () => {
          setNodes((nodes) => [
            ...nodes,
            {
              id: generateUUID(),
              type: 'text',
              position: { x: 0, y: 0 },
              data: { status: 'drag' },
            },
          ]);
        },
      },
      {
        key: Actions.NOTE,
        icon: <Icon component={Icons.IconNote} />,
        type: ToolTypes.STATE,
        get isActive() {
          return toolActive === Actions.NOTE;
        },
        onClick: () => {},
      },
      {
        key: Actions.SECTION,
        icon: <Icon component={Icons.IconSection} />,
        type: ToolTypes.STATE,
        get isActive() {
          return toolActive === Actions.SECTION;
        },
        onClick: () => {
          setNodes((nodes) => [
            {
              id: generateUUID(),
              type: 'section',
              position: { x: 0, y: 0 },
              data: { status: 'drag' },
            },
            ...nodes,
          ]);
        },
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
  }, [toolActive]);

  const handleSetActiveKey = useMemoizedFn(async (item: ToolMenus) => {
    if (item.disabled) return;

    await item.onClick?.(item);
    if (item.type !== ToolTypes.STATE) return;

    setToolActive(item.key);
  });

  return (
    <Container
      style={{
        position: 'fixed',
        width: 'fit-content',
        top: '1rem',
        left: '0px',
        right: '0px',
        margin: '0 auto',
        zIndex: 10,
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        height: '48px',
        padding: '8px',
        overflow: 'hidden',
        borderRadius: '16px',
      }}
    >
      {toolMenus.map((item, idx) => {
        const key = `${item.key}+${idx}`;
        if (item.type === ToolTypes.DIVIDER) {
          return <Divider key={key} style={{ height: '60%' }} type="vertical" />;
        }
        return (
          <ToolItem
            $disabled={item.disabled}
            onClick={() => handleSetActiveKey(item)}
            $active={!!item.isActive}
            key={key}
          >
            {item.icon}
          </ToolItem>
        );
      })}
    </Container>
  );
};

export default Toolbar;
