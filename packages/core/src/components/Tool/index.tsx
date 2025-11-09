import Icon from '@ant-design/icons';
import { Divider } from 'antd';
import React from 'react';
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
import C from '../Container';

const Container = styled(C)`
  background-color: var(--container-bg);
  color: var(--container-color);
  position: fixed;
  width: fit-content;
  top: 1rem;
  left: 0px;
  right: 0px;
  margin: 0 auto;
  z-index: 10;
  display: flex;
  gap: 8px;
  align-items: center;
  height: 48px;
  padding: 8px;
  overflow: hidden;
  border-radius: 16px;
  box-shadow:
    rgba(0, 0, 0, 0.25) 0px 2px 4px 0px,
    rgba(180, 180, 180, 0.25) 0px 0.5px 1px 0px inset;
`;

const ToolItem = styled.div<{ $active: boolean }>`
  background-color: ${({ $active }) => ($active ? 'var(--container-active)' : 'transparent')};

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
    onClick?: () => Promise<void> | void;
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
    },
    {
      key: Actions.ERASER,
      icon: <Icon component={IconEraser} />,
      type: ToolTypes.STATE,
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
    await item.onClick?.();
    if (item.type !== ToolTypes.STATE) return;
    setActiveKey(item.key);
  };

  return (
    <Container>
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
  );
};

export default React.memo(Tool);
