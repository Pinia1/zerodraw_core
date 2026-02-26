import { type MentionItem } from '@/pages/Flow/nodes/CreateWithAI/components/MentionList';
import Color from '@tiptap/extension-color';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Container } from '@zeroDraw/core';
import { forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';

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
  /** 设置聚焦 */
  setFocus: React.Dispatch<React.SetStateAction<boolean>>;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

export interface PromptEditorRef {
  /** 清空编辑器 */
  clear: () => void;
  /** 聚焦 */
  focus: () => void;
  /** 获取当前值 */
  getValue: () => EditorValue;
  /** tiptap editor 实例 */
  editor: ReturnType<typeof useEditor>;
}

const PromptEditor = forwardRef<PromptEditorRef, PromptEditorProps>(
  ({ onChange, placeholder = 'Add Text', autoFocus = true, setFocus, style }, ref) => {
    const editor = useEditor({
      autofocus: autoFocus ? 'end' : false,
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        TextStyle as any,
        Color as any,
        Underline as any,
        Placeholder.configure({ placeholder }),
        Mention.configure({
          HTMLAttributes: { class: 'mention' },
        }),
      ],
      editorProps: {
        attributes: { class: 'prompt-editor' },
      },
      onUpdate: ({ editor: e }) => {
        onChange?.({
          text: e.getText(),
          mentions: [],
        });
      },
      onFocus: () => setFocus(true),
      onBlur: () => setFocus(false),
    });

    const getValue = (): EditorValue => ({
      text: editor?.getText().trim() ?? '',
      mentions: [],
    });

    const clear = () => {
      editor?.commands.clearContent();
    };

    const focus = () => {
      editor?.commands.focus('end');
    };

    useImperativeHandle(ref, () => ({ clear, focus, getValue, editor }));

    return (
      <Container style={{ background: 'transparent' }}>
        <EditorArea style={style}>
          <EditorContent editor={editor} />
        </EditorArea>
      </Container>
    );
  }
);

PromptEditor.displayName = 'PromptEditor';

export default PromptEditor;

const EditorArea = styled.div`
  flex: 1;
  padding: 3px;

  .tiptap {
    width: 100%;
    height: 100%;
  }

  .prompt-editor {
    outline: none;
    font-size: 14px;
    line-height: 1.6;
    color: var(--container-color, #e0e0e0);
    min-height: 30px;
    p {
      margin: 0;
      width: 100%;
    }

    /* placeholder */
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: #666;
      pointer-events: none;
      height: 0;
    }

    /* @ mention 标签 */
    .mention {
      background: rgba(91, 75, 213, 0.2);
      color: #a78bfa;
      border-radius: 4px;
      padding: 1px 4px;
      font-weight: 500;
      box-decoration-break: clone;
    }
  }
`;
