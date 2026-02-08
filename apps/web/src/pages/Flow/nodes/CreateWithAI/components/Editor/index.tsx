import { ArrowRightOutlined, CloseOutlined, RedoOutlined } from '@ant-design/icons';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMemoizedFn } from '@zeroDraw/common';
import React, { useImperativeHandle, forwardRef, useMemo, useState } from 'react';
import {
  Badge,
  EditorArea,
  MentionedImages,
  MentionedThumb,
  RemoveButton,
  SubmitBtn,
  Toolbar,
  ToolButton,
  ToolGroup,
  Wrapper,
} from '../index';
import { createMentionSuggestion, type MentionItem } from '../mentionSuggestion';

export type { MentionItem };

export interface EditorValue {
  /** 纯文本内容 */
  text: string;
  /** 被 @ 引用的条目 */
  mentions: MentionItem[];
}

export interface PromptEditorProps {
  /** 可 @ 引用的数据源 */
  mentionItems?: MentionItem[];
  /** 内容变化回调 */
  onChange?: (value: EditorValue) => void;
  /** 提交回调（Enter） */
  onSubmit?: (value: EditorValue) => void;
  /** placeholder */
  placeholder?: string;
  /** 自动聚焦 */
  autoFocus?: boolean;
}

export interface PromptEditorRef {
  /** 清空编辑器 */
  clear: () => void;
  /** 聚焦 */
  focus: () => void;
  /** 获取当前值 */
  getValue: () => EditorValue;
}

const PromptEditor = forwardRef<PromptEditorRef, PromptEditorProps>(
  (
    {
      mentionItems = [],
      onChange,
      onSubmit,
      placeholder = 'Describe your changes...',
      autoFocus = true,
    },
    ref,
  ) => {
    const [mentionedList, setMentionedList] = useState<MentionItem[]>([]);

    const handleMentionSelect = useMemoizedFn((item: MentionItem) => {
      setMentionedList((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        return [...prev, item];
      });
    });

    const suggestion = useMemo(
      () => createMentionSuggestion(() => mentionItems, handleMentionSelect),
      [mentionItems],
    );

    const editor = useEditor({
      autofocus: autoFocus ? 'end' : false,
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Placeholder.configure({ placeholder }),
        Mention.configure({
          HTMLAttributes: { class: 'mention' },
          suggestion,
        }),
      ],
      editorProps: {
        attributes: { class: 'prompt-editor' },
      },
      onUpdate: ({ editor: e }) => {
        onChange?.({
          text: e.getText(),
          mentions: mentionedList,
        });
      },
    });

    const getValue = (): EditorValue => ({
      text: editor?.getText().trim() ?? '',
      mentions: mentionedList,
    });

    const clear = () => {
      editor?.commands.clearContent();
      setMentionedList([]);
    };

    const focus = () => {
      editor?.commands.focus('end');
    };

    useImperativeHandle(ref, () => ({ clear, focus, getValue }));

    const removeMention = useMemoizedFn((id: string) => {
      setMentionedList((prev) => prev.filter((i) => i.id !== id));
      if (!editor) return;
      const { doc } = editor.state;
      let { tr } = editor.state;
      const positions: { from: number; to: number }[] = [];
      doc.descendants((node, pos) => {
        if (node.type.name === 'mention' && node.attrs.id === id) {
          positions.push({ from: pos, to: pos + node.nodeSize });
        }
      });
      positions.reverse().forEach(({ from, to }) => {
        tr = tr.delete(from, to);
      });
      editor.view.dispatch(tr);
    });

    const handleSubmit = () => {
      const val = getValue();
      if (!val.text) return;
      onSubmit?.(val);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    return (
      <Wrapper onKeyDown={handleKeyDown} className="nodrag">
        {/* 被 @ 引用的图片预览 */}
        {mentionedList.length > 0 && (
          <MentionedImages>
            {mentionedList.map((item, idx) => (
              <MentionedThumb key={item.id}>
                <img src={item.image} alt={item.label} draggable={false} />
                <Badge>{idx + 1}</Badge>
                <RemoveButton onClick={() => removeMention(item.id)}>
                  <CloseOutlined style={{ fontSize: 8 }} />
                </RemoveButton>
              </MentionedThumb>
            ))}
          </MentionedImages>
        )}

        {/* 编辑区 */}
        <EditorArea>
          <EditorContent editor={editor} />
        </EditorArea>

        {/* 工具栏 */}
        <Toolbar>
          <ToolGroup>
            <ToolButton onClick={clear}>
              <RedoOutlined />
            </ToolButton>
          </ToolGroup>
          <SubmitBtn onClick={handleSubmit}>
            <ArrowRightOutlined />
          </SubmitBtn>
        </Toolbar>
      </Wrapper>
    );
  },
);

PromptEditor.displayName = 'PromptEditor';

export default PromptEditor;
