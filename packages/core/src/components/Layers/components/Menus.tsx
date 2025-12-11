import { useMediaQuery } from '@monorepo/common';
import type { GetProp, MenuProps } from 'antd';
import { Menu } from 'antd';
import React from 'react';
import styled from 'styled-components';
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

type MenuItem = GetProp<MenuProps, 'items'>[number];

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
  },
  {
    key: 'Duplicate',
    label: 'Duplicate',
  },
  {
    key: 'LocK',
    label: 'Lock / Unlock',
  },
  {
    key: 'Merge-down',
    label: 'Merge down',
  },
  {
    key: 'Merge-up',
    label: 'Merge up',
  },
  {
    key: 'Send-to-front',
    label: 'Send to front',
  },
  {
    key: 'Send-to-back',
    label: 'Send to back',
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
    key: 'Show/hide',
    label: 'Show/hide all other layers',
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
  },
];

const Menus: React.FC<MenusProps> = (props) => {
  const { setMenuOpen } = props;
  const [theme] = useMediaQuery();
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
