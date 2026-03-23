import { useMemoizedFn, useRequest } from '@zeroDraw/common';
import { Form, Select } from 'antd';
import { useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import Fetch from '../../../../fetch';
import useLayerStore from '../../../../store/useLayer';
import PromptEditor, { type PromptEditorRef } from '../../../Compile';
import { MentionItem } from '../../../Compile/MentionList';
import type { LibRef as LibRefType } from '../../../Lib';
import History from '../../../Lib';
import { getSizeOptions, sizeMap } from './config';

const nanobananaGenerate = Fetch.nanobananaGenerate;
const projectId = '1';

const CreateWithAI = () => {
  const { layers } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
    }))
  );

  const libRef = useRef<LibRefType>(null);
  const editorRef = useRef<PromptEditorRef>(null);

  const [form] = Form.useForm();
  const model = Form.useWatch('model', form);

  const { run: generate, loading } = useRequest(nanobananaGenerate, {
    manual: true,
    onSuccess: (data) => {
      const { taskId } = data;
      libRef.current?.addTask(taskId);
    },
  });

  const sizeOptions = useMemo(() => getSizeOptions(model), [model]);

  const handleSubmit = useMemoizedFn(() => {
    form.validateFields().then((values) => {
      generate({
        action: 'GRAAI_NANO_BANANA',
        args: {
          model: values.model,
          prompt: values.prompt.text,
          aspectRatio: values.aspectRatio,
          imageSize: values.imageSize,
          projectId: projectId,
        },
      });
    });
  });

  const handleModelChange = (value: string) => {
    const imageSize = form.getFieldValue('imageSize');
    const nextOptions = getSizeOptions(value);
    if (!nextOptions.find((i) => i.value === imageSize)) {
      form.setFieldValue('imageSize', nextOptions[0].value);
    }
  };

  const layersItems = useMemo(() => {
    return layers.map((layer) => ({
      id: layer.id,
      label: layer.name,
    })) as MentionItem[];
  }, [layers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Form
        initialValues={{
          prompt: '',
          model: Object.keys(sizeMap)[0],
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
            onSubmit={handleSubmit}
            loading={loading}
          />
        </Form.Item>
        <Form.Item label={<FormLabel>Model</FormLabel>} name="model" style={{ marginBottom: 12 }}>
          <Select
            onChange={handleModelChange}
            options={Object.keys(sizeMap).map((i) => ({ label: i, value: i }))}
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
      <History ref={libRef} projectId={projectId} />
    </div>
  );
};

export default CreateWithAI;

const FormLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: var(--container-color, #e0e0e0);
`;
