import { FileOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { ConfigProvider, Drawer, Menu } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  SidebarBottom,
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
  const { t } = useTranslation();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [helpOpen, setHelpOpen] = useState(false);

  const topMenuItems: MenuProps['items'] = [
    { key: 'projects', icon: <FileOutlined />, label: t('aside.projects') },
  ];
  const bottomMenuItems: MenuProps['items'] = [
    { key: 'help', icon: <QuestionCircleOutlined />, label: t('aside.help') },
  ];

  const handleMenuSelect = ({ key }: { key: string }) => {
    if (key === 'help') {
      setHelpOpen(true);
      return;
    }
    navigate(`/${key}`);
  };

  const activeNav =
    searchParams.get('view') === 'trash'
      ? 'trash'
      : location.pathname.replace('/', '') || 'projects';

  const workspaceName = user?.name
    ? t('aside.workspaceName', { name: user.name })
    : user?.username
      ? t('aside.workspaceName', { name: user.username })
      : t('aside.workspaceDefault');

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

      <Drawer
        title={t('aside.helpTitle')}
        placement="right"
        width="80vw"
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        styles={{
          body: { padding: 0, height: '100%', overflow: 'hidden' },
          wrapper: { height: '100vh' },
        }}
      >
        <iframe
          //@ts-ignore
          src={`${import.meta.env.VITE_DOCS_URL ?? ''}/docs/guide`}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </Drawer>
    </ConfigProvider>
  );
};

export default Aside;
