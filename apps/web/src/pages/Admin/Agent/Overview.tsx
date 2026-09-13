import { ReloadOutlined } from '@ant-design/icons';
import { useRequest } from '@zeroDraw/common';
import { Alert, Button, Card, Col, Row, Statistic, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { httpAdminAgentOverview } from '../../../services/agentAdmin';
import { formatCost, formatNumber } from './utils';

export default function AgentOverviewPage() {
  const { data, loading, error, refresh } = useRequest(httpAdminAgentOverview, {
    pollingInterval: 30_000,
  });

  if (error) {
    return <Alert type="error" showIcon message={String(error)} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          总览
        </Typography.Title>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void refresh()}>
          刷新
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} size="small" title="会话">
            <Statistic title="总数" value={data?.sessions.total ?? 0} />
            <div className="mt-2 flex flex-wrap gap-1">
              <Tag color="green">活跃 {data?.sessions.active ?? 0}</Tag>
              <Tag color="orange">挂起 {data?.sessions.suspended ?? 0}</Tag>
              <Tag>已关闭 {data?.sessions.closed ?? 0}</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} size="small" title="Prompt 运行">
            <Statistic title="累计" value={formatNumber(data?.prompts.totalRuns ?? 0)} />
            <div className="mt-2 flex flex-wrap gap-1">
              <Tag color="blue">今日 {data?.prompts.todayRuns ?? 0}</Tag>
              <Tag color="red">失败 {data?.prompts.failedRuns ?? 0}</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} size="small" title="用量">
            <Statistic title="Token" value={formatNumber(data?.usage.totalTokens ?? 0)} />
            <Statistic
              className="mt-2"
              title="估算成本"
              value={formatCost(data?.usage.totalCost ?? 0)}
              valueStyle={{ fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} size="small" title="内存 Harness">
            <Statistic title="已加载" value={data?.runtime.loadedCount ?? 0} />
            <div className="mt-2 flex flex-wrap gap-1">
              <Tag color={data?.runtime.executingCount ? 'processing' : 'default'}>
                执行中 {data?.runtime.executingCount ?? 0}
              </Tag>
              <Tag>Host {data?.runtime.runtimeHost ?? '—'}</Tag>
            </div>
            <Link to="/admin/agent/runtime" className="mt-2 inline-block text-xs">
              查看明细 →
            </Link>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
