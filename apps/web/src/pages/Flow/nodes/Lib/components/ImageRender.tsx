import { httpGetLibOutputs } from '@/services/generate';
import { apiUrl, thumbnailUrl } from '@/utils';
import { Spin } from 'antd';
import { memo } from 'react';
import useImage from 'use-image';
import { ImageCard } from '.';

interface ImageRenderProps {
  data: Awaited<ReturnType<typeof httpGetLibOutputs>>['list'][number];
  onClick: () => void;
}
const ImageRender: React.FC<ImageRenderProps> = ({ data, onClick }) => {
  const sizeStr = data.args?.size as string | undefined;
  const [w, h] = sizeStr?.split('x').map(Number) ?? [];
  const [_, loading] = useImage(`${apiUrl}${thumbnailUrl}/${data.s3Key}`);

  return (
    <ImageCard onClick={onClick}>
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
    </ImageCard>
  );
};

export default memo(ImageRender);
