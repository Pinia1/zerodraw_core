import { httpGetLibOutputs } from '@/services/generate';
import { apiUrl, thumbnailUrl } from '@/utils';
import Icon, { DeleteOutlined } from '@ant-design/icons';
import { useHover } from '@zeroDraw/common';
import { Icons } from '@zeroDraw/core';
import { Flex, Popconfirm, Spin } from 'antd';
import { useRef } from 'react';
import useImage from 'use-image';
import { ActionButton, ImageCard, ImageCardMask } from '.';

interface ImageRenderProps {
  data: Awaited<ReturnType<typeof httpGetLibOutputs>>['list'][number];
  onClick: () => void;
  onDelete: () => void;
}
const ImageRender: React.FC<ImageRenderProps> = ({ data, onClick, onDelete }) => {
  const sizeStr = data.args?.size as string | undefined;
  const [w, h] = sizeStr?.split('x').map(Number) ?? [];
  const [_, loading] = useImage(`${apiUrl}${thumbnailUrl}/${data.s3Key}`);

  const ref = useRef<HTMLDivElement>(null);
  const isHover = useHover(ref);

  return (
    <ImageCard onClick={onClick} ref={ref}>
      <Spin spinning={loading === 'loading'}>
        <img
          src={`${apiUrl}${thumbnailUrl}/${data.s3Key}`}
          alt={data.id}
          style={{
            width: '100%',
            display: 'block',
            aspectRatio: w && h ? `${w} / ${h}` : undefined,
          }}
        />
      </Spin>
      <ImageCardMask $isHover={isHover}>
        <Flex gap={4}>
          <ActionButton tooltip="Edit">
            <Icon component={Icons.IconEdit} />
          </ActionButton>
          <ActionButton tooltip="Download">
            <Icon component={Icons.IconDownload} />
          </ActionButton>
          <ActionButton tooltip="Favorite">
            <Icon component={Icons.IconStar} />
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
