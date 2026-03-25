import {
  ArrowRightOutlined,
  CloseOutlined,
  LoadingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMemoizedFn } from '@zeroDraw/common';
import { Tooltip } from 'antd';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import styled from 'styled-components';
import Fetch from '../../fetch';
import { MentionItem } from './MentionList';
import { createMentionSuggestion } from './mentionSuggestion';

const thumbnailUrl = Fetch.apiUrl + Fetch.thumbnailUrl;

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
  loading?: boolean;
}

export interface PromptEditorRef {
  /** 清空编辑器 */
  clear: () => void;
  /** 聚焦 */
  focus: () => void;
  /** 获取当前值 */
  getValue: () => EditorValue;
  /** 设置被 @ 引用的条目 */
  setMentionedList: React.Dispatch<React.SetStateAction<MentionItem[]>>;
}

const PromptEditor = forwardRef<PromptEditorRef, PromptEditorProps>(
  (
    {
      mentionItems = [],
      onChange,
      onSubmit,
      placeholder = 'Describe your changes...',
      autoFocus = true,
      loading = false,
    },
    ref
  ) => {
    const [mentionedList, setMentionedList] = useState<MentionItem[]>([]);

    const mentionItemsRef = useRef(mentionItems);
    mentionItemsRef.current = mentionItems;

    const handleMentionSelect = useMemoizedFn((item: MentionItem) => {
      setMentionedList((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        return [...prev, item];
      });
    });

    // 只创建一次，内部通过 ref 读取最新数据
    const [suggestion] = useState(() =>
      createMentionSuggestion(() => mentionItemsRef.current, handleMentionSelect)
    );

    const editor = useEditor({
      autofocus: autoFocus,
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
      requestAnimationFrame(focus);
    };

    const focus = () => {
      editor?.commands.focus();
    };

    const uploadImage = () => {};

    useImperativeHandle(ref, () => ({ clear, focus, getValue, setMentionedList }));

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
      if (loading) return;
      const val = getValue();
      onSubmit?.(val);
    };

    const handleEditorClick = useMemoizedFn((e: React.MouseEvent) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from !== to) return;

      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (pos) {
        editor.chain().focus().setTextSelection(pos.pos).run();
      }
    });

    return (
      <Wrapper>
        {mentionedList.length > 0 && (
          <MentionedImages>
            {mentionedList.map((item, idx) => (
              <MentionedThumb key={item.id}>
                <img src={`${thumbnailUrl}/${item.s3Key}`} alt={item.label} draggable={false} />
                <Badge>{idx + 1}</Badge>
                <RemoveButton onClick={() => removeMention(item.id)}>
                  <CloseOutlined style={{ fontSize: 8 }} />
                </RemoveButton>
              </MentionedThumb>
            ))}
          </MentionedImages>
        )}

        <EditorArea onClick={handleEditorClick}>
          <EditorContent editor={editor} />
        </EditorArea>

        <Toolbar>
          <ToolGroup>
            <Tooltip title="Upload Image">
              <ToolButton onClick={uploadImage}>
                <PlusOutlined />
              </ToolButton>
            </Tooltip>
          </ToolGroup>
          <Tooltip title="Submit">
            <SubmitBtn onClick={handleSubmit}>
              {loading ? <LoadingOutlined /> : <ArrowRightOutlined />}
            </SubmitBtn>
          </Tooltip>
        </Toolbar>
      </Wrapper>
    );
  }
);

PromptEditor.displayName = 'PromptEditor';

export default PromptEditor;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px;
  padding-top: 12px;
  font-size: 16px;
`;

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Title = styled.span`
  font-weight: 600;
  line-height: 1;
`;

export const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 12px;
`;

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
  border-radius: 12px;
  padding: 12px;
  border: 1px solid transparent;
  transition:
    border-color 0.2s,
    background-color 0.2s;
  background: var(--color-fill-tertiary, rgba(40, 40, 42, 0.5));

  &:hover {
  }

  &:focus-within {
    border-color: var(--color-primary-active, #722ed1);
    background: var(--color-fill-tertiary, rgba(40, 40, 42, 0.8));
  }
`;

export const ImagePreview = styled.div`
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
    display: block;
  }
`;

export const RemoveButton = styled.div`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #5b4bd5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #7c6fe0;
  }
`;

export const EditorArea = styled.div`
  flex: 1;

  .prompt-editor {
    outline: none;
    font-size: 14px;
    line-height: 1.6;
    color: var(--container-color, #e0e0e0);
    height: 80px;

    overflow-y: auto;
    overflow-x: hidden;

    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.8) transparent;

    /* Webkit (Chrome, Safari, Edge) */
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.8);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.35);
    }

    p {
      margin: 0;
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

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
`;

export const ToolGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const ToolButton = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--container-color, #999);
  font-size: 16px;
  transition: background 0.2s;

  &:hover {
    background: var(--container-hover-bg, rgba(60, 60, 62, 1));
  }
`;

export const SubmitBtn = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 10px;
  background: #5b4bd5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;

  &:hover {
    background: #7c6fe0;
  }
`;

export const MentionedImages = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MentionedThumb = styled.div`
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
    display: block;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #5b4bd5;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;
