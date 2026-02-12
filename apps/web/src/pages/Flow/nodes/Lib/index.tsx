import { httpGetLibOutputs } from '@/services/generate';
import { apiUrl, fileUrl } from '@/utils';
import type { NodeProps } from '@xyflow/react';
import { useInfiniteScroll, useMemoizedFn } from '@zeroDraw/common';
import { Container } from '@zeroDraw/core';
import { Divider, Form, Image, Input, Skeleton, Spin } from 'antd';
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

const PAGE_SIZE = 5;

type LibData = Awaited<ReturnType<typeof httpGetLibOutputs>>;

interface QueryForm {
  keyword?: string;
}

interface QueryParams extends QueryForm {
  pageSize: number;
}

const Lib: React.FC<NodeProps<LibNode>> = ({ selected }) => {
  const [previewVisibleIndex, setPreviewVisibleIndex] = useState<number | null>(null);
  const [form] = Form.useForm<QueryForm>();
  const contentRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<QueryParams>({ pageSize: PAGE_SIZE });

  const { data, loading, loadingMore, noMore, error, reload } = useInfiniteScroll<LibData>(
    (currentData) =>
      httpGetLibOutputs({
        ...queryRef.current,
        page: currentData ? currentData.page + 1 : 1,
      }),
    {
      target: contentRef,
      threshold: 50,
      isNoMore: (data) => !!data && data.list.length >= data.total,
    }
  );

  const handleSearch = useMemoizedFn((values: QueryForm) => {
    queryRef.current = { pageSize: PAGE_SIZE, keyword: values.keyword || undefined };
    reload();
  });

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
          <Form<QueryForm> form={form} layout="inline" size="small" autoComplete="off">
            <Form.Item name="keyword" noStyle>
              <Input.Search
                placeholder="Search prompts..."
                allowClear
                onSearch={() => handleSearch(form.getFieldsValue())}
                onChange={(e) => {
                  if (!e.target.value) handleSearch({});
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                style={{ width: 200 }}
              />
            </Form.Item>
          </Form>
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
