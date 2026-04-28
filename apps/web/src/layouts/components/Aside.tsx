import { FileOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { ConfigProvider, Menu } from 'antd';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  SidebarTop,
  StyledSider,
  WorkspaceAvatar,
  WorkspaceHeader,
  WorkspaceInfo,
  WorkspaceName,
} from '../../pages/Project/components';
import { useUserStore } from '../../store/useUserStore';

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

const Aside = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const topMenuItems: MenuProps['items'] = [
    { key: 'projects', icon: <FileOutlined />, label: 'Projects' },
  ];

  const handleMenuSelect = ({ key }: { key: string }) => {
    if (key === 'trash') {
      navigate('/projects?view=trash');
      return;
    }
    navigate(`/${key}`);
  };

  const activeNav =
    searchParams.get('view') === 'trash'
      ? 'trash'
      : location.pathname.replace('/', '') || 'projects';

  const workspaceName = user?.name
    ? `${user.name}'s Workspace`
    : user?.username
      ? `${user.username}'s Workspace`
      : 'My Workspace';

  return (
    <ConfigProvider theme={menuTheme}>
      <StyledSider width={220} theme="dark">
        <SidebarTop>
          <WorkspaceHeader>
            <WorkspaceAvatar>{user?.username?.charAt(0)?.toUpperCase() ?? 'C'}</WorkspaceAvatar>
            <WorkspaceInfo>
              <WorkspaceName>{workspaceName}</WorkspaceName>
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
      </StyledSider>
    </ConfigProvider>
  );
};

export default Aside;
