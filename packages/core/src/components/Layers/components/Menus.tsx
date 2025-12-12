import { useMediaQuery } from '@monorepo/common';
import type { GetProp, MenuProps } from 'antd';
import { Menu } from 'antd';
import React from 'react';
import styled from 'styled-components';
import useCopyLayer from '../../../hooks/useCopyLayer';
import useDeletedLayer from '../../../hooks/useDeletedLayer';
import useMergeLayer from '../../../hooks/useMergeLayer';
import useOrderLayer from '../../../hooks/useOrderLayer';
import useVisibled from '../../../hooks/useVisibled';
import { Layers } from '../../../types/Layers';

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
      key: 'Blend-mode',
      label: 'Blend mode',
      children: [
        { key: 'normal', label: 'Normal' },
        { key: 'multiply', label: 'Multiply' },
        { key: 'screen', label: 'Screen' },
        { key: 'overlay', label: 'Overlay' },
      ],
    },

    {
      key: 'Export',
      label: 'Export',
      children: [
        { key: 'export-original', label: 'Image (Original)' },
        { key: 'export-2x', label: 'Image (2x)' },
        { key: 'export-4x', label: 'Image (4x)' },
        { key: 'export-8x', label: 'Image (8x)' },
      ],
    },
    {
      key: 'Filter',
      label: 'Filter',
      children: [
        { key: 'filter-blur', label: 'Blur' },
        { key: 'filter-brightness', label: 'Brightness' },
        { key: 'filter-contrast', label: 'Contrast' },
        { key: 'filter-grayscale', label: 'Grayscale' },
        { key: 'filter-hue-rotate', label: 'Hue Rotate' },
        { key: 'filter-invert', label: 'Invert' },
        { key: 'filter-saturate', label: 'Saturate' },
        { key: 'filter-sepia', label: 'Sepia' },
      ],
    },
    {
      key: 'Clear',
      label: <DangerText>Clear</DangerText>,
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
