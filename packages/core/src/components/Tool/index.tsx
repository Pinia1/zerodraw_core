import Icon from '@ant-design/icons';
import { Divider, Popover } from 'antd';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import {
  IconAdd,
  IconColor,
  IconEraser,
  IconLasso,
  IconPen,
  IconPoint,
  IconRect,
  IconRedo,
  IconUndo,
} from '../../icons';
import useToolsStore from '../../store/useTools';
import { Actions, ToolTypes } from '../../types/Drawing';
import Container from '../Container';
import EarserConf from './components/EarserConf';
import LassoConf from './components/LassoConf';
import PenConf from './components/PenConf';
import RectConf from './components/RectConf';

const FloatingStyle: React.CSSProperties = {
  backgroundColor: 'var(--container-bg)',
  color: 'var(--container-color)',
  boxShadow: 'var(--container-box-shadow)',
  position: 'fixed',
  width: 'fit-content',
  top: '1rem',
  left: '0px',
  right: '0px',
  margin: '0 auto',
  zIndex: '10',
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  height: '48px',
  padding: '8px',
  overflow: 'hidden',
  borderRadius: '16px',
};

export const ToolItem = styled.div<{ $active: boolean }>`
  background-color: ${({ $active }) =>
    $active ? 'var(--container-active) !important' : 'transparent'};

  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 100%;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  position: relative;

  &:hover {
    background-color: var(--container-hover-bg);
  }
`;

const Tool: React.FC = () => {
  const [open, setOpen] = useState(true);
  const { activeKey, setActiveKey } = useToolsStore(
    useShallow((state) => {
      return {
        activeKey: state.activeKey,
        setActiveKey: state.setActiveKey,
      };
    })
  );
  const toolMenus: {
    key: Actions;
    icon?: React.ReactNode;
    type: ToolTypes;
    onClick?: (item: (typeof toolMenus)[0]) => Promise<void> | void;
    dropdown?: React.ReactNode;
    isActive?: boolean;
    dropdownKeys?: Actions[];
  }[] = useMemo(() => {
    return [
      {
        key: Actions.ADD,
        icon: <Icon component={IconAdd} />,
        type: ToolTypes.ACTION,
        onClick: () => {},
      },
      {
        key: Actions.None,
        icon: <Icon component={IconAdd} />,
        type: ToolTypes.DIVIDER,
      },
      {
        key: Actions.ROPE,
        icon: <Icon component={IconPoint} />,
        type: ToolTypes.STATE,
        get isActive(): boolean {
          return activeKey === Actions.ROPE;
        },
      },
      {
        key: Actions.PEN,
        icon: <Icon component={IconPen} />,
        type: ToolTypes.STATE,
        dropdown: <PenConf />,
        dropdownKeys: [Actions.PEN, Actions.FILL],
        onClick: () => {},
        get isActive(): boolean {
          return [Actions.PEN, Actions.FILL].includes(activeKey);
        },
      },
      {
        key: Actions.ERASER,
        icon: <Icon component={IconEraser} />,
        type: ToolTypes.STATE,
        dropdown: <EarserConf />,
        dropdownKeys: [Actions.ERASER],
        get isActive(): boolean {
          return activeKey === Actions.ERASER;
        },
      },
      {
        key: Actions.COLOR,
        icon: <IconColor />,
        type: ToolTypes.ACTION,
        onClick: () => {},
        get isActive(): boolean {
          return activeKey === Actions.COLOR;
        },
      },
      {
        key: Actions.RECT,
        icon: <Icon component={IconRect} />,
        type: ToolTypes.STATE,
        dropdown: <RectConf />,
        dropdownKeys: [Actions.RECT, Actions.ELLIPSE, Actions.LINE],
        get isActive(): boolean {
          return [Actions.RECT, Actions.ELLIPSE, Actions.LINE].includes(activeKey);
        },
      },

      {
        key: Actions.LASSO,
        icon: <Icon component={IconLasso} />,
        type: ToolTypes.STATE,
        dropdown: <LassoConf />,
        dropdownKeys: [Actions.LASSO],
        get isActive(): boolean {
          return activeKey === Actions.LASSO;
        },
      },
      {
        key: Actions.None,
        icon: <Icon component={IconAdd} />,
        type: ToolTypes.DIVIDER,
      },
      {
        key: Actions.None,
        icon: <Icon component={IconUndo} />,
        type: ToolTypes.ACTION,
        onClick: () => {},
      },
      {
        key: Actions.None,
        icon: <Icon component={IconRedo} />,
        type: ToolTypes.ACTION,
        onClick: () => {},
      },
    ];
  }, [activeKey]);

  const handleSetActiveKey = async (item: (typeof toolMenus)[0]) => {
    await item.onClick?.(item);
    if (item.type !== ToolTypes.STATE) return;
    setActiveKey(item.key);
    if (!item.dropdown) return;
    setOpen((prev) => (item.key === activeKey ? !prev : true));
  };

  const PopoverContent = useMemo(() => {
    const item = toolMenus.find((item) => item.dropdownKeys?.includes(activeKey));
    return item?.dropdown;
  }, [activeKey]);

  return (
    <Popover
      arrow={false}
      trigger="click"
      content={PopoverContent}
      open={PopoverContent ? open : false}
      styles={{
        body: {
          padding: 4,
        },
      }}
    >
      <Container style={FloatingStyle}>
        {toolMenus.map((item, idx) => {
          const key = `${item.key}+${idx}`;
          if (item.type === ToolTypes.DIVIDER) {
            return <Divider key={key} style={{ height: '60%' }} type="vertical" />;
          }
          return (
            <ToolItem onClick={() => handleSetActiveKey(item)} $active={!!item.isActive} key={key}>
              {item.icon}
            </ToolItem>
          );
        })}
      </Container>
    </Popover>
  );
};

export default React.memo(Tool);
