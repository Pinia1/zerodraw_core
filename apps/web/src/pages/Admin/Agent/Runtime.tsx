import { ReloadOutlined } from '@ant-design/icons';
import type { AgentAdminRuntimeSnapshot } from '@zeroDraw/api-contract';
import { useRequest } from '@zeroDraw/common';
import { Alert, Button, Segmented, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { httpAdminAgentRuntime } from '../../../services/agentAdmin';
import { formatDateTime } from './utils';

type FilterMode = 'loaded' | 'executing' | 'all';

export default function AgentRuntimePage() {
  const [filter, setFilter] = useState<FilterMode>('loaded');

  const { data, loading, error, refresh } = useRequest(httpAdminAgentRuntime, {
    pollingInterval: 10_000,
  });

  const rows = useMemo(() => {
    const list = data?.snapshots ?? [];
    if (filter === 'loaded') return list.filter((s) => s.loaded);
    if (filter === 'executing') return list.filter((s) => s.executing);
    return list;
  }, [data?.snapshots, filter]);

  const columns: ColumnsType<AgentAdminRuntimeSnapshot> = [
    {
      title: '会话 ID',
      dataIndex: 'sessionId',
      render: (id: string) => (
        <Link to={`/admin/agent/sessions/${id}`} className="font-mono text-xs">
          {id.slice(0, 8)}…
        </Link>
      ),
    },
    {
      title: 'Harness',
      width: 100,
      render: (_, row) => (
        <Space size={4}>
          <Tag color={row.loaded ? 'green' : 'default'}>{row.loaded ? 'loaded' : 'idle'}</Tag>
          {row.executing ? <Tag color="processing">executing</Tag> : null}
        </Space>
      ),
    },
    { title: '用户', dataIndex: 'userId', width: 100 },
    {
      title: '项目',
      dataIndex: 'projectId',
      ellipsis: true,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Worker',
      dataIndex: 'workerSlot',
      width: 72,
      render: (v: number | null) => (v != null ? `#${v}` : '—'),
    },
    {
      title: 'Host 模式',
      dataIndex: 'runtimeHost',
      width: 96,
    },
    {
      title: '心跳',
      dataIndex: 'heartbeatAt',
      width: 168,
      render: formatDateTime,
    },
    {
      title: '操作',
      width: 72,
      render: (_, row) => <Link to={`/admin/agent/sessions/${row.sessionId}`}>详情</Link>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            内存 Harness
          </Typography.Title>
          <Typography.Text type="secondary" className="text-xs">
            loaded / executing 快照 TTL 与 AGENT_HARNESS_IDLE_MS 对齐（默认约 15 分钟）；harness
            释放后（loaded=false）约 90s 内从列表消失。
          </Typography.Text>
        </div>
        <Space>
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as FilterMode)}
            options={[
              { value: 'loaded', label: `loaded (${data?.loadedCount ?? 0})` },
              { value: 'executing', label: `executing (${data?.executingCount ?? 0})` },
              { value: 'all', label: `全部 (${data?.snapshots.length ?? 0})` },
            ]}
          />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void refresh()}>
            刷新
          </Button>
        </Space>
      </div>

      {error ? <Alert type="error" showIcon message={String(error)} /> : null}

      {!loading && filter === 'loaded' && rows.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="当前快照中没有 loaded=true 的条目"
          description={
            (data?.snapshots.length ?? 0) > 0
              ? `有 ${data!.snapshots.length} 条 loaded=false 快照，请切到「全部」查看。是否已从内存释放以 harness_idle_closed 事件为准。`
              : '当前无 loaded harness。发 prompt 后应出现在列表中；idle 释放后约 90s 内条目会消失。'
          }
        />
      ) : null}

      <Table
        rowKey="sessionId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 880 }}
      />
    </div>
  );
}
