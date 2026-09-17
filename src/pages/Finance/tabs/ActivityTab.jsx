import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Spin, Table, Tag, Row, Col, Statistic, Alert } from 'antd';
import { GiftOutlined, CheckCircleOutlined, DollarOutlined, PercentageOutlined } from '@ant-design/icons';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getActivityStatsApi } from '@/api/modules/finance';

const fmtMoney = (v) => `¥${Number(v || 0).toLocaleString()}`;

const ActivityTab = () => {
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6); // 3 | 6 | 12
  const [summary, setSummary] = useState({});
  const [monthRows, setMonthRows] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getActivityStatsApi(months);
      setSummary(res?.summary || {});
      setMonthRows(res?.months || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [months]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // 明细表合计行（筛选范围内的总计）
  const tableSummary = useMemo(() => monthRows.reduce((acc, r) => ({
    claimed: acc.claimed + Number(r.claimed || 0),
    usedCount: acc.usedCount + Number(r.usedCount || 0),
    discountAmount: acc.discountAmount + Number(r.discountAmount || 0),
  }), { claimed: 0, usedCount: 0, discountAmount: 0 }), [monthRows]);

  const columns = [
    { title: '月份', dataIndex: 'month', key: 'month', width: 100, render: (v) => <strong>{v}</strong> },
    { title: '领取数量', dataIndex: 'claimed', key: 'claimed', width: 110, render: (v) => Number(v || 0) },
    { title: '核销数量', dataIndex: 'usedCount', key: 'usedCount', width: 110, render: (v) => Number(v || 0) },
    {
      title: '当月核销率', dataIndex: 'usageRate', key: 'usageRate', width: 110,
      render: (v) => <Tag color={Number(v) >= 60 ? 'green' : 'orange'}>{Number(v || 0).toFixed(1)}%</Tag>,
    },
    { title: '优惠金额', dataIndex: 'discountAmount', key: 'discountAmount', width: 130, render: (v) => <span style={{ color: '#fa8c16', fontWeight: 600 }}>{fmtMoney(v)}</span> },
  ];

  // 时间范围切换按钮（与对账管理的切换交互一致）
  const filterButtons = [3, 6, 12].map((m) => ({
    m,
    label: `近${m}月`,
    active: months === m,
  }));

  return (
    <Spin spinning={loading}>
      <Alert
        message="统计规则说明"
        description="下方汇总卡片统计库里全部历史优惠券数据（不限时间，不受时间范围筛选影响）：累计领取含全部状态（未使用/锁定/已核销），累计核销与优惠金额仅统计已核销的券，金额取关联订单的优惠券折扣（仅已完成订单，与财务统计口径一致）。下方图表与明细按时间范围筛选：领取数量按领券时间分月，核销按核销时间分月。当月核销率 = 当月核销数 ÷ 当月领取数，因领取后可跨月核销，单月核销率可能超过 100%。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 统计卡片（全部历史汇总，不受时间筛选影响）：累计领取 / 累计核销 / 累计优惠金额 / 总核销率 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless">
            <Statistic title="累计领取（张）" value={Number(summary?.totalClaimed || 0)} prefix={<GiftOutlined style={{ color: '#3b82f6' }} />} valueStyle={{ color: '#3b82f6' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless">
            <Statistic title="累计核销（张）" value={Number(summary?.totalUsed || 0)} prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />} valueStyle={{ color: '#10b981' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless">
            <Statistic title="累计优惠金额" value={Number(summary?.totalDiscountAmount || 0)} prefix={<DollarOutlined style={{ color: '#fa8c16' }} />} formatter={(v) => fmtMoney(v)} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless">
            <Statistic title="总核销率" value={Number(summary?.totalUsageRate || 0)} prefix={<PercentageOutlined style={{ color: '#1a365d' }} />} suffix="%" valueStyle={{ color: '#1a365d' }} />
          </Card>
        </Col>
      </Row>

      {/* 柱线组合图：柱=每月领取/核销数量，线=优惠金额 */}
      <Card
        title="优惠券领取 / 核销趋势"
        variant="borderless"
        style={{ marginBottom: 16 }}
        extra={(
          <div style={{ display: 'flex', gap: 8 }}>
            {filterButtons.map((btn) => (
              <button
                key={btn.m}
                type="button"
                onClick={() => setMonths(btn.m)}
                style={{
                  padding: '2px 10px',
                  borderRadius: 4,
                  border: `1px solid ${btn.active ? 'var(--primary-color, #3b82f6)' : 'var(--border-color, #e2e8f0)'}`,
                  background: btn.active ? 'var(--primary-color, #3b82f6)' : 'transparent',
                  color: btn.active ? '#fff' : 'var(--text-secondary, #64748b)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f0f0f0)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="count" tick={{ fontSize: 11 }} allowDecimals={false} label={{ value: '数量（张）', angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--text-secondary, #64748b)' }} />
            <YAxis yAxisId="amount" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${Number(v).toLocaleString()}`} label={{ value: '优惠金额', angle: 90, position: 'insideRight', fontSize: 12, fill: 'var(--text-secondary, #64748b)' }} />
            <Tooltip formatter={(value, name) => (name === '优惠金额' ? fmtMoney(value) : `${value} 张`)} />
            <Legend />
            <Bar yAxisId="count" dataKey="claimed" name="领取数量" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="count" dataKey="usedCount" name="核销数量" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Line yAxisId="amount" type="monotone" dataKey="discountAmount" name="优惠金额" stroke="#fa8c16" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* 按月明细表 */}
      <Card title="按月明细" variant="borderless">
        <Table
          columns={columns}
          dataSource={monthRows}
          rowKey="month"
          size="small"
          pagination={false}
          scroll={{ x: 600 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><strong>合计</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={1}><strong>{tableSummary.claimed} 张</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2}><strong>{tableSummary.usedCount} 张</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <strong>{tableSummary.claimed > 0 ? ((tableSummary.usedCount * 100 / tableSummary.claimed)).toFixed(1) : '0.0'}%</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}><strong style={{ color: '#fa8c16' }}>{fmtMoney(tableSummary.discountAmount)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </Spin>
  );
};

export default ActivityTab;
