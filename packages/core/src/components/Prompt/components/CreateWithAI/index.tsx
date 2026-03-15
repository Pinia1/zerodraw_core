import { useMemoizedFn } from '@zeroDraw/common';
import { Form, Select } from 'antd';
import { useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore from '../../../../store/useLayer';
import PromptEditor, { type PromptEditorRef } from '../../../Compile';
import { MentionItem } from '../../../Compile/MentionList';

const CreateWithAI = () => {
  const { layers } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
    }))
  );

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
    form.validateFields().then((values) => {});
  });

  const layersItems = useMemo(() => {
    return layers.map((layer) => ({
      id: layer.id,
      label: layer.name,
    })) as MentionItem[];
  }, [layers]);

  return (
    <>
      <Form
        initialValues={{
          prompt: '',
          model: 'nano-banana',
          aspectRatio: 'auto',
          imageSize: '1K',
        }}
        form={form}
        onFinish={() => {}}
        layout="vertical"
        colon={false}
      >
        <Form.Item
          name="prompt"
          style={{ marginBottom: 12 }}
          rules={[{ required: true, message: 'Please enter a prompt' }]}
        >
          <PromptEditor
            placeholder="What are you creating?"
            autoFocus={false}
            mentionItems={layersItems}
          />
        </Form.Item>
        <Form.Item label={<FormLabel>Model</FormLabel>} name="model" style={{ marginBottom: 12 }}>
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
        </Form.Item>
        <Form.Item
          label={<FormLabel>Aspect Ratio</FormLabel>}
          name="aspectRatio"
          style={{ marginBottom: 12 }}
        >
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
        </Form.Item>
        <Form.Item
          label={<FormLabel>Image Size</FormLabel>}
          name="imageSize"
          style={{ marginBottom: 12 }}
        >
          <Select options={sizeOptions} />
        </Form.Item>
      </Form>
    </>
  );
};

export default CreateWithAI;

const FormLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: var(--container-color, #e0e0e0);
`;
