import { useRequest } from '@zeroDraw/common';
import { Button, Input, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AgentAdminSessionRow } from '@zeroDraw/api-contract';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { httpAdminAgentSessions } from '../../../services/agentAdmin';
import { formatDateTime, sessionStatusColor } from './utils';

export default function AgentSessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);
  const status = searchParams.get('status') as 'active' | 'suspended' | 'closed' | null;
  const [userIdInput, setUserIdInput] = useState(searchParams.get('userId') ?? '');
  const [projectIdInput, setProjectIdInput] = useState(searchParams.get('projectId') ?? '');

  const userId = userIdInput ? Number(userIdInput) : undefined;
  const projectId = projectIdInput || undefined;

  const { data, loading, error, refresh } = useRequest(
    () =>
      httpAdminAgentSessions({
        page,
        pageSize: 20,
        status: status ?? undefined,
        userId: Number.isFinite(userId) ? userId : undefined,
        projectId,
      }),
    { refreshDeps: [page, status, userIdInput, projectIdInput] },
  );

  const applyFilters = () => {
    setSearchParams((prev) => {
      prev.set('page', '1');
      if (userIdInput) prev.set('userId', userIdInput);
      else prev.delete('userId');
      if (projectIdInput) prev.set('projectId', projectIdInput);
      else prev.delete('projectId');
      return prev;
    });
  };

  const columns: ColumnsType<AgentAdminSessionRow> = [
    {
      title: '会话 ID',
      dataIndex: 'id',
      render: (id: string) => (
        <Link to={`/admin/agent/sessions/${id}`} className="font-mono text-xs">
          {id.slice(0, 8)}…
        </Link>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => <Tag color={sessionStatusColor[s]}>{s}</Tag>,
    },
    { title: '用户', dataIndex: 'userId', width: 72 },
    {
      title: '项目',
      dataIndex: 'projectId',
      ellipsis: true,
      render: (v: string | null) => v ?? '—',
    },
    { title: 'Prompt 次数', dataIndex: 'promptCount', width: 100 },
    {
      title: '最后 Prompt',
      dataIndex: 'lastPromptAt',
      width: 168,
      render: formatDateTime,
    },
    {
      title: '最后活动',
      dataIndex: 'lastActivityAt',
      width: 168,
      render: formatDateTime,
    },
    {
      title: 'Host 模式',
      dataIndex: 'runtimeHost',
      width: 96,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '操作',
      width: 72,
      render: (_, row) => <Link to={`/admin/agent/sessions/${row.id}`}>详情</Link>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Space wrap>
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 120 }}
          value={status ?? undefined}
          onChange={(v) => {
            setSearchParams((prev) => {
              prev.set('page', '1');
              if (v) prev.set('status', v);
              else prev.delete('status');
              return prev;
            });
          }}
          options={[
            { value: 'active', label: 'active' },
            { value: 'suspended', label: 'suspended' },
            { value: 'closed', label: 'closed' },
          ]}
        />
        <Input
          placeholder="userId"
          style={{ width: 100 }}
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          onPressEnter={applyFilters}
        />
        <Input
          placeholder="projectId"
          style={{ width: 220 }}
          value={projectIdInput}
          onChange={(e) => setProjectIdInput(e.target.value)}
          onPressEnter={applyFilters}
        />
        <Button type="primary" onClick={applyFilters}>
          筛选
        </Button>
        <Button onClick={() => void refresh()}>刷新</Button>
      </Space>

      {error ? <div className="text-red-400">{String(error)}</div> : null}

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={data?.list ?? []}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total ?? 0,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p) => {
            setSearchParams((prev) => {
              prev.set('page', String(p));
              return prev;
            });
          },
        }}
        scroll={{ x: 960 }}
      />
    </div>
  );
}
