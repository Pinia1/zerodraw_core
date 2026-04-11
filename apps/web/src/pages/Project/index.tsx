import {
  AppstoreOutlined,
  BarsOutlined,
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
import { Button, ConfigProvider, Dropdown, Input, Menu, MenuProps, Modal, Pagination, Skeleton, Tag, message } from 'antd';
import type { InputRef } from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
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
  ViewBtn,
  ViewToggle,
  WorkspaceAvatar,
  WorkspaceHeader,
  WorkspaceInfo,
  WorkspaceName,
} from './components';
import {
  httpCreateProject,
  httpDeleteProject,
  httpListProjects,
  httpPermanentDeleteProject,
  httpRestoreProject,
  httpUpdateProject,
} from '../../services/project';
import { fileUrl } from '../../utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

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

// ─── Component ────────────────────────────────────────────────────────────────
const Project: React.FC = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<string>('recents');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<InputRef>(null);

  const isTrash = activeNav === 'trash';

  React.useEffect(() => { setPage(1); }, [activeNav, searchValue]);

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
    () => httpCreateProject({ name: 'Untitled', canvasWidth: 800, canvasHeight: 600, backgroundColor: '#ffffff', backgroundVisible: false }),
    {
      manual: true,
      onSuccess: (data) => {
        navigate(`/drawing?projectId=${data.id}`);
      },
      onError: () => message.error('创建项目失败'),
    }
  );

  // ── 重命名 ────────────────────────────────────────────────────────────────
  const { run: renameProject } = useRequest(
    (id: string, name: string) => httpUpdateProject(id, { name }),
    {
      manual: true,
      onSuccess: () => refresh(),
      onError: () => message.error('重命名失败'),
    }
  );

  const handleRenameSubmit = () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) renameProject(renamingId, trimmed);
    setRenamingId(null);
  };

  // ── 软删除 ────────────────────────────────────────────────────────────────
  const { run: deleteProject } = useRequest(
    (id: string) => httpDeleteProject(id),
    {
      manual: true,
      onSuccess: () => refresh(),
      onError: () => message.error('删除失败'),
    }
  );

  // ── 恢复 ─────────────────────────────────────────────────────────────────
  const { run: restoreProject } = useRequest(
    (id: string) => httpRestoreProject(id),
    {
      manual: true,
      onSuccess: () => refresh(),
      onError: () => message.error('恢复失败'),
    }
  );

  // ── 永久删除 ──────────────────────────────────────────────────────────────
  const { run: permanentDelete } = useRequest(
    (id: string) => httpPermanentDeleteProject(id),
    {
      manual: true,
      onSuccess: () => refresh(),
      onError: () => message.error('删除失败'),
    }
  );

  const handlePermanentDelete = (id: string) => {
    Modal.confirm({
      title: '永久删除',
      content: '此操作不可恢复，确认删除？',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
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
            onClick: () => {
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
                onClick={createProject}
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
            <ViewToggle>
              <ViewBtn $active={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
                <AppstoreOutlined />
              </ViewBtn>
              <ViewBtn $active={viewMode === 'list'} onClick={() => setViewMode('list')}>
                <BarsOutlined />
              </ViewBtn>
            </ViewToggle>
          </FilterBar>

          <ScrollArea>
            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <CardGrid $list={viewMode === 'list'}>
                {projects.map((item) => (
                  <ProjectCard
                    key={item.id}
                    $list={viewMode === 'list'}
                    onClick={() => !isTrash && renamingId !== item.id && navigate(`/drawing?projectId=${item.id}`)}
                  >
                    <CardThumbnail $list={viewMode === 'list'}>
                      {item.thumbnailKey ? (
                        <img src={`${fileUrl}/${item.thumbnailKey}`} alt={item.name} />
                      ) : (
                        <EmptyThumb>
                          <FileOutlined
                            style={{ fontSize: viewMode === 'list' ? 16 : 24, color: '#444' }}
                          />
                        </EmptyThumb>
                      )}
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
                        </CardMeta>
                      </CardInfoLeft>
                      <Dropdown
                        menu={{ items: cardMenu(item) }}
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
    </ConfigProvider>
  );
};

export default Project;
