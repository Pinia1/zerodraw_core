import {
  BoldOutlined,
  FontColorsOutlined,
  FontSizeOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { Editor } from '@tiptap/react';
import { Container, ToolItem } from '@zeroDraw/core';
import type { MenuProps } from 'antd';
import { ColorPicker, Divider, Dropdown } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

interface TextToolProps {
  editor: Editor | null;
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64];

const prevent = (e: React.MouseEvent) => e.preventDefault();

const TextTool: React.FC<TextToolProps> = ({ editor }) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const getContainer = () => toolbarRef.current || document.body;
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const update = () => forceUpdate((n) => n + 1);
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  const refocusEditor = useCallback(() => {
    requestAnimationFrame(() => editor?.commands.focus());
  }, [editor]);

  if (!editor) return null;

  const currentFontSize =
    (editor.getAttributes('textStyle').fontSize as string)?.replace('px', '') || '14';

  const currentColor = (editor.getAttributes('textStyle').color as string) || '#e0e0e0';

  const fontSizeItems: MenuProps['items'] = FONT_SIZES.map((s) => ({
    key: String(s),
    label: <span onMouseDown={prevent}>{s}px</span>,
  }));

  const handleFontSizeClick: MenuProps['onClick'] = ({ key }) => {
    (editor.chain().focus() as any).setFontSize(`${key}px`).run();
  };

  const handleColor = (color: string) => {
    (editor.chain().focus() as any).setColor(color).run();
  };

  const buttons = [
    {
      key: 'bold',
      icon: <BoldOutlined />,
      active: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      key: 'italic',
      icon: <ItalicOutlined />,
      active: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      key: 'underline',
      icon: <UnderlineOutlined />,
      active: editor.isActive('underline'),
      onClick: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      key: 'strike',
      icon: <StrikethroughOutlined />,
      active: editor.isActive('strike'),
      onClick: () => editor.chain().focus().toggleStrike().run(),
    },
    { key: 'divider1' },
    {
      key: 'bulletList',
      icon: <UnorderedListOutlined />,
      active: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: 'orderedList',
      icon: <OrderedListOutlined />,
      active: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <Toolbar ref={toolbarRef} onMouseDown={prevent}>
      <Container
        style={{
          width: 'fit-content',
          zIndex: 10,
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          height: '38px',
          padding: '4px 6px',
          overflow: 'visible',
          borderRadius: '12px',
          fontSize: 14,
        }}
      >
        <Dropdown
          menu={{
            items: fontSizeItems,
            onClick: handleFontSizeClick,
            selectedKeys: [currentFontSize],
          }}
          trigger={['click']}
          getPopupContainer={getContainer}
        >
          <ToolItem
            $active={false}
            style={{ width: 'auto', minWidth: 38, gap: 2, padding: '0 4px' }}
            onMouseDown={prevent}
          >
            <FontSizeOutlined />
            <SizeLabel>{currentFontSize}</SizeLabel>
          </ToolItem>
        </Dropdown>

        <ColorPicker
          size="small"
          value={currentColor}
          onChange={(_, hex) => handleColor(hex)}
          onOpenChange={(open) => {
            if (!open) refocusEditor();
          }}
          getPopupContainer={getContainer}
          presets={[
            {
              label: 'Presets',
              colors: [
                '#ffffff',
                '#e0e0e0',
                '#9e9e9e',
                '#616161',
                '#000000',
                '#ef5350',
                '#ff7043',
                '#ffa726',
                '#ffee58',
                '#66bb6a',
                '#42a5f5',
                '#ab47bc',
                '#ec407a',
                '#26c6da',
                '#8d6e63',
              ],
            },
          ]}
        >
          <ToolItem $active={false} style={{ width: 32, minWidth: 32 }} onMouseDown={prevent}>
            <FontColorsOutlined style={{ color: currentColor }} />
          </ToolItem>
        </ColorPicker>

        <Divider style={{ height: '60%' }} type="vertical" />

        {buttons.map((btn) =>
          btn.key.startsWith('divider') ? (
            <Divider key={btn.key} style={{ height: '60%' }} type="vertical" />
          ) : (
            <ToolItem
              key={btn.key}
              $active={btn.active}
              onMouseDown={prevent}
              onClick={btn.onClick}
              style={{ width: 32, minWidth: 32 }}
            >
              {btn.icon}
            </ToolItem>
          )
        )}
      </Container>
    </Toolbar>
  );
};

export default React.memo(TextTool);

const Toolbar = styled.div`
  position: relative;
`;

const SizeLabel = styled.span`
  font-size: 12px;
  min-width: 16px;
  text-align: center;
`;
