import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions } from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import MentionList, { type MentionItem, type MentionListRef } from './MentionList';

export type { MentionItem };

export const createMentionSuggestion = (
  getItems: () => MentionItem[],
  onSelect?: (item: MentionItem) => void
): Omit<SuggestionOptions<MentionItem>, 'editor'> => ({
  items: ({ query }) => {
    const all = getItems();
    if (!query) return all;
    return all.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  },

  command: ({ editor, range, props }) => {
    // 只删掉 @query 文本，不插入 mention 节点，条目通过 onSelect 推入图片栏
    editor.chain().focus().deleteRange(range).run();

    const item = getItems().find((i) => i.id === props.id);
    if (item) onSelect?.(item);
  },

  render: () => {
    let component: ReactRenderer<MentionListRef> | null = null;
    let popup: TippyInstance[] | null = null;

    return {
      onStart: (props) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          offset: [0, 4],
        });
      },

      onUpdate: (props) => {
        component?.updateProps(props);
        if (!props.clientRect) return;
        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown: (props) => {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit: () => {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
});
