import { useRequest } from '@zeroDraw/common';
import type { AgentAdminUsageQuery, AgentAdminUsageRow } from '@zeroDraw/api-contract';
import { Button, Segmented, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { httpAdminAgentUsage } from '../../../services/agentAdmin';
import { formatCost, formatNumber } from './utils';

type GroupBy = AgentAdminUsageQuery['groupBy'];
type RangeDays = 7 | 30 | 90;

export default function AgentUsagePage() {
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [rangeDays, setRangeDays] = useState<RangeDays>(7);

  const range = useMemo(() => {
    const to = Date.now();
    const from = to - rangeDays * 24 * 60 * 60 * 1000;
    return { from, to };
  }, [rangeDays]);

  const { data, loading, error, refresh } = useRequest(
    () =>
      httpAdminAgentUsage({
        groupBy,
        from: range.from,
        to: range.to,
      }),
    { refreshDeps: [groupBy, range.from, range.to] },
  );

  const columns: ColumnsType<AgentAdminUsageRow> = [
    {
      title: groupBy === 'day' ? '日期' : groupBy === 'user' ? '用户' : '项目',
      dataIndex: 'key',
      render: (_, row) => row.day ?? row.userId ?? row.projectId ?? row.key,
    },
    { title: '运行次数', dataIndex: 'runCount', render: formatNumber },
    { title: '失败', dataIndex: 'failedCount', render: formatNumber },
    { title: 'Token', dataIndex: 'totalTokens', render: formatNumber },
    { title: '成本', dataIndex: 'totalCost', render: formatCost },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Space wrap>
        <Segmented
          value={groupBy}
          onChange={(v) => setGroupBy(v as GroupBy)}
          options={[
            { value: 'day', label: '按日' },
            { value: 'user', label: '按用户' },
            { value: 'project', label: '按项目' },
          ]}
        />
        <Segmented
          value={rangeDays}
          onChange={(v) => setRangeDays(v as RangeDays)}
          options={[
            { value: 7, label: '近 7 天' },
            { value: 30, label: '近 30 天' },
            { value: 90, label: '近 90 天' },
          ]}
        />
        <Button onClick={() => void refresh()} loading={loading}>
          刷新
        </Button>
      </Space>

      {error ? <div className="text-red-400">{String(error)}</div> : null}

      <Table
        rowKey="key"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={data ?? []}
        pagination={{ pageSize: 50, showTotal: (t) => `共 ${t} 条` }}
      />
    </div>
  );
}
