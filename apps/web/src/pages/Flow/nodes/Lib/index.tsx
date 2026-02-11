import { httpGetLibOutputs } from '@/services/generate';
import { apiUrl, fileUrl } from '@/utils';
import type { NodeProps } from '@xyflow/react';
import { useInfiniteScroll, useMemoizedFn } from '@zeroDraw/common';
import { Container } from '@zeroDraw/core';
import { Divider, Image, Skeleton, Spin } from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import Masonry from 'react-masonry-css';
import {
  Content,
  Count,
  EmptyText,
  EmptyWrapper,
  Header,
  MasonryStyles,
  Title,
  Wrapper,
} from './components';
import ImageRender from './components/ImageRender';

const PAGE_SIZE = 25;

type LibData = Awaited<ReturnType<typeof httpGetLibOutputs>>;

const Lib: React.FC<NodeProps<LibNode>> = ({ selected }) => {
  const [previewVisibleIndex, setPreviewVisibleIndex] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data, loading, loadingMore, noMore, error } = useInfiniteScroll<LibData>(
    (currentData) =>
      httpGetLibOutputs({
        page: currentData ? currentData.page + 1 : 1,
        pageSize: PAGE_SIZE,
      }),
    {
      target: contentRef,
      threshold: 50,
      isNoMore: (data) => !!data && data.list.length >= data.total,
    }
  );

  const handlePreview = useMemoizedFn((index: number) => {
    setPreviewVisibleIndex(index);
  });

  const items = useMemo(
    () => (data?.list || []).map((item) => ({ key: item.id, data: item })),
    [data?.list]
  );

  if (loading) {
    return (
      <Wrapper>
        <EmptyWrapper>
          <Spin />
        </EmptyWrapper>
      </Wrapper>
    );
  }

  if (error || items.length === 0) {
    return (
      <Wrapper>
        <EmptyWrapper>
          <EmptyText>Anyone here?</EmptyText>
        </EmptyWrapper>
      </Wrapper>
    );
  }

  return (
    <Container
      style={{
        borderRadius: 16,
        outline: selected ? '1px solid var(--color-primary-active)' : 'none',
      }}
    >
      <Wrapper>
        <Header>
          <Title>outputs</Title>
          <Count>{data?.total ?? 0} outputs</Count>
        </Header>
        <Content ref={contentRef} className="nowheel nodrag">
          <MasonryStyles />
          <Masonry breakpointCols={4} className="lib-masonry" columnClassName="lib-masonry-column">
            {items.map((item, index) => (
              <ImageRender key={item.key} data={item.data} onClick={() => handlePreview(index)} />
            ))}
          </Masonry>

          {loadingMore && <Skeleton.Button style={{ marginTop: 20 }} block active />}
          {noMore && <Divider variant="dotted">That's all</Divider>}
        </Content>

        <Image.PreviewGroup
          items={items.map((item) => `${apiUrl}${fileUrl}/${item.data.s3Key}`)}
          preview={{
            visible: previewVisibleIndex !== null,
            current: previewVisibleIndex ?? 0,
            onVisibleChange: (visible) => {
              if (!visible) setPreviewVisibleIndex(null);
            },
            onChange: (current) => setPreviewVisibleIndex(current),
          }}
        />
      </Wrapper>
    </Container>
  );
};

export default React.memo(Lib);
