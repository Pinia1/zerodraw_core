import {
  BookOutlined,
  DeleteOutlined,
  FileOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { ConfigProvider, Menu, Tag } from 'antd';
import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import {
  AppLayout,
  Main,
  SidebarBottom,
  SidebarTop,
  StyledSider,
  WorkspaceAvatar,
  WorkspaceHeader,
  WorkspaceInfo,
  WorkspaceName,
} from './components';

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

const Project: React.FC = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const activeNav = useMemo(() => {
    if (searchParams.get('view') === 'trash') return 'trash';
    if (location.pathname.startsWith('/plan')) return 'plan';
    return 'list';
  }, [location.pathname, searchParams]);

  const workspaceName = user?.name
    ? `${user.name}'s Workspace`
    : user?.username
      ? `${user.username}'s Workspace`
      : 'My Workspace';

  const topMenuItems = useMemo<MenuProps['items']>(
    () => [
      { key: 'list', icon: <FileOutlined />, label: 'Projects' },
      { key: 'plan', icon: <BookOutlined />, label: 'Plan' },
    ],
    []
  );

  const bottomMenuItems = useMemo<MenuProps['items']>(
    () => [
      { key: 'trash', icon: <DeleteOutlined />, label: 'Trash' },
      { key: 'docs', icon: <QuestionCircleOutlined />, label: 'Docs' },
    ],
    []
  );

  const handleMenuSelect = ({ key }: { key: string }) => {
    if (key === 'docs') {
      window.open('/docs', '_blank');
      return;
    }
    if (key === 'trash') {
      navigate('/list?view=trash');
      return;
    }
    navigate(`/${key}`);
  };

  return (
    <ConfigProvider theme={menuTheme}>
      <AppLayout>
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

            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[activeNav]}
              onSelect={handleMenuSelect}
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
              onSelect={handleMenuSelect}
              items={bottomMenuItems}
              style={{ background: 'transparent', border: 'none', marginBottom: 80 }}
              inlineIndent={12}
            />
          </SidebarBottom>
        </StyledSider>

        <Main>
          <Outlet />
        </Main>
      </AppLayout>
    </ConfigProvider>
  );
};

export default Project;
