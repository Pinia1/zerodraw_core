import Icon, { DeleteOutlined } from '@ant-design/icons';
import { useHover } from '@zeroDraw/common';
import { Flex, Popconfirm, Spin } from 'antd';
import { saveAs } from 'file-saver';
import { useRef } from 'react';
import useImage from 'use-image';
import { ActionButton, ImageCard, ImageCardMask } from '.';
import Fetch from '../../../fetch';
import * as Icons from '../../../icons';

interface ImageRenderProps {
  data: Awaited<ReturnType<typeof Fetch.getLibOutputs>>['list'][number];
  onClick: () => void;
  onDelete: () => void;
  onQuote: () => void;
}
const ImageRender: React.FC<ImageRenderProps> = ({ data, onClick, onDelete, onQuote }) => {
  const [_, loading] = useImage(`${Fetch.apiUrl}${Fetch.thumbnailUrl}/${data.s3Key}`);

  const ref = useRef<HTMLDivElement>(null);
  const isHover = useHover(ref);

  const onDownload = () => {
    saveAs(`${Fetch.apiUrl}${Fetch.fileUrl}/${data.s3Key}`);
  };

  return (
    <ImageCard onClick={onClick} ref={ref}>
      <Spin spinning={loading === 'loading'}>
        <img
          src={`${Fetch.apiUrl}${Fetch.thumbnailUrl}/${data.s3Key}`}
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
        <Flex wrap gap={4}>
          <ActionButton onClick={onQuote} tooltip="Quote">
            <Icon component={Icons.IconStar} />
          </ActionButton>
          <ActionButton onClick={onDownload} tooltip="Download">
            <Icon component={Icons.IconDownload} />
          </ActionButton>
          <ActionButton tooltip="Delete">
            <Popconfirm
              title="Delete the image"
              description="Remove from the output"
              onConfirm={onDelete}
              okText="Yes"
              cancelText="No"
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
