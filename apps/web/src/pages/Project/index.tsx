import { EllipsisOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ProjectItem } from '@zeroDraw/api-contract';
import { useRequest } from '@zeroDraw/common';
import type { InputRef, MenuProps } from 'antd';
import { Button, Dropdown, Input, Modal, Pagination, Skeleton, message } from 'antd';
import React, { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  httpCreateProject,
  httpListProjects,
  httpPermanentDeleteProject,
  httpUpdateProject,
} from '../../services/project';
import { formatRatio, formatRelativeTime } from '../../utils/project';
import {
  CardGrid,
  CardInfo,
  CardInfoLeft,
  CardMeta,
  CardName,
  CardThumbnail,
  FilterBar,
  FilterLeft,
  MainHeader,
  MoreBtn,
  PageTitle,
  PaginationBar,
  ProjectCard,
  ScrollArea,
  SearchWrapper,
} from '../Project/components';
import CreateProjectModal, { type RatioOption } from '../Project/components/CreateProjectModal';
import CoverImage from './components/CoverImage';

const List: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);

  const [inputValue, setInputValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<InputRef>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const setPage = (p: number) => {
    setSearchParams(
      (prev) => {
        prev.set('page', String(p));
        return prev;
      },
      { replace: true }
    );
  };

  const triggerSearch = (value: string) => {
    setSearchValue(value);
    setSearchParams(
      (prev) => {
        prev.delete('page');
        return prev;
      },
      { replace: true }
    );
  };

  const {
    data: listData,
    loading,
    mutate,
  } = useRequest(
    () => httpListProjects({ page, pageSize: 16, keyword: searchValue || undefined }),
    {
      refreshDeps: [searchValue, page],
      cacheKey: `projects-list-${searchValue}-${page}`,
    }
  );

  const projects: ProjectItem[] = listData?.list ?? [];

  const pendingImageRef = useRef<File | undefined>();
  const { loading: creating, run: createProject } = useRequest(
    (canvasWidth: number, canvasHeight: number, name: string) =>
      httpCreateProject({
        name,
        canvasWidth,
        canvasHeight,
        backgroundColor: '#ffffff',
        backgroundVisible: false,
      }),
    {
      manual: true,
      onSuccess: (data) => {
        setCreateModalOpen(false);
        const imageFile = pendingImageRef.current;
        pendingImageRef.current = undefined;
        navigate(`/drawing?projectId=${data.id}`, imageFile ? { state: { imageFile } } : undefined);
      },
      onError: () => message.error('Failed to create project'),
    }
  );

  const handleCreateConfirm = (option: RatioOption) => {
    pendingImageRef.current = option.imageFile;
    createProject(option.width, option.height, option.name!);
  };

  const handleRenameSubmit = () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) return;

    const prev = listData;
    mutate(
      prev
        ? {
            ...prev,
            list: prev.list.map((p) => (p.id === renamingId ? { ...p, name: trimmed } : p)),
          }
        : prev
    );
    httpUpdateProject(renamingId, { name: trimmed }).catch(() => {
      message.error('Failed to rename');
      mutate(prev);
    });
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete project',
      content: 'This action cannot be undone. Are you sure?',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        const prev = listData;
        mutate(
          prev
            ? { ...prev, list: prev.list.filter((p) => p.id !== id), total: prev.total - 1 }
            : prev
        );
        httpPermanentDeleteProject(id).catch(() => {
          message.error('Failed to delete');
          mutate(prev);
        });
      },
    });
  };

  const cardMenu = (item: ProjectItem): MenuProps['items'] => [
    {
      key: 'open',
      label: 'Open',
      onClick: () => navigate(`/drawing?projectId=${item.id}`),
    },
    {
      key: 'rename',
      label: 'Rename',
      onClick: (e) => {
        e.domEvent.stopPropagation();
        setRenamingId(item.id);
        setRenameValue(item.name);
        setTimeout(() => renameInputRef.current?.focus(), 50);
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(item.id),
    },
  ];

  return (
    <>
      <MainHeader>
        <PageTitle>Projects</PageTitle>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={creating}
          onClick={() => setCreateModalOpen(true)}
          style={{ background: '#6254e8', borderColor: '#6254e8', borderRadius: 8 }}
        >
          Create new file
        </Button>
      </MainHeader>

      <FilterBar>
        <FilterLeft>
          <SearchWrapper style={{ margin: 0 }}>
            <Input
              prefix={
                <SearchOutlined
                  style={{ color: '#555', fontSize: 12, cursor: 'pointer' }}
                  onClick={() => triggerSearch(inputValue)}
                />
              }
              placeholder="Search files"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={() => triggerSearch(inputValue)}
              variant="borderless"
            />
          </SearchWrapper>
        </FilterLeft>
      </FilterBar>

      <ScrollArea>
        {loading && !listData ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <CardGrid $list={false}>
            {projects.map((item) => (
              <ProjectCard
                key={item.id}
                $list={false}
                onClick={() => renamingId !== item.id && navigate(`/drawing?projectId=${item.id}`)}
              >
                <CardThumbnail $list={false}>
                  <CoverImage item={item} />
                </CardThumbnail>
                <CardInfo>
                  <CardInfoLeft>
                    {renamingId === item.id ? (
                      <Input
                        ref={renameInputRef}
                        size="small"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onPressEnter={handleRenameSubmit}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#e0e0e0',
                          borderRadius: 4,
                          fontSize: 12.5,
                        }}
                        variant="borderless"
                      />
                    ) : (
                      <CardName>{item.name}</CardName>
                    )}
                    <CardMeta>
                      {`Edited · ${formatRelativeTime(item.updatedAt)}`}
                      {item.canvasWidth && item.canvasHeight
                        ? ` · ${formatRatio(item.canvasWidth, item.canvasHeight)}`
                        : null}
                    </CardMeta>
                  </CardInfoLeft>
                  <Dropdown
                    menu={{
                      items: cardMenu(item),
                      onClick: (e) => e.domEvent.stopPropagation(),
                    }}
                    trigger={['click']}
                    overlayStyle={{ minWidth: 160 }}
                  >
                    <MoreBtn onClick={(e) => e.stopPropagation()}>
                      <EllipsisOutlined />
                    </MoreBtn>
                  </Dropdown>
                </CardInfo>
              </ProjectCard>
            ))}
          </CardGrid>
        )}
        {(listData?.total ?? 0) > 16 && (
          <PaginationBar>
            <Pagination
              current={page}
              pageSize={16}
              total={listData?.total ?? 0}
              onChange={(p) => setPage(p)}
              showSizeChanger={false}
              size="small"
            />
          </PaginationBar>
        )}
      </ScrollArea>

      <CreateProjectModal
        open={createModalOpen}
        loading={creating}
        onConfirm={handleCreateConfirm}
        onCancel={() => setCreateModalOpen(false)}
      />
    </>
  );
};

export default List;
