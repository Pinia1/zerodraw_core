import { useMemoizedFn } from '@zeroDraw/common';
import { Form, Select } from 'antd';
import React, { useMemo, useRef } from 'react';
import PromptEditor, { type MentionItem, type PromptEditorRef } from './Editor';
import { FormItem, FormLabel } from './index';

interface PromptProps {
  /** 可 @ 引用的列表 */
  mentionItems?: MentionItem[];
  /** 提交回调 */
  onSubmit?: (values: any) => void;
}

const Prompt: React.FC<PromptProps> = ({ mentionItems = [], onSubmit }) => {
  const editorRef = useRef<PromptEditorRef>(null);

  const [form] = Form.useForm();
  const model = Form.useWatch('model', form);

  const sizeOptions = useMemo(() => {
    const opt = [
      {
        label: '1K',
        value: '1K',
      },
      {
        label: '2K',
        value: '2K',
      },
      {
        label: '4K',
        value: '4K',
      },
    ];

    if (model === 'nano-banana-2') {
      opt.unshift({
        label: '512px',
        value: '512px',
      });
    }

    return opt;
  }, [model]);

  const handleSubmit = useMemoizedFn(() => {
    form.validateFields().then((values) => {
      onSubmit?.(values);
    });
  });

  return (
    <div className="nodrag" style={{ padding: 12 }}>
      <Form
        initialValues={{
          prompt: '',
          model: 'nano-banana',
          aspectRatio: 'auto',
          imageSize: '1K',
        }}
        form={form}
        onFinish={onSubmit}
        layout="vertical"
        colon={false}
      >
        <FormItem name="prompt" rules={[{ required: true, message: 'Please enter a prompt' }]}>
          <PromptEditor ref={editorRef} mentionItems={mentionItems} onSubmit={handleSubmit} />
        </FormItem>
        <FormItem label={<FormLabel>Model</FormLabel>} name="model" style={{ marginBottom: 12 }}>
          <Select
            options={[
              {
                label: 'nano-banana',
                value: 'nano-banana',
              },
              {
                label: 'nano-banana-2',
                value: 'nano-banana-2',
              },
              {
                label: 'nano-banana-pro',
                value: 'nano-banana-pro',
              },
            ]}
          />
        </FormItem>
        <FormItem label={<FormLabel>Aspect Ratio</FormLabel>} name="aspectRatio">
          <Select
            options={[
              {
                label: 'auto',
                value: 'auto',
              },
              {
                label: '1:1',
                value: '1:1',
              },
              {
                label: '16:9',
                value: '16:9',
              },
              {
                label: '9:16',
                value: '9:16',
              },
              {
                label: '4:3',
                value: '4:3',
              },
              {
                label: '3:4',
                value: '3:4',
              },
              {
                label: '3:2',
                value: '3:2',
              },
              {
                label: '2:3',
                value: '2:3',
              },
              {
                label: '5:4',
                value: '5:4',
              },
              {
                label: '4:5',
                value: '4:5',
              },
              {
                label: '21:9',
                value: '21:9',
              },
            ]}
          />
        </FormItem>
        <FormItem label={<FormLabel>Image Size</FormLabel>} name="imageSize">
          <Select options={sizeOptions} />
        </FormItem>
      </Form>
    </div>
  );
};

export default React.memo(Prompt);
