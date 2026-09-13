import { PlusOutlined } from '@ant-design/icons';
import { useRequest } from '@zeroDraw/common';
import { Button, Card, Empty, Input, List, Space, Typography } from 'antd';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getUserInfo } from '../../services/login';
import { httpCreateProject, httpListProjects } from '../../services/project';
import { useUserStore } from '../../store/useUserStore';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, setUser } = useUserStore();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');

  const { loading: authLoading } = useRequest(getUserInfo, {
    ready: !!localStorage.getItem('token') && !user,
    onSuccess: (data) => {
      if (data) setUser(data as never);
    },
    onError: () => {
      localStorage.removeItem('token');
      navigate('/login', { replace: true });
    },
  });

  const { data, loading, refresh } = useRequest(httpListProjects, {
    ready: !!user,
  });

  if (!localStorage.getItem('token') && !user && !authLoading) {
    return <Navigate to="/login" replace />;
  }

  const handleCreate = async () => {
    const name = title.trim() || `Studio ${new Date().toLocaleDateString()}`;
    setCreating(true);
    try {
      const project = await httpCreateProject({
        name,
        canvasWidth: 1280,
        canvasHeight: 720,
        backgroundColor: '#0a0a0a',
        backgroundVisible: true,
      });
      navigate(`/studio?projectId=${project.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#0a0a0a] text-[#fafafa]">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <Typography.Title level={4} style={{ margin: 0, color: '#fafafa' }}>
          Agent Studio
        </Typography.Title>
        <Space>
          <Link to="/admin/agent/overview" className="text-sm text-white/60 hover:text-white">
            监控
          </Link>
        </Space>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-6">
        <Card
          title="新建 Studio 项目"
          styles={{ header: { color: '#fafafa' }, body: { background: '#141414' } }}
          style={{ background: '#141414', borderColor: 'rgba(255,255,255,0.08)', marginBottom: 24 }}
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="项目名称（可选）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onPressEnter={() => void handleCreate()}
            />
            <Button type="primary" icon={<PlusOutlined />} loading={creating} onClick={() => void handleCreate()}>
              创建并打开
            </Button>
          </Space.Compact>
        </Card>

        <Typography.Title level={5} style={{ color: '#fafafa' }}>
          最近项目
        </Typography.Title>

        <List
          loading={loading || authLoading}
          locale={{ emptyText: <Empty description="暂无项目，请先创建一个" /> }}
          dataSource={data?.list ?? []}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Link key="open" to={`/studio?projectId=${item.id}`}>
                  打开 Studio
                </Link>,
              ]}
            >
              <List.Item.Meta title={item.name} description={item.id} />
            </List.Item>
          )}
        />

        <div className="mt-4">
          <Button type="link" onClick={() => void refresh()}>
            刷新列表
          </Button>
          <Button type="link" onClick={() => navigate('/studio')}>
            无项目 ID 打开 Studio
          </Button>
        </div>
      </main>
    </div>
  );
}
