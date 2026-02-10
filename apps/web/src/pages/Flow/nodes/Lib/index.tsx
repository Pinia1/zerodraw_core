import { httpGetLibOutputs } from '@/services/generate';
import { apiUrl, fileUrl, thumbnailUrl } from '@/utils';
import { useMemoizedFn, useRequest } from '@zeroDraw/common';
import { Image, Masonry, Spin } from 'antd';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

const Lib: React.FC = () => {
  const { data, loading } = useRequest(() => httpGetLibOutputs({ page: 1, pageSize: 100 }));
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const items = useMemo(
    () =>
      (data?.list || []).map((item) => ({
        key: item.id,
        data: item,
      })),
    [data?.list]
  );

  const handlePreview = useMemoizedFn((s3Key: string) => {
    setPreviewImage(`${apiUrl}${fileUrl}/${s3Key}`);
    setPreviewVisible(true);
  });

  const itemRender = useMemoizedFn(({ data: image }: { data: (typeof items)[0]['data'] }) => (
    <ImageCard onClick={() => handlePreview(image.s3Key)}>
      <img
        src={`${apiUrl}${thumbnailUrl}/${image.s3Key}`}
        alt={image.id}
        style={{ width: '100%', display: 'block' }}
      />
    </ImageCard>
  ));

  if (loading) {
    return (
      <Container>
        <LoadingWrapper>
          <Spin size="large" />
          <LoadingText>loading...</LoadingText>
        </LoadingWrapper>
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container>
        <EmptyWrapper>
          <EmptyText>Anyone here?</EmptyText>
        </EmptyWrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>outputs</Title>
        <Count>{items.length} outputs</Count>
      </Header>
      <Content className="nowheel nodrag">
        <Masonry columns={4} gutter={12} items={items} itemRender={itemRender} />
      </Content>

      <Image
        style={{ display: 'none' }}
        preview={{
          visible: previewVisible,
          src: previewImage,
          onVisibleChange: (visible) => setPreviewVisible(visible),
        }}
      />
    </Container>
  );
};

export default React.memo(Lib);

const Container = styled.div`
  width: 800px;
  height: 600px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
  padding-top: 0px;
`;

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 16px;
`;

const LoadingText = styled.div`
  font-size: 14px;
  color: #999;
`;

const EmptyWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

const EmptyText = styled.div`
  font-size: 14px;
  color: #999;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const Count = styled.span`
  font-size: 13px;
  color: #999;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  cursor: default;

  /* 美化滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 3px;

    &:hover {
      background: #bfbfbf;
    }
  }
`;

const ImageCard = styled.div`
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  img {
    display: block;
    width: 100%;
    height: auto;
  }
`;
