import {
  DownOutlined,
  EllipsisOutlined,
  FileOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ProjectItem } from '@zeroDraw/api-contract';
import { useRequest } from '@zeroDraw/common';
import { loadStageCover } from '@zeroDraw/core';
import type { InputRef, MenuProps } from 'antd';
import { Button, Dropdown, Input, Modal, Pagination, Skeleton, message } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  httpCreateProject,
  httpDeleteProject,
  httpListProjects,
  httpPermanentDeleteProject,
  httpRestoreProject,
  httpUpdateProject,
} from '../../services/project';
import { getR2ThumbnailUrl } from '../../utils';
import { formatRatio, formatRelativeTime } from '../../utils/project';
import {
  CardGrid,
  CardInfo,
  CardInfoLeft,
  CardMeta,
  CardName,
  CardThumbnail,
  EmptyThumb,
  FilterBar,
  FilterButton,
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

const CoverImage: React.FC<{ item: ProjectItem }> = ({ item }) => {
  const [localCover, setLocalCover] = useState<string | null>(null);

  useEffect(() => {
    if (item.thumbnailKey) return;
    let revoked = false;
    loadStageCover(item.id).then((url) => {
      if (!revoked && url) setLocalCover(url);
    });
    return () => {
      revoked = true;
      if (localCover) URL.revokeObjectURL(localCover);
    };
  }, [item.id, item.thumbnailKey]);

  if (item.thumbnailKey) {
    return <img src={getR2ThumbnailUrl(item.thumbnailKey!)} alt={item.name} />;
  }
  if (localCover) {
    return <img src={localCover} alt={item.name} />;
  }
  return (
    <EmptyThumb>
      <FileOutlined style={{ fontSize: 24, color: '#444' }} />
    </EmptyThumb>
  );
};

const List: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTrash = searchParams.get('view') === 'trash';

  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<InputRef>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [isTrash, searchValue]);

  const {
    data: listData,
    loading,
    refresh,
  } = useRequest(
    () =>
      httpListProjects({
        page,
        pageSize: 16,
        keyword: searchValue || undefined,
        ...(isTrash ? { deleted: true } : {}),
      }),
    { refreshDeps: [isTrash, searchValue, page] }
  );

  const projects: ProjectItem[] = listData?.list ?? [];

  const pendingImageRef = useRef<File | undefined>();
  const { loading: creating, run: createProject } = useRequest(
    (canvasWidth: number, canvasHeight: number) =>
      httpCreateProject({
        name: 'Untitled',
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
    createProject(option.width, option.height);
  };

  const { run: renameProject } = useRequest(
    (id: string, name: string) => httpUpdateProject(id, { name }),
    {
      manual: true,
      onSuccess: () => refresh(),
      onError: () => message.error('Failed to rename'),
    }
  );

  const handleRenameSubmit = () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) renameProject(renamingId, trimmed);
    setRenamingId(null);
  };

  const { run: deleteProject } = useRequest((id: string) => httpDeleteProject(id), {
    manual: true,
    onSuccess: () => refresh(),
    onError: () => message.error('Failed to delete'),
  });

  const { run: restoreProject } = useRequest((id: string) => httpRestoreProject(id), {
    manual: true,
    onSuccess: () => refresh(),
    onError: () => message.error('Failed to restore'),
  });

  const { run: permanentDelete } = useRequest((id: string) => httpPermanentDeleteProject(id), {
    manual: true,
    onSuccess: () => refresh(),
    onError: () => message.error('Failed to delete permanently'),
  });

  const handlePermanentDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete permanently',
      content: 'This action cannot be undone. Are you sure?',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => permanentDelete(id),
    });
  };

  const sortItems: MenuProps['items'] = [
    { key: 'last_viewed', label: 'Last viewed' },
    { key: 'last_modified', label: 'Last modified' },
    { key: 'alphabetical', label: 'Alphabetical' },
  ];

  const cardMenu = (item: ProjectItem): MenuProps['items'] =>
    isTrash
      ? [
          {
            key: 'restore',
            icon: <ReloadOutlined />,
            label: 'Restore',
            onClick: () => restoreProject(item.id),
          },
          { type: 'divider' },
          {
            key: 'permanent',
            label: 'Delete permanently',
            danger: true,
            onClick: () => handlePermanentDelete(item.id),
          },
        ]
      : [
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
            onClick: () => deleteProject(item.id),
          },
        ];

  const navTitle = isTrash ? 'Trash' : 'Projects';

  return (
    <>
      <MainHeader>
        <PageTitle>{navTitle}</PageTitle>
        {!isTrash && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={creating}
            onClick={() => setCreateModalOpen(true)}
            style={{ background: '#6254e8', borderColor: '#6254e8', borderRadius: 8 }}
          >
            Create new file
          </Button>
        )}
      </MainHeader>

      <FilterBar>
        <FilterLeft>
          <SearchWrapper style={{ margin: 0 }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#555', fontSize: 12 }} />}
              placeholder="Search files"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              variant="borderless"
            />
          </SearchWrapper>
          <Dropdown menu={{ items: sortItems }} trigger={['click']}>
            <FilterButton>
              Last viewed <DownOutlined style={{ fontSize: 9 }} />
            </FilterButton>
          </Dropdown>
        </FilterLeft>
      </FilterBar>

      <ScrollArea>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <CardGrid $list={false}>
            {projects.map((item) => (
              <ProjectCard
                key={item.id}
                $list={false}
                onClick={() =>
                  !isTrash && renamingId !== item.id && navigate(`/drawing?projectId=${item.id}`)
                }
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
                      {isTrash ? 'Deleted' : `Edited · ${formatRelativeTime(item.updatedAt)}`}
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
        {!loading && (listData?.total ?? 0) > 16 && (
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
