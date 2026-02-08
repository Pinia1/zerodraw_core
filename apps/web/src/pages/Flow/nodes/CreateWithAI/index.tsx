import Icon, { LeftOutlined } from '@ant-design/icons';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Container, Icons, ToolItem } from '@zeroDraw/core';
import { Input, Menu, Tooltip } from 'antd';
import React, { memo, useMemo, useState } from 'react';
import { Header, InputRow, Title, TitleRow } from './components';
import type { MentionItem } from './components/MentionList';
import Prompt from './components/Prompt';
const MENU_ITEMS = [
  { key: 'new_view', icon: <Icon component={Icons.IconViews} />, label: 'New view' },
  { key: 'expression', icon: <Icon component={Icons.IconFace} />, label: 'Change expression' },
];

const MOCK_MENTION_ITEMS: MentionItem[] = [{ id: '1', label: 'Front view', image: '/zero.png' }];

const CreateWithAI: React.FC<NodeProps> = ({ selected }) => {
  const [menuKey, setMenuKey] = useState<(typeof MENU_ITEMS)[number]['key'] | 'prompt' | null>(
    null
  );

  const content = useMemo(() => {
    if (menuKey === 'prompt') {
      return <Prompt mentionItems={MOCK_MENTION_ITEMS} />;
    }

    switch (menuKey) {
      case 'prompt':
        return <Prompt mentionItems={MOCK_MENTION_ITEMS} />;

      default:
        return (
          <>
            <InputRow>
              <Input
                size="large"
                placeholder="Describe your changes"
                suffix={
                  <ToolItem style={{ width: 24 }}>
                    <Icon component={Icons.IconRightArrow} />
                  </ToolItem>
                }
                onClick={() => setMenuKey('prompt')}
              />
            </InputRow>

            <div
              style={{
                padding: '0 12px',
              }}
            >
              <Menu
                items={MENU_ITEMS.map((item) => ({
                  key: item.key,
                  label: item.label,
                  icon: item.icon,
                }))}
              />
            </div>
          </>
        );
    }
  }, [menuKey]);

  return (
    <Container
      style={{
        width: 280,
        borderRadius: 16,
        overflow: 'hidden',
        outline: selected ? '1px solid var(--color-primary-active)' : 'none',
        padding: 8,
        cursor: 'default',
      }}
    >
      <Header>
        <TitleRow
          style={{
            cursor: menuKey ? 'pointer' : 'default',
          }}
          onClick={() => setMenuKey(null)}
        >
          {menuKey && <LeftOutlined />}
          <Title>Modify</Title>
        </TitleRow>
        <Tooltip title="Modify lets you generatevariations with control andextract valuable assets likematerials, or different viewsfrom an already visualizedbase idea.">
          <Icon component={Icons.IconTip} />
        </Tooltip>
      </Header>

      {content}

      <Handle type="source" position={Position.Right} style={{ opacity: selected ? 1 : 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: selected ? 1 : 0 }} />
    </Container>
  );
};

export default memo(CreateWithAI);
