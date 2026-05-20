import Icon, { DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { useHover } from '@zeroDraw/common';
import { useTranslation } from 'react-i18next';
import { Flex, Popconfirm, Spin } from 'antd';
import { saveAs } from 'file-saver';
import { useRef } from 'react';
import useImage from 'use-image';
import { ActionButton, ImageCard, ImageCardMask } from '.';
import Fetch from '../../../fetch';
import useCreateLayer from '../../../hooks/useCreateLayer';
import * as Icons from '../../../icons';

const { getFileUrl } = Fetch;

interface ImageRenderProps {
  data: Awaited<ReturnType<typeof Fetch.getLibOutputs>>['list'][number];
  onClick: () => void;
  onDelete: () => void;
  onQuote?: () => void;
}
const ImageRender: React.FC<ImageRenderProps> = ({ data, onClick, onDelete, onQuote }) => {
  const { t } = useTranslation();
  const [_, loading] = useImage(`${getFileUrl('thumbnail', data.s3Key)}`);

  const ref = useRef<HTMLDivElement>(null);
  const isHover = useHover(ref);
  const { run: createLayerRun, loading: createLayerLoading } = useCreateLayer();

  const onDownload = () => {
    saveAs(`${getFileUrl('file', data.s3Key)}`);
  };

  const pushToLayer = () => {
    createLayerRun(data.s3Key, `${Fetch.apiUrl}/api/file/volc/stream/${data.s3Key}`);
  };

  return (
    <ImageCard onClick={onClick} ref={ref}>
      <Spin spinning={loading === 'loading'}>
        <img
          src={`${getFileUrl('thumbnail', data.s3Key)}`}
          alt={data.id}
          style={{
            width: '100%',
            display: 'block',
            objectFit: 'cover',
            aspectRatio: 1,
          }}
        />
      </Spin>
      <ImageCardMask $isHover={isHover}>
        <Flex gap={2}>
          {!!onQuote && (
            <ActionButton
              style={{
                width: 22,
                height: 22,
              }}
              onClick={onQuote}
              tooltip={t('lib.addToPrompt')}
            >
              <Icon component={Icons.IconStar} />
            </ActionButton>
          )}

          <ActionButton
            style={{
              width: 22,
              height: 22,
            }}
            onClick={pushToLayer}
            tooltip={t('lib.addToLayer')}
          >
            {createLayerLoading ? <LoadingOutlined /> : <Icon component={Icons.IconLayer} />}
          </ActionButton>

          <ActionButton
            style={{
              width: 22,
              height: 22,
            }}
            onClick={onDownload}
            tooltip={t('lib.download')}
          >
            <Icon component={Icons.IconDownload} />
          </ActionButton>
          <ActionButton
            style={{
              width: 22,
              height: 22,
            }}
            tooltip={t('lib.delete')}
          >
            <Popconfirm
              title={t('lib.deleteImage')}
              description={t('lib.removeFromOutput')}
              onConfirm={onDelete}
              okText={t('lib.yes')}
              cancelText={t('lib.no')}
            >
              <Icon component={DeleteOutlined as any} />
            </Popconfirm>
          </ActionButton>
        </Flex>
      </ImageCardMask>
    </ImageCard>
  );
};

export default ImageRender;
