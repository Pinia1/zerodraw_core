import Icon, { LoadingOutlined } from '@ant-design/icons';
import { useMemoizedFn } from '@zeroDraw/common';
import { Container, generateUUID, Icons, ToolItem } from '@zeroDraw/core';
import { Divider, Tooltip } from 'antd';
import React, { useMemo } from 'react';
import useUpload from '@/pages/hooks/useUpload';
import { apiUrl, fileUrl } from '@/utils';

interface StudioToolBarProps {
  setNodes: React.Dispatch<React.SetStateAction<StudioNode[]>>;
  onFitView: () => void;
}

enum StudioActions {
  UPLOAD = 'upload',
  MARKDOWN = 'markdown',
  VIDEO = 'video',
  DIVIDER = 'divider',
  FIT = 'fit',
}

const StudioToolBar: React.FC<StudioToolBarProps> = ({ setNodes, onFitView }) => {
  const { run: runUpload, loading } = useUpload({
    accept: 'image/*',
    multiple: false,
    onSuccess: ({ s3Key, width, height }) => {
      const url = `${apiUrl}${fileUrl}/${s3Key}`;
      const ratio = width / height;
      const targetWidth = Math.min(width, 240);
      const targetHeight = Math.round(targetWidth / ratio);

      setNodes((nodes) => [
        ...nodes,
        {
          id: generateUUID(),
          type: 'img',
          position: { x: 0, y: 0 },
          data: {
            src: url,
            width: targetWidth,
            height: targetHeight,
            s3Key,
            label: '参考图',
          },
        },
      ]);
    },
  });

  const addMarkdown = useMemoizedFn(() => {
    setNodes((nodes) => [
      ...nodes,
      {
        id: generateUUID(),
        type: 'markdown',
        position: { x: 0, y: 0 },
        data: { content: '', width: 300, height: 220, label: '脚本' },
      },
    ]);
  });

  const addVideo = useMemoizedFn(() => {
    setNodes((nodes) => [
      ...nodes,
      {
        id: generateUUID(),
        type: 'video',
        position: { x: 0, y: 0 },
        data: { status: 'empty', width: 320, height: 180, label: '视频' },
      },
    ]);
  });

  const items = useMemo(
    () => [
      {
        key: StudioActions.UPLOAD,
        tip: '上传参考图',
        icon: loading ? <LoadingOutlined /> : <Icon component={Icons.IconAdd} />,
        onClick: () => runUpload(),
      },
      {
        key: StudioActions.MARKDOWN,
        tip: '添加脚本（Markdown）',
        icon: <Icon component={Icons.IconNote} />,
        onClick: addMarkdown,
      },
      {
        key: StudioActions.VIDEO,
        tip: '添加视频节点',
        icon: <Icon component={Icons.IconViews} />,
        onClick: addVideo,
      },
      { key: StudioActions.DIVIDER },
      {
        key: StudioActions.FIT,
        tip: '适应画布',
        icon: <Icon component={Icons.IconSection} />,
        onClick: onFitView,
      },
    ],
    [addMarkdown, addVideo, loading, onFitView, runUpload],
  );

  return (
    <Container
      className="studio-toolbar"
      style={{
        position: 'fixed',
        width: 'fit-content',
        top: '1rem',
        left: 0,
        right: 0,
        margin: '0 auto',
        zIndex: 10,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        padding: '8px 12px',
        borderRadius: 16,
      }}
    >
      {items.map((item, idx) => {
        if (item.key === StudioActions.DIVIDER) {
          return <Divider key={`divider-${idx}`} style={{ height: 28, margin: 0 }} type="vertical" />;
        }
        return (
          <Tooltip key={item.key} title={item.tip}>
            <ToolItem onClick={item.onClick} style={{ minWidth: 38 }}>
              {item.icon}
            </ToolItem>
          </Tooltip>
        );
      })}
    </Container>
  );
};

export default StudioToolBar;
