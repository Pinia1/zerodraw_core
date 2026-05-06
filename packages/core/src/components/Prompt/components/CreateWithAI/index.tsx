import { NanobananaGenerateParams } from '@zeroDraw/api-contract';
import { useMemoizedFn, useRequest } from '@zeroDraw/common';
import { Form, Select } from 'antd';
import { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import { MOSIC_LAYER_ID } from '../../../../Drawing/components/Mosic';
import { THUMBNAIL_LAYER_ID } from '../../../../Drawing/components/Thumbnail';
import Fetch from '../../../../fetch';
import { useDrawingStore } from '../../../../store/useDrawing';
import useLayerStore from '../../../../store/useLayer';
import useThumbnailStore from '../../../../store/useThumbnail';
import { exportStageWithBlendModes } from '../../../../utils/BlendMode';
import { WIDTH } from '../../../../utils/drawing';
import PromptEditor, { type PromptEditorRef } from '../../../Compile';
import { MentionItem } from '../../../Compile/MentionList';
import type { LibRef as LibRefType } from '../../../Lib';
import History from '../../../Lib';
import { getArOptions, getImageAspectRatio, getSizeOptions, sizeMap } from './config';

const nanobananaGenerate = Fetch.nanobananaGenerate;
type ModelType = NanobananaGenerateParams['args']['model'];

const CreateWithAI = () => {
  const paramsSearch = new URLSearchParams(window.location.search);
  const projectId = paramsSearch.get('projectId') ?? '';
  const [loading, setLoading] = useState(false);
  const { layers } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
    }))
  );

  const { stageRef, layerConfig, stageConfig } = useDrawingStore(
    useShallow((state) => ({
      stageRef: state.stageRef,
      layerConfig: state.layerConfig,
      stageConfig: state.stageConfig,
    }))
  );

  const thumbnails = useThumbnailStore((state) => state.thumbnails);
  const libRef = useRef<LibRefType>(null);
  const editorRef = useRef<PromptEditorRef>(null);

  const [form] = Form.useForm();
  const model = Form.useWatch('model', form) as ModelType;

  const { run: generate } = useRequest(nanobananaGenerate, {
    manual: true,
    onSuccess: (data) => {
      const { taskId } = data;
      libRef.current?.addTask(taskId);
    },
    onFinally() {
      setLoading(false);
    },
  });

  const sizeOptions = useMemo(() => getSizeOptions(model), [model]);
  const arOptiong = useMemo(
    () => getArOptions(model).map((i) => ({ label: i, value: i })),
    [model]
  );

  const captureLayerBlob = useMemoizedFn((layerId: string): Promise<Blob | null> => {
    const stage = stageRef?.current;
    if (!stage || !layerConfig.width || !layerConfig.height) return Promise.resolve(null);

    const konvaLayer = stage
      .getLayers()
      .find(
        (l) =>
          l.attrs?.id === layerId &&
          l.attrs?.id !== THUMBNAIL_LAYER_ID &&
          l.attrs?.id !== MOSIC_LAYER_ID
      );
    if (!konvaLayer) return Promise.resolve(null);

    const scale = stageConfig.scale;
    const screenX = layerConfig.x * scale + stageConfig.x;
    const screenY = layerConfig.y * scale + stageConfig.y;
    const screenW = layerConfig.width * scale;
    const screenH = layerConfig.height * scale;
    const pixelRatio = WIDTH / layerConfig.width / scale;

    return konvaLayer.toBlob({
      x: screenX,
      y: screenY,
      width: screenW,
      height: screenH,
      pixelRatio,
      mimeType: 'image/png',
    }) as Promise<Blob | null>;
  });

  const handleSubmit = useMemoizedFn(async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const images = editorRef.current?.getValue();
      const mentions = images?.mentions ?? [];

      const resolvedMentions = await Promise.all(
        mentions.map(async (mention) => {
          if (mention.s3Key) return mention;
          try {
            if (mention.type === 'layer') {
              const blob = await captureLayerBlob(mention.id);
              if (blob) {
                const file = new File([blob], `layer-${mention.id}.png`, { type: 'image/png' });
                const formData = new FormData();
                formData.append('file', file);
                const s3Key = await Fetch.httpUploadImage(formData);
                return { ...mention, s3Key };
              }
              const originalSrc = layers.find((l) => l.id === mention.id)?.image?.src;
              const fallbackUrl = originalSrc || mention.url;
              if (fallbackUrl) {
                const res = await fetch(fallbackUrl);
                const srcBlob = await res.blob();
                const bitmap = await createImageBitmap(srcBlob);
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
                const pngBlob = await new Promise<Blob>((resolve) =>
                  canvas.toBlob((b) => resolve(b!), 'image/png')
                );
                const file = new File([pngBlob], `layer-${mention.id}.png`, { type: 'image/png' });
                const formData = new FormData();
                formData.append('file', file);
                const s3Key = await Fetch.httpUploadImage(formData);
                return { ...mention, s3Key };
              }
            }

            if (mention.type === 'stage' && mention.url) {
              const stage = stageRef?.current;
              if (stage && layerConfig.width && layerConfig.height) {
                const dataUrl = await exportStageWithBlendModes(stage, layers, {
                  applyStageTransform: false,
                  cropX: layerConfig.x,
                  cropY: layerConfig.y,
                  cropWidth: layerConfig.width,
                  cropHeight: layerConfig.height,
                  targetWidth: WIDTH,
                  backgroundColor: layerConfig.backgroundVisible
                    ? layerConfig.backgroundColor
                    : 'transparent',
                  mimeType: 'image/png',
                });
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], 'stage.png', { type: 'image/png' });
                const formData = new FormData();
                formData.append('file', file);
                const s3Key = await Fetch.httpUploadImage(formData);
                return { ...mention, s3Key };
              }
            }

            return mention;
          } catch {
            return mention;
          }
        })
      );

      const s3Keys = resolvedMentions.map((i) => i.s3Key).filter((i) => i !== undefined);
      const aspectRatio = getImageAspectRatio(model, values.imageSize, values.aspectRatio);

      generate({
        action: 'GRAAI_NANO_BANANA',
        s3Key: s3Keys,
        args: {
          model: values.model,
          prompt: values.prompt.text,
          aspectRatio: aspectRatio,
          imageSize: values.imageSize,
          projectId: projectId,
        },
      });
    } catch (e) {
      setLoading(false);
    }
  });

  const handleModelChange = (model: ModelType) => {
    const imageSize = form.getFieldValue('imageSize');
    const aspectRatio = form.getFieldValue('aspectRatio');
    const nextOptions = getSizeOptions(model);
    if (!nextOptions.find((i) => i.value === imageSize)) {
      form.setFieldValue('imageSize', nextOptions[0].value);
    }
    const nextAr = getArOptions(model);
    if (!nextAr.find((i) => i === aspectRatio)) {
      form.setFieldValue('aspectRatio', nextAr[0]);
    }
  };

  const layersItems = useMemo(() => {
    return layers.map((layer) => ({
      id: layer.id,
      label: layer.name,
      url: thumbnails[layer.id],
      type: 'layer' as const,
    })) as MentionItem[];
  }, [layers, thumbnails]);

  const handleQuote = useMemoizedFn((e: LibOutput) => {
    editorRef.current?.setMentionedList((pre) => [
      ...pre,
      {
        id: e.id,
        label: e.args?.prompt ?? '',
        url: '',
        s3Key: e.s3Key,
        type: 'generated' as const,
      },
    ]);
  });

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
        layout="vertical"
        colon={false}
      >
        <FormItem name="prompt" rules={[{ required: true, message: 'Please enter a prompt' }]}>
          <PromptEditor
            placeholder="What are you creating?"
            autoFocus={false}
            mentionItems={layersItems}
            onSubmit={handleSubmit}
            loading={loading}
            ref={editorRef}
          />
        </FormItem>
        <FormItem label={<FormLabel>Model</FormLabel>} name="model">
          <Select
            onChange={handleModelChange}
            options={Object.keys(sizeMap).map((i) => ({ label: i, value: i }))}
          />
        </FormItem>
        <FormItem label={<FormLabel>Aspect Ratio</FormLabel>} name="aspectRatio">
          <Select options={arOptiong} />
        </FormItem>
        <FormItem label={<FormLabel>Image Size</FormLabel>} name="imageSize">
          <Select options={sizeOptions} />
        </FormItem>
      </Form>
      <History handleQuote={handleQuote} ref={libRef} projectId={projectId} />
    </div>
  );
};

export default CreateWithAI;

const FormLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: var(--container-color, #e0e0e0);
`;

const FormItem = styled(Form.Item)`
  margin-bottom: 4px;
`;
