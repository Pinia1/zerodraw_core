import {
  BarChartOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  KeyOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useMediaQuery } from '@zeroDraw/common';
import { Button, ConfigProvider, Input, Layout, Menu, Modal, Typography, theme } from 'antd';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAdminTokenStore } from '../../../store/useAdminTokenStore';

const { Header, Sider, Content } = Layout;

const Shell = styled(Layout)`
  height: 100dvh;
  overflow: hidden;
  background: #0a0a0a;
`;

const MainColumn = styled(Layout)`
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const Brand = styled.div`
  padding: 16px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fafafa;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const PageBody = styled(Content)`
  flex: 1;
  min-height: 0;
  padding: 20px 24px;
  overflow-y: auto;
  overflow-x: hidden;
`;

const navItems = [
  { key: '/admin/agent/overview', icon: <DashboardOutlined />, label: '总览' },
  { key: '/admin/agent/runtime', icon: <CloudServerOutlined />, label: '内存 Harness' },
  { key: '/admin/agent/sessions', icon: <UnorderedListOutlined />, label: '会话' },
  { key: '/admin/agent/usage', icon: <BarChartOutlined />, label: '用量' },
];

export default function AdminAgentLayout() {
  const [windowTheme] = useMediaQuery();
  const location = useLocation();
  const navigate = useNavigate();
  const { token, setToken, clearToken } = useAdminTokenStore();
  const [tokenInput, setTokenInput] = useState(token);
  const [tokenModalOpen, setTokenModalOpen] = useState(!token);

  const algorithm = useMemo(
    () => (windowTheme === 'dark' ? theme.darkAlgorithm : theme.compactAlgorithm),
    [windowTheme],
  );

  const selectedKey =
    navItems.find((item) => location.pathname.startsWith(item.key))?.key ??
    '/admin/agent/overview';

  return (
    <ConfigProvider
      theme={{
        algorithm: [algorithm, theme.compactAlgorithm],
        token: { colorBgContainer: '#141414', colorBorder: 'rgba(255,255,255,0.08)' },
      }}
    >
      <Shell>
        <Sider width={220} theme="dark" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <Brand>Agent 监控</Brand>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={navItems.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: <NavLink to={item.key}>{item.label}</NavLink>,
            }))}
          />
          <div style={{ padding: 16, marginTop: 'auto' }}>
            <Button
              block
              size="small"
              icon={<KeyOutlined />}
              onClick={() => {
                setTokenInput(token);
                setTokenModalOpen(true);
              }}
            >
              Admin Token
            </Button>
          </div>
        </Sider>
        <MainColumn>
          <Header
            style={{
              background: '#111',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
            }}
          >
            <Typography.Text type="secondary">Harness 可观测性 · 只读监控 + 会话管理</Typography.Text>
            <Button type="link" onClick={() => navigate('/projects')}>
              返回项目
            </Button>
          </Header>
          <PageBody>
            {!token ? (
              <Typography.Paragraph type="warning">
                请先配置 Admin Token 以访问监控 API。
              </Typography.Paragraph>
            ) : (
              <Outlet />
            )}
          </PageBody>
        </MainColumn>
      </Shell>

      <Modal
        title="Admin Token"
        open={tokenModalOpen}
        onOk={() => {
          setToken(tokenInput.trim());
          setTokenModalOpen(false);
        }}
        onCancel={() => setTokenModalOpen(false)}
        okText="保存"
        cancelText="取消"
        footer={[
          token ? (
            <Button key="clear" danger onClick={() => { clearToken(); setTokenInput(''); }}>
              清除
            </Button>
          ) : null,
          <Button key="cancel" onClick={() => setTokenModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="ok"
            type="primary"
            onClick={() => {
              setToken(tokenInput.trim());
              setTokenModalOpen(false);
            }}
          >
            保存
          </Button>,
        ]}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          与后端环境变量 <code>AGENT_ADMIN_TOKEN</code> 一致，通过请求头{' '}
          <code>X-Admin-Token</code> 发送。
        </Typography.Paragraph>
        <Input.Password
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="输入 Admin Token"
          onPressEnter={() => {
            setToken(tokenInput.trim());
            setTokenModalOpen(false);
          }}
        />
      </Modal>
    </ConfigProvider>
  );
}
