import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Spin, Row, Col, Empty, Table, DatePicker, Space } from 'antd';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import { getFinanceOverviewApi, getProfitTrendApi, getDailyBreakdownApi } from '@/api/modules/finance';

const COLOR_REVENUE = '#10b981';
const COLOR_COST = '#ef4444';
const COLOR_PROFIT = '#1a365d';

const fmt = (v) => `¥${Number(v).toLocaleString()}`;

// Y 轴金额自适应格式化：>= 1万 显示为 "x.xx万"，否则显示原值
const formatYAxisMoney = (v) => {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (abs >= 10000) {
    return `¥${(n / 10000).toFixed(2)}万`;
  }
  return `¥${n.toLocaleString()}`;
};

// X 轴日期格式化：补 "日" 后缀
const formatDay = (v) => `${v}日`;

// 自定义 Tooltip：保留两位小数 + 千分位
const moneyTooltipFormatter = (value, name) => [fmt(Number(value).toFixed(2)), name];

const ProfitAnalysisTab = () => {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('trend'); // 默认趋势模式，展示近6月图表，避免空旷
  const [months, setMonths] = useState(6); // 3 | 6 | 12 | 36
  const [selectedMonth, setSelectedMonth] = useState(null); // dayjs 对象
  const [overviewData, setOverviewData] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [dailyData, setDailyData] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'overview') {
        const res = await getFinanceOverviewApi();
        setOverviewData(res || {});
        setTrendData([]);
        setDailyData([]);
      } else if (mode === 'month') {
        const m = selectedMonth || dayjs();
        const monthStr = m.format('YYYY-MM');
        const isCurrentMonth = m.isSame(dayjs(), 'month');
        if (isCurrentMonth) {
          // 本月：从总览取月度合计 + 每日明细
          const [overview, daily] = await Promise.all([
            getFinanceOverviewApi(),
            getDailyBreakdownApi(monthStr),
          ]);
          setOverviewData(overview || {});
          setDailyData(daily || []);
        } else {
          // 选择月份：仅取每日明细，合计由前端 reduce
          const daily = await getDailyBreakdownApi(monthStr);
          setDailyData(daily || []);
          setOverviewData({});
        }
      } else {
        // trend：取趋势数据，合计由前端 reduce
        const res = await getProfitTrendApi(months);
        setTrendData(res || []);
        setOverviewData({});
        setDailyData([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [mode, months, selectedMonth]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const isCurrentMonthMode = mode === 'month' && (!selectedMonth || selectedMonth.isSame(dayjs(), 'month'));

  const totals = useMemo(() => {
    if (mode === 'overview') {
      return {
        revenue: Number(overviewData.totalRevenue || 0),
        cost: Number(overviewData.totalCost || 0),
        profit: Number(overviewData.totalProfit || 0),
      };
    }
    if (mode === 'month' && isCurrentMonthMode) {
      return {
        revenue: Number(overviewData.monthRevenue || 0),
        cost: Number(overviewData.monthCost || 0),
        profit: Number(overviewData.monthProfit || 0),
      };
    }
    // 选择月份 或 趋势：reduce 算合计
    const source = mode === 'month' ? dailyData : trendData;
    return (source || []).reduce((acc, item) => ({
      revenue: acc.revenue + Number(item.revenue || 0),
      cost: acc.cost + Number(item.cost || 0),
      profit: acc.profit + Number(item.profit || 0),
    }), { revenue: 0, cost: 0, profit: 0 });
  }, [mode, overviewData, dailyData, trendData, isCurrentMonthMode]);

  // 卡片标签前缀
  const labelPrefix = (() => {
    if (mode === 'overview') return '总';
    if (mode === 'month') return '月度';
    return '合计';
  })();

  // 筛选按钮组
  const filterButtons = [
    { key: 'overview', label: '总览', active: mode === 'overview', onClick: () => { setMode('overview'); setSelectedMonth(null); } },
    { key: 'current', label: '本月', active: mode === 'month' && (!selectedMonth || selectedMonth.isSame(dayjs(), 'month')), onClick: () => { setMode('month'); setSelectedMonth(dayjs()); } },
    { key: '3', label: '近3月', active: mode === 'trend' && months === 3, onClick: () => { setMode('trend'); setMonths(3); setSelectedMonth(null); } },
    { key: '6', label: '近6月', active: mode === 'trend' && months === 6, onClick: () => { setMode('trend'); setMonths(6); setSelectedMonth(null); } },
    { key: '12', label: '近1年', active: mode === 'trend' && months === 12, onClick: () => { setMode('trend'); setMonths(12); setSelectedMonth(null); } },
    { key: '36', label: '近3年', active: mode === 'trend' && months === 36, onClick: () => { setMode('trend'); setMonths(36); setSelectedMonth(null); } },
  ];

  // 每日明细表列
  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date' },
    { title: '收入', dataIndex: 'revenue', key: 'revenue', render: fmt },
    { title: '支出', dataIndex: 'cost', key: 'cost', render: fmt },
    { title: '利润', dataIndex: 'profit', key: 'profit', render: (v) => (
      <span style={{ color: Number(v) >= 0 ? COLOR_PROFIT : COLOR_COST, fontWeight: 600 }}>{fmt(v)}</span>
    ) },
  ];

  const showEmpty = (mode === 'trend' && trendData.length === 0) || (mode === 'month' && dailyData.length === 0);

  return (
    <Spin spinning={loading}>
      <Card
        title="利润分析"
        variant="borderless"
        extra={
          <Space wrap>
            <div style={{ display: 'flex', gap: 8 }}>
              {filterButtons.map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={btn.onClick}
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
            <DatePicker
              picker="month"
              value={mode === 'month' && selectedMonth ? selectedMonth : null}
              onChange={(date) => {
                if (date) {
                  setMode('month');
                  setSelectedMonth(date);
                }
              }}
              placeholder="选择月份"
              allowClear={false}
            />
          </Space>
        }
      >
        {/* 3 个合计卡片：营收 / 成本 / 净利润 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small" variant="borderless" style={{ background: 'var(--bg-hover, #f5f5f5)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>{labelPrefix}营收</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLOR_REVENUE }}>{fmt(totals.revenue)}</div>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" variant="borderless" style={{ background: 'var(--bg-hover, #f5f5f5)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>{labelPrefix}成本</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: COLOR_COST }}>{fmt(totals.cost)}</div>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" variant="borderless" style={{ background: 'var(--bg-hover, #f5f5f5)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>{labelPrefix}净利润</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: totals.profit >= 0 ? COLOR_PROFIT : COLOR_COST }}>{fmt(totals.profit)}</div>
            </Card>
          </Col>
        </Row>

        {showEmpty ? (
          <Empty description="暂无数据" />
        ) : (
          <>
            {/* 趋势模式：折线图 + 月度利润对比柱状图 */}
            {mode === 'trend' && (
              <>
                <Card title="营收 / 成本 / 净利润趋势" variant="borderless" style={{ marginBottom: 16 }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f0f0f0)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={fmt} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="营收" stroke={COLOR_REVENUE} strokeWidth={2} />
                      <Line type="monotone" dataKey="cost" name="成本" stroke={COLOR_COST} strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" name="净利润" stroke={COLOR_PROFIT} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="月度利润对比" variant="borderless">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f0f0f0)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={fmt} />
                      <Legend />
                      <Bar dataKey="revenue" name="营收" fill={COLOR_REVENUE} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cost" name="成本" fill={COLOR_COST} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="净利润" fill={COLOR_PROFIT} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </>
            )}

            {/* 月度模式：每日收支柱状图 + 每日明细表 */}
            {mode === 'month' && (
              <>
                <Card title="每日收支" variant="borderless" style={{ marginBottom: 16 }}>
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={dailyData} margin={{ top: 16, right: 24, left: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f0f0f0)" />
                      <XAxis
                        dataKey="day"
                        tickFormatter={formatDay}
                        tick={{ fontSize: 11 }}
                        angle={-40}
                        textAnchor="end"
                        height={56}
                        interval="preserveStartEnd"
                        label={{ value: '日期', position: 'insideBottom', offset: -14, fontSize: 12, fill: 'var(--text-secondary, #64748b)' }}
                      />
                      <YAxis
                        tickFormatter={formatYAxisMoney}
                        tick={{ fontSize: 11 }}
                        width={72}
                        label={{ value: '金额 (元)', angle: -90, position: 'insideLeft', offset: 4, fontSize: 12, fill: 'var(--text-secondary, #64748b)' }}
                      />
                      <Tooltip formatter={moneyTooltipFormatter} labelFormatter={formatDay} />
                      <Legend />
                      <Bar dataKey="revenue" name="收入" fill={COLOR_REVENUE} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cost" name="支出" fill={COLOR_COST} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card title="每日明细" variant="borderless">
                  <Table
                    dataSource={dailyData}
                    columns={columns}
                    rowKey="day"
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                  />
                </Card>
              </>
            )}
            {/* 总览模式：只展示 3 个卡片，无图表 */}
          </>
        )}
      </Card>
    </Spin>
  );
};

export default ProfitAnalysisTab;
