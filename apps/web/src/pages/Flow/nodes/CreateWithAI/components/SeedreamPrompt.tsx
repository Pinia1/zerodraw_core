import { useMemoizedFn } from '@zeroDraw/common';
import { Form, InputNumber } from 'antd';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PromptEditor, { type MentionItem, type PromptEditorRef } from './Editor';
import { FormLabel } from './index';
import Size from './Size';

interface PromptProps {
  /** 可 @ 引用的列表 */
  mentionItems?: MentionItem[];
  /** 提交回调 */
  onSubmit?: (values: any) => void;
}

const Prompt: React.FC<PromptProps> = ({ mentionItems = [], onSubmit }) => {
  const { t } = useTranslation();
  const editorRef = useRef<PromptEditorRef>(null);
  const [form] = Form.useForm();

  const handleSubmit = useMemoizedFn(() => {
    form.validateFields().then((values) => {
      onSubmit?.(values);
    });
  });
  return (
    <div className="nodrag" style={{ padding: 12 }}>
      <Form form={form} onFinish={onSubmit} layout="vertical">
        <Form.Item
          name="prompt"
          style={{ marginBottom: 12 }}
          rules={[{ required: true, message: t('flow.promptRequired') }]}
        >
          <PromptEditor ref={editorRef} mentionItems={mentionItems} onSubmit={handleSubmit} />
        </Form.Item>
        <Form.Item
          name="size"
          style={{ marginBottom: 12 }}
          rules={[{ required: true, message: t('flow.sizeRequired') }]}
        >
          <Size />
        </Form.Item>
        <Form.Item name="seed" label={<FormLabel>{t('flow.seed')}</FormLabel>} style={{ marginBottom: 0 }}>
          <InputNumber style={{ width: '100%' }} placeholder={t('flow.seedPlaceholder')} />
        </Form.Item>
      </Form>
    </div>
  );
};

export default React.memo(Prompt);
