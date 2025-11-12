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
import ActionConf from './components/ActionConf';

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

  &:hover {
    background-color: var(--container-hover-bg);
  }
`;

const Tool: React.FC = () => {
  const [open, setOpen] = useState(false);
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
  }[] = [
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
    },
    {
      key: Actions.PEN,
      icon: <Icon component={IconPen} />,
      type: ToolTypes.STATE,
      dropdown: <ActionConf />,
      onClick: () => {},
    },
    {
      key: Actions.ERASER,
      icon: <Icon component={IconEraser} />,
      type: ToolTypes.STATE,
      dropdown: <div>ERASER</div>,
    },
    {
      key: Actions.COLOR,
      icon: <IconColor fillColor="#000" />,
      type: ToolTypes.ACTION,
      onClick: () => {},
    },
    {
      key: Actions.GRAPH,
      icon: <Icon component={IconRect} />,
      type: ToolTypes.STATE,
      dropdown: <div>GRAPH</div>,
    },
    // {
    //   key: Actions.GRAPH,
    //   icon: <Icon component={IconElli} />,
    //   type: ToolTypes.STATE,
    // },
    // {
    //   key: Actions.GRAPH,
    //   icon: <Icon component={IconLine} />,
    //   type: ToolTypes.STATE,
    // },
    {
      key: Actions.LASSO,
      icon: <Icon component={IconLasso} />,
      type: ToolTypes.STATE,
      dropdown: <div>LASSO</div>,
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

  const handleSetActiveKey = async (item: (typeof toolMenus)[0]) => {
    await item.onClick?.(item);
    if (item.type !== ToolTypes.STATE) return;
    setActiveKey(item.key);
    if (!item.dropdown) return;
    setOpen((prev) => (item.key === activeKey ? !prev : true));
  };

  const PopoverContent = useMemo(() => {
    const item = toolMenus.find((item) => item.key === activeKey);
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
          if (item.type === ToolTypes.DIVIDER)
            return <Divider key={key} style={{ height: '60%' }} type="vertical" />;
          return (
            <ToolItem
              onClick={() => handleSetActiveKey(item)}
              $active={item.key === activeKey}
              key={key}
            >
              {item.icon}
            </ToolItem>
          );
        })}
      </Container>
    </Popover>
  );
};

export default React.memo(Tool);
