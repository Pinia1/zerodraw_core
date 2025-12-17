import { useMediaQuery } from '@zeroDraw/common';
import type { GetProp, MenuProps } from 'antd';
import { Menu } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import useCopyLayer from '../../../hooks/useCopyLayer';
import useDeletedLayer from '../../../hooks/useDeletedLayer';
import useMergeLayer from '../../../hooks/useMergeLayer';
import useOrderLayer from '../../../hooks/useOrderLayer';
import useVisibled from '../../../hooks/useVisibled';
import { useDrawingStore } from '../../../store/useDrawing';
import useLayerStore, { emptyDrawingLayer } from '../../../store/useLayer';
import { Layers } from '../../../types/Layers';
import { exportStageWithBlendModes } from '../../../utils/BlendMode';

const DangerText = styled.span`
  color: red;
`;

const StyledMenu = styled(Menu)`
  border-inline-end: none !important;
  background-color: transparent;
  font-size: 13px;
`;

type MenuTheme = GetProp<MenuProps, 'theme'>;

interface MenusProps extends Layers {
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

type MenuItem = GetProp<MenuProps, 'items'>[number] & {
  onClick?: (e: Parameters<NonNullable<MenuProps['onClick']>>[0]) => void;
};

const Menus: React.FC<MenusProps> = (props) => {
  const { setMenuOpen, id } = props;

  const [theme] = useMediaQuery();

  const { copy, paste } = useCopyLayer(id);
  const { delete: deleteLayer } = useDeletedLayer(id);
  const { mergeDown, mergeUp, canMergeDown, canMergeUp } = useMergeLayer(id);
  const { sendToFront, sendToBack, isAtFront, isAtBack } = useOrderLayer(id);
  const { toggleOthersVisibility } = useVisibled(id);

  const { stageRef, layerConfig, stageConfig } = useDrawingStore(
    useShallow((state) => ({
      stageRef: state.stageRef,
      layerConfig: state.layerConfig,
      stageConfig: state.stageConfig,
    }))
  );

  const { layers, setDrawingLayer, drawingLayer, pushHistory } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      setDrawingLayer: state.setDrawingLayer,
      drawingLayer: state.drawingLayer,
      pushHistory: state.pushHistory,
    }))
  );

  const items: MenuItem[] = [
    {
      key: 'Add',
      label: 'Add to...',
      children: [
        { key: 'add-library', label: 'Add to Library' },
        { key: 'add-workspace', label: 'Add to Workspace' },
      ],
    },
    {
      key: 'Copy',
      label: 'Copy',
      onClick: () => {
        copy();
        setMenuOpen(false);
      },
    },
    {
      key: 'Duplicate',
      label: 'Duplicate',
      onClick: () => {
        copy();
        requestAnimationFrame(() => {
          paste();
          setMenuOpen(false);
        });
      },
    },
    // {
    //   key: 'LocK',
    //   label: 'Lock / Unlock',
    // },

    {
      key: 'Merge-up',
      label: 'Merge up',
      disabled: !canMergeUp(),
      onClick: () => {
        mergeUp();
        setMenuOpen(false);
      },
    },
    {
      key: 'Merge-down',
      label: 'Merge down',
      disabled: !canMergeDown(),
      onClick: () => {
        mergeDown();
        setMenuOpen(false);
      },
    },
    {
      key: 'Send-to-front',
      label: 'Send to front',
      disabled: isAtFront(),
      onClick: () => {
        sendToFront();
        setMenuOpen(false);
      },
    },
    {
      key: 'Send-to-back',
      label: 'Send to back',
      disabled: isAtBack(),
      onClick: () => {
        sendToBack();
        setMenuOpen(false);
      },
    },
    {
      key: 'Show/hide',
      label: 'Show/Hide Others',
      onClick: () => {
        toggleOthersVisibility();
        setMenuOpen(false);
      },
    },

    {
      key: 'Export',
      label: 'Export',
      children: [
        {
          key: 'export-original',
          label: 'Image (Original)',
          onClick: async () => {
            if (!stageRef?.current) return;

            const dataURL = await exportStageWithBlendModes(stageRef.current, layers, {
              mimeType: 'image/png',
              quality: 1,
              cropWidth: layerConfig.width,
              cropHeight: layerConfig.height,
              cropX: layerConfig.x,
              cropY: layerConfig.y,
              targetWidth: 1920,
              backgroundColor: layerConfig.backgroundVisible
                ? layerConfig.backgroundColor
                : 'transparent',
              // 默认导出“画布内容”不受缩放/拖拽影响；如需所见即所得，可改为 true
              applyStageTransform: false,
              stageScale: stageConfig.scale,
              stageX: stageConfig.x,
              stageY: stageConfig.y,
            });

            // 下载
            const a = document.createElement('a');
            a.download = `export-1920.png`;
            a.href = dataURL;
            a.click();
          },
        },
        {
          key: 'export-2x',
          label: 'Image (2x)',
          onClick: async () => {
            if (!stageRef?.current) return;
            const dataURL = await exportStageWithBlendModes(stageRef.current, layers, {
              mimeType: 'image/png',
              quality: 1,
              cropWidth: layerConfig.width,
              cropHeight: layerConfig.height,
              cropX: layerConfig.x,
              cropY: layerConfig.y,
              targetWidth: 1920 * 2,
              backgroundColor: layerConfig.backgroundVisible
                ? layerConfig.backgroundColor
                : 'transparent',
              applyStageTransform: false,
              stageScale: stageConfig.scale,
              stageX: stageConfig.x,
              stageY: stageConfig.y,
            });
            const a = document.createElement('a');
            a.download = `export-3840.png`;
            a.href = dataURL;
            a.click();
          },
        },
        {
          key: 'export-4x',
          label: 'Image (4x)',
          onClick: async () => {
            if (!stageRef?.current) return;
            const dataURL = await exportStageWithBlendModes(stageRef.current, layers, {
              mimeType: 'image/png',
              quality: 1,
              cropWidth: layerConfig.width,
              cropHeight: layerConfig.height,
              cropX: layerConfig.x,
              cropY: layerConfig.y,
              targetWidth: 1920 * 4,
              backgroundColor: layerConfig.backgroundVisible
                ? layerConfig.backgroundColor
                : 'transparent',
              applyStageTransform: false,
              stageScale: stageConfig.scale,
              stageX: stageConfig.x,
              stageY: stageConfig.y,
            });
            const a = document.createElement('a');
            a.download = `export-7680.png`;
            a.href = dataURL;
            a.click();
          },
        },
        {
          key: 'export-8x',
          label: 'Image (8x)',
          onClick: async () => {
            if (!stageRef?.current) return;
            const dataURL = await exportStageWithBlendModes(stageRef.current, layers, {
              mimeType: 'image/png',
              quality: 1,
              cropWidth: layerConfig.width,
              cropHeight: layerConfig.height,
              cropX: layerConfig.x,
              cropY: layerConfig.y,
              targetWidth: 1920 * 8,
              backgroundColor: layerConfig.backgroundVisible
                ? layerConfig.backgroundColor
                : 'transparent',
              applyStageTransform: false,
              stageScale: stageConfig.scale,
              stageX: stageConfig.x,
              stageY: stageConfig.y,
            });
            const a = document.createElement('a');
            a.download = `export-15360.png`;
            a.href = dataURL;
            a.click();
          },
        },
      ],
    },
    {
      key: 'Clear',
      label: <DangerText>Clear</DangerText>,
      onClick: () => {
        const emptyLayer = emptyDrawingLayer();
        const newLayer = {
          ...drawingLayer!,
          ...emptyLayer,
        };

        setDrawingLayer(newLayer);
        pushHistory(layers.map((layer) => (layer.id === id ? newLayer : layer)));
        setMenuOpen(false);
      },
    },
    {
      key: 'Delete',
      label: <DangerText>Delete</DangerText>,
      onClick: () => {
        deleteLayer();
        setMenuOpen(false);
      },
    },
  ];
  return (
    <div>
      <StyledMenu
        selectedKeys={[]}
        style={{ width: 156 }}
        mode={'vertical'}
        theme={theme as MenuTheme}
        items={items}
      />
    </div>
  );
};

export default Menus;
