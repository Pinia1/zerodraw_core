import { ArrowLeftOutlined, StopOutlined } from '@ant-design/icons';
import { useRequest } from '@zeroDraw/common';
import type { AgentAdminTimeline, AgentPromptRunStatus } from '@zeroDraw/api-contract';
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams } from 'react-router-dom';
import {
  httpAdminAgentCloseSession,
  httpAdminAgentTimeline,
} from '../../../services/agentAdmin';
import {
  closeReasonLabel,
  formatDateTime,
  formatDuration,
  promptRunStatusColor,
  sessionStatusColor,
} from './utils';

export default function AgentSessionDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data, loading, error, refresh } = useRequest(
    () => httpAdminAgentTimeline(id),
    { ready: !!id, refreshDeps: [id] },
  );

  const handleClose = () => {
    Modal.confirm({
      title: '强制关闭会话',
      content: '将关闭 harness、清理挂起的前端工具，并标记会话为 closed。',
      okText: '确认关闭',
      okType: 'danger',
      onOk: async () => {
        await httpAdminAgentCloseSession(id, { closeReason: 'admin' });
        message.success('会话已关闭');
        void refresh();
      },
    });
  };

  if (!id) return null;

  const session = data?.session;
  const promptRunColumns: ColumnsType<AgentAdminTimeline['promptRuns'][number]> = [
    {
      title: 'Run ID',
      dataIndex: 'id',
      render: (v: string) => <span className="font-mono text-xs">{v.slice(0, 8)}…</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (s: AgentPromptRunStatus) => <Tag color={promptRunStatusColor[s]}>{s}</Tag>,
    },
    { title: '开始', dataIndex: 'startedAt', render: formatDateTime },
    { title: '结束', dataIndex: 'finishedAt', render: formatDateTime },
    { title: '耗时', dataIndex: 'durationMs', render: formatDuration },
    { title: 'Runtime', dataIndex: 'runtimeHost', render: (v) => v ?? '—' },
    {
      title: 'Worker',
      dataIndex: 'workerSlot',
      render: (v: number | null) => (v != null ? `#${v}` : '—'),
    },
    {
      title: '错误',
      dataIndex: 'errorMessage',
      ellipsis: true,
      render: (v: string | null) => v ?? '—',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/agent/sessions')}>
          返回列表
        </Button>
        <Button onClick={() => void refresh()} loading={loading}>
          刷新
        </Button>
        {session?.status !== 'closed' ? (
          <Button danger icon={<StopOutlined />} onClick={handleClose}>
            强制关闭
          </Button>
        ) : null}
      </Space>

      {error ? <Alert type="error" showIcon message={String(error)} /> : null}

      {session ? (
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }} title="会话信息">
          <Descriptions.Item label="ID">
            <Typography.Text copyable className="font-mono text-xs">
              {session.id}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={sessionStatusColor[session.status]}>{session.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="用户">{session.userId}</Descriptions.Item>
          <Descriptions.Item label="项目">{session.projectId ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="标题">{session.title ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Prompt 次数">{session.promptCount}</Descriptions.Item>
          <Descriptions.Item label="创建">{formatDateTime(session.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="最后 Prompt">{formatDateTime(session.lastPromptAt)}</Descriptions.Item>
          <Descriptions.Item label="最后活动">{formatDateTime(session.lastActivityAt)}</Descriptions.Item>
          <Descriptions.Item label="关闭时间">{formatDateTime(session.closedAt)}</Descriptions.Item>
          <Descriptions.Item label="关闭原因">
            {session.closeReason ? closeReasonLabel[session.closeReason] : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Runtime Host">{session.runtimeHost ?? '—'}</Descriptions.Item>
        </Descriptions>
      ) : null}

      {data?.runtime ? (
        <Alert
          type="info"
          showIcon
          message={
            <Space>
              <span>内存 Runtime</span>
              <Tag color={data.runtime.loaded ? 'green' : 'default'}>
                loaded: {String(data.runtime.loaded)}
              </Tag>
              <Tag color={data.runtime.executing ? 'processing' : 'default'}>
                executing: {String(data.runtime.executing)}
              </Tag>
              {data.runtime.workerSlot != null ? <Tag>worker #{data.runtime.workerSlot}</Tag> : null}
              <span className="text-xs opacity-70">
                heartbeat {formatDateTime(data.runtime.heartbeatAt)}
              </span>
            </Space>
          }
        />
      ) : (
        <Alert
          type="warning"
          showIcon
          message="当前无 runtime 监控快照"
          description="可能 harness 已 idle 释放，或 API 进程曾重启。以时间线中 harness_idle_closed 为准；若仅有 harness_opened 无 idle 关闭，可再发 prompt 验证是否复用。"
        />
      )}

      <Typography.Title level={5}>Prompt Runs</Typography.Title>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={promptRunColumns}
        dataSource={data?.promptRuns ?? []}
        pagination={false}
        scroll={{ x: 900 }}
      />

      <Typography.Title level={5}>事件时间线</Typography.Title>
      <Timeline
        items={(data?.events ?? []).map((evt) => ({
          key: evt.id,
          color: evt.eventType.includes('failed') || evt.eventType.includes('crashed') ? 'red' : 'blue',
          children: (
            <div>
              <div className="font-medium">{evt.eventType}</div>
              <div className="text-xs opacity-60">{formatDateTime(evt.createdAt)}</div>
              {evt.payload != null ? (
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-black/30 p-2 text-xs">
                  {JSON.stringify(evt.payload, null, 2)}
                </pre>
              ) : null}
            </div>
          ),
        }))}
      />
    </div>
  );
}
