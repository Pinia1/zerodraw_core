import { Form, InputNumber } from 'antd';
import React, { useRef } from 'react';
import PromptEditor, { type EditorValue, type MentionItem, type PromptEditorRef } from './Editor';
import { FormLabel } from './index';
import Size from './Size';

interface PromptProps {
  /** 可 @ 引用的列表 */
  mentionItems?: MentionItem[];
  /** 提交回调 */
  onSubmit?: (value: EditorValue) => void;
}

const Prompt: React.FC<PromptProps> = ({ mentionItems = [], onSubmit }) => {
  const editorRef = useRef<PromptEditorRef>(null);

  return (
    <div style={{ padding: 12 }}>
      <Form layout="vertical">
        <Form.Item name="prompt" style={{ marginBottom: 12 }}>
          <PromptEditor ref={editorRef} mentionItems={mentionItems} onSubmit={onSubmit} />
        </Form.Item>
        <Form.Item name="size" style={{ marginBottom: 12 }}>
          <Size />
        </Form.Item>
        <Form.Item name="seed" label={<FormLabel>Seed</FormLabel>} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder="随机 (-1)" />
        </Form.Item>
      </Form>
    </div>
  );
};

export default Prompt;
