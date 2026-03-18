import { useInfiniteScroll, useMemoizedFn, useRequest } from '@zeroDraw/common';
import { Divider, Form, Image, Input, Skeleton } from 'antd';
import { forwardRef, memo, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Masonry from 'react-masonry-css';
import Fetch from '../../fetch';
import Container from '../Container';
import { Content, EmptyText, EmptyWrapper, Header, MasonryStyles, Wrapper } from './components';
import ImageArgs from './components/ImageArgs';
import ImageRender from './components/ImageRender';
import RunningRender from './components/RunningRender';

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

  const {
    data: runningData,
    mutate: mutateRunning,
    refresh,
  } = useRequest(Fetch.getLibRunning, {
    defaultParams: [{ projectId }],
  });

  const { run: deleteOutput } = useRequest(Fetch.deleteLibOutput, {
    manual: true,
    onSuccess: (id) => {
      mutate((pre) => ({
        ...pre!,
        list: pre?.list?.filter((item) => item.id !== id) || [],
      }));
    },
  });

  const handleTaskCompleted = useMemoizedFn(
    (task: Awaited<ReturnType<typeof Fetch.httpGetTask>>) => {
      mutateRunning((pre) => pre?.filter((item) => item.id !== task.id));
      if (task.s3Key) {
        console.log(task.createdAt, 'task');

        mutate((pre) => ({
          ...pre!,
          list: [{ ...task } as LibOutput, ...(pre?.list || [])],
          total: (pre?.total || 0) + 1,
        }));
      }
    }
  );

  const handleTaskFailed = useMemoizedFn((taskId: string) => {
    mutateRunning((pre) => pre?.filter((item) => item.id !== taskId));
  });

  const handleSearch = useMemoizedFn((values: QueryForm = {}) => {
    queryRef.current = { pageSize: PAGE_SIZE, keyword: values.keyword || undefined };
    reload();
  });

  const handlePreview = useMemoizedFn((index: number) => {
    setPreviewVisibleIndex(index);
  });

  type AllItem =
    | { key: string; isRunning: true; data: RunningItem }
    | { key: string; isRunning: false; data: LibOutput };

  const allItems = useMemo<AllItem[]>(() => {
    const running: AllItem[] =
      runningData?.map((item) => ({
        key: item.id,
        isRunning: true,
        data: item,
      })) || [];
    const completed: AllItem[] =
      data?.list?.map((item) => ({
        key: item.id,
        isRunning: false,
        data: item,
      })) || [];
    return [...running, ...completed].sort(
      (a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
    );
  }, [runningData, data?.list]);

  const completedItems = useMemo(
    () => allItems.filter((i): i is Extract<AllItem, { isRunning: false }> => !i.isRunning),
    [allItems]
  );

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, AllItem[]>();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    for (const item of allItems) {
      const d = new Date(item.data.createdAt);
      let label: string;

      if (d.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (d.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      } else {
        label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(item);
    }

    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }, [allItems]);

  const empty = error || allItems.length === 0;

  useImperativeHandle(ref, () => ({
    addTask: refresh,
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
            <>
              {groupedByDate.map(({ date, items: dateItems }) => (
                <div key={date}>
                  <Divider style={{ fontSize: 12, color: '#888' }}>{date}</Divider>
                  <Masonry
                    breakpointCols={{ default: 2 }}
                    className="lib-masonry"
                    columnClassName="lib-masonry-column"
                  >
                    {dateItems.map((item) => {
                      if (item.isRunning) {
                        return (
                          <RunningRender
                            key={item.key}
                            data={item.data}
                            onCompleted={handleTaskCompleted}
                            onFailed={handleTaskFailed}
                          />
                        );
                      }
                      const previewIndex = completedItems.findIndex((i) => i.key === item.key);
                      return (
                        <ImageRender
                          key={item.key}
                          data={item.data}
                          onClick={() => handlePreview(previewIndex)}
                          onDelete={() => deleteOutput(item.key)}
                        />
                      );
                    })}
                  </Masonry>
                </div>
              ))}
            </>
          )}

          {loadingMore && <Skeleton.Button style={{ marginTop: 20 }} block active />}
          {noMore && <Divider variant="dotted">That's all</Divider>}
        </Content>

        <Image.PreviewGroup
          items={completedItems.map((item) => `${apiUrl}${fileUrl}/${item.data.s3Key}`)}
          preview={{
            visible: previewVisibleIndex !== null,
            current: previewVisibleIndex ?? 0,
            minScale: 0.5,
            onVisibleChange: (visible) => {
              if (!visible) setPreviewVisibleIndex(null);
            },
            onChange: (current) => setPreviewVisibleIndex(current),
            imageRender: (originalNode) => {
              const args = completedItems[previewVisibleIndex as number]?.data
                .args as BaseArgsType | null;
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
