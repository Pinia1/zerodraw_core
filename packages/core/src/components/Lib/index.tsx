import { useInfiniteScroll, useMemoizedFn, useRequest } from '@zeroDraw/common';
import { Divider, Form, Image, Input, Skeleton } from 'antd';
import { forwardRef, memo, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Masonry from 'react-masonry-css';
import Fetch from '../../fetch';
import Container from '../Container';
import { Content, EmptyText, EmptyWrapper, Header, MasonryStyles, Wrapper } from './components';
import ImageArgs from './components/ImageArgs';
import ImageRender from './components/ImageRender';

const apiUrl = Fetch.apiUrl;
const fileUrl = Fetch.fileUrl;

const PAGE_SIZE = 25;

type LibData = Awaited<ReturnType<typeof Fetch.getLibOutputs>>;

interface QueryForm {
  keyword?: string;
}

interface QueryParams extends QueryForm {
  pageSize: number;
}

interface LibProps {
  projectId?: string;
}

export interface LibRef {
  addTask: (taskId: string) => void;
}

const Lib = forwardRef<any, LibProps>((props, ref) => {
  const { projectId } = props;
  const [previewVisibleIndex, setPreviewVisibleIndex] = useState<number | null>(null);
  const [form] = Form.useForm<QueryForm>();
  const contentRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<QueryParams>({ pageSize: PAGE_SIZE });

  const { data, loadingMore, noMore, error, reload, mutate } = useInfiniteScroll<LibData>(
    (currentData) =>
      Fetch.getLibOutputs({
        ...queryRef.current,
        page: currentData ? currentData.page + 1 : 1,
        projectId,
      }),
    {
      target: contentRef,
      threshold: 50,
      isNoMore: (data) => !!data && data.list.length >= data.total,
    }
  );

  const { run: deleteOutput } = useRequest(Fetch.deleteLibOutput, {
    manual: true,
    onSuccess: (id) => {
      mutate((pre) => ({
        ...pre!,
        list: pre?.list?.filter((item) => item.id !== id) || [],
      }));
    },
  });

  const handleSearch = useMemoizedFn((values: QueryForm = {}) => {
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

  const addTask = useMemoizedFn((taskId: string) => {});

  const empty = error || items.length === 0;

  useImperativeHandle(ref, () => ({
    addTask,
  }));

  return (
    <Container
      style={{
        borderRadius: 16,
        border: 'none',
        boxShadow: 'none',
        height: projectId ? '0px' : '100%',
        flex: 1,
        minHeight: 200,
      }}
    >
      <Wrapper>
        <Header>
          {projectId ? (
            'Outputs'
          ) : (
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
                />
              </Form.Item>
            </Form>
          )}
        </Header>
        <Content ref={contentRef}>
          <MasonryStyles />
          {empty ? (
            <EmptyWrapper>
              <EmptyText>Anyone here?</EmptyText>
            </EmptyWrapper>
          ) : (
            <Masonry
              breakpointCols={{ default: 2 }}
              className="lib-masonry"
              columnClassName="lib-masonry-column"
            >
              {items.map((item, index) => (
                <ImageRender
                  key={item.key}
                  data={item.data}
                  onClick={() => handlePreview(index)}
                  onDelete={() => deleteOutput(item.key)}
                />
              ))}
            </Masonry>
          )}

          {loadingMore && <Skeleton.Button style={{ marginTop: 20 }} block active />}
          {noMore && <Divider variant="dotted">That's all</Divider>}
        </Content>

        <Image.PreviewGroup
          items={items.map((item) => `${apiUrl}${fileUrl}/${item.data.s3Key}`)}
          preview={{
            visible: previewVisibleIndex !== null,
            current: previewVisibleIndex ?? 0,
            minScale: 0.5,
            onVisibleChange: (visible) => {
              if (!visible) setPreviewVisibleIndex(null);
            },
            onChange: (current) => setPreviewVisibleIndex(current),
            imageRender: (originalNode) => {
              const args = items[previewVisibleIndex as number]?.data.args as BaseArgsType | null;
              return (
                <>
                  {originalNode}
                  {args && <ImageArgs {...args} />}
                </>
              );
            },
          }}
        />
      </Wrapper>
    </Container>
  );
});

export default memo(Lib);
