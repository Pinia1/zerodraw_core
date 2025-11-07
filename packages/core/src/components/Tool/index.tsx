import Icon from '@ant-design/icons';
import React from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import { IconPen } from '../../icons';
import useToolsStore from '../../store/useTools';
import { Actions } from '../../types/Drawing';
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
    icon: React.ReactNode;
  }[] = [
    {
      key: Actions.ADD,
      icon: <Icon component={IconPen} />,
    },
    {
      key: Actions.ROPE,
      icon: <Icon component={IconPen} />,
    },
    {
      key: Actions.PEN,
      icon: <Icon component={IconPen} />,
    },
    {
      key: Actions.ERASER,
      icon: <Icon component={IconPen} />,
    },
    {
      key: Actions.COLOR,
      icon: <Icon component={IconPen} />,
    },
    {
      key: Actions.GRAPH,
      icon: <Icon component={IconPen} />,
    },
    {
      key: Actions.LASSO,
      icon: <Icon component={IconPen} />,
    },
  ];

  const handleSetActiveKey = (key: Actions) => {
    setActiveKey(key);
  };

  return (
    <Container>
      {toolMenus.map((item) => {
        return (
          <ToolItem
            onClick={() => handleSetActiveKey(item.key)}
            $active={item.key === activeKey}
            key={item.key}
          >
            {item.icon}
          </ToolItem>
        );
      })}
    </Container>
  );
};

export default React.memo(Tool);
