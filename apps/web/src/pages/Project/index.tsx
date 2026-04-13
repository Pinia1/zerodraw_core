import {
  BookOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  EllipsisOutlined,
  FileOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ProjectItem } from '@zeroDraw/api-contract';
import { useRequest } from '@zeroDraw/common';
import type { InputRef } from 'antd';
import {
  Button,
  ConfigProvider,
  Dropdown,
  Input,
  Menu,
  MenuProps,
  Modal,
  Pagination,
  Skeleton,
  Tag,
  message,
} from 'antd';
import { loadStageCover } from '@zeroDraw/core';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  httpCreateProject,
  httpDeleteProject,
  httpListProjects,
  httpPermanentDeleteProject,
  httpRestoreProject,
  httpUpdateProject,
} from '../../services/project';
import { useUserStore } from '../../store/useUserStore';
import { apiUrl, thumbnailUrl } from '../../utils';
import { formatRatio, formatRelativeTime } from '../../utils/project';
import {
  AppLayout,
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
  Main,
  MainHeader,
  MoreBtn,
  PageTitle,
  PaginationBar,
  ProjectCard,
  ScrollArea,
  SearchWrapper,
  SidebarBottom,
  SidebarTop,
  StyledSider,
  WorkspaceAvatar,
  WorkspaceHeader,
  WorkspaceInfo,
  WorkspaceName,
} from './components';
import CreateProjectModal, { type RatioOption } from './components/CreateProjectModal';

// ─── Menu Theme Config ────────────────────────────────────────────────────────
const menuTheme = {
  components: {
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemColor: '#999',
      darkItemSelectedBg: 'rgba(255,255,255,0.1)',
      darkItemSelectedColor: '#e8e8e8',
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      darkItemHoverColor: '#e8e8e8',
      darkGroupTitleColor: '#555',
      itemBorderRadius: 7,
      itemHeight: 32,
      itemMarginInline: 8,
      collapsedIconSize: 14,
      iconSize: 13,
      fontSize: 12.5,
    },
  },
};

// ─── 项目封面：服务端 thumbnailKey → 本地 IndexedDB fallback → 空占位 ────────
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
    return <img src={`${apiUrl}${thumbnailUrl}/${item.thumbnailKey}`} alt={item.name} />;
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

// ─── Component ────────────────────────────────────────────────────────────────
const Project: React.FC = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<string>('recents');
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<InputRef>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const isTrash = activeNav === 'trash';

  React.useEffect(() => {
    setPage(1);
  }, [activeNav, searchValue]);

  const workspaceName = user?.name
    ? `${user.name}'s Workspace`
    : user?.username
      ? `${user.username}'s Workspace`
      : 'My Workspace';

  // ── 获取项目列表 ──────────────────────────────────────────────────────────
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
    { refreshDeps: [activeNav, searchValue, page] }
  );

  const projects: ProjectItem[] = listData?.list ?? [];

  // ── 新建项目 ──────────────────────────────────────────────────────────────
  const { loading: creating, run: createProject } = useRequest(
    (canvasWidth: number, canvasHeight: number, imageKey?: string) =>
      httpCreateProject({
        name: 'Untitled',
        canvasWidth,
        canvasHeight,
        backgroundColor: '#ffffff',
        backgroundVisible: false,
        ...(imageKey ? { thumbnailKey: imageKey } : {}),
      }),
    {
      manual: true,
      onSuccess: (data, params) => {
        setCreateModalOpen(false);
        const imageKey = params[2] as string | undefined;
        navigate(`/drawing?projectId=${data.id}`, imageKey ? { state: { imageKey } } : undefined);
      },
      onError: () => message.error('Failed to create project'),
    }
  );

  const handleCreateConfirm = (option: RatioOption) => {
    createProject(option.width, option.height, option.imageKey);
  };

  // ── 重命名 ────────────────────────────────────────────────────────────────
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

  // ── 软删除 ────────────────────────────────────────────────────────────────
  const { run: deleteProject } = useRequest((id: string) => httpDeleteProject(id), {
    manual: true,
    onSuccess: () => refresh(),
    onError: () => message.error('Failed to delete'),
  });

  // ── 恢复 ─────────────────────────────────────────────────────────────────
  const { run: restoreProject } = useRequest((id: string) => httpRestoreProject(id), {
    manual: true,
    onSuccess: () => refresh(),
    onError: () => message.error('Failed to restore'),
  });

  // ── 永久删除 ──────────────────────────────────────────────────────────────
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

  // ── 菜单 ─────────────────────────────────────────────────────────────────
  const topMenuItems = useMemo<MenuProps['items']>(
    () => [
      { key: 'recents', icon: <ClockCircleOutlined />, label: 'Recents' },
      { key: 'files', icon: <FileOutlined />, label: 'My Files' },
      { key: 'learn', icon: <BookOutlined />, label: 'Learn' },
    ],
    [workspaceName]
  );

  const bottomMenuItems = useMemo<MenuProps['items']>(
    () => [
      { key: 'trash', icon: <DeleteOutlined />, label: 'Trash' },
      { key: 'help', icon: <QuestionCircleOutlined />, label: 'Help & feedback' },
    ],
    []
  );

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

  const navTitle = isTrash
    ? 'Trash'
    : activeNav === 'files'
      ? 'My Files'
      : activeNav === 'learn'
        ? 'Learn'
        : 'Recents';

  return (
    <ConfigProvider theme={menuTheme}>
      <AppLayout>
        {/* ── Sidebar ── */}
        <StyledSider width={220} theme="dark">
          <SidebarTop>
            <WorkspaceHeader>
              <WorkspaceAvatar>{user?.username?.charAt(0)?.toUpperCase() ?? 'C'}</WorkspaceAvatar>
              <WorkspaceInfo>
                <WorkspaceName>{workspaceName}</WorkspaceName>
                <Tag
                  style={{
                    fontSize: 10,
                    padding: '0 5px',
                    margin: 0,
                    lineHeight: '16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    color: '#888',
                    borderRadius: 4,
                  }}
                >
                  Free plan
                </Tag>
              </WorkspaceInfo>
            </WorkspaceHeader>

            <SearchWrapper>
              <Input
                prefix={<SearchOutlined style={{ color: '#555', fontSize: 12 }} />}
                placeholder="Search all files"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                variant="borderless"
              />
            </SearchWrapper>

            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[activeNav]}
              onSelect={({ key }) => setActiveNav(key)}
              items={topMenuItems}
              style={{ background: 'transparent', border: 'none' }}
              inlineIndent={12}
            />
          </SidebarTop>

          <SidebarBottom>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[activeNav]}
              onSelect={({ key }) => setActiveNav(key)}
              items={bottomMenuItems}
              style={{ background: 'transparent', border: 'none', marginBottom: 80 }}
              inlineIndent={12}
            />
          </SidebarBottom>
        </StyledSider>

        {/* ── Main ── */}
        <Main>
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
                      !isTrash &&
                      renamingId !== item.id &&
                      navigate(`/drawing?projectId=${item.id}`)
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
        </Main>
      </AppLayout>
      <CreateProjectModal
        open={createModalOpen}
        loading={creating}
        onConfirm={handleCreateConfirm}
        onCancel={() => setCreateModalOpen(false)}
      />
    </ConfigProvider>
  );
};

export default Project;
