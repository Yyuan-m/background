import { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Card, Table, Tag, Spin, Tabs, Select, Space } from 'antd';
import { DollarOutlined, RiseOutlined, FallOutlined, PieChartOutlined, GiftOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '@/components/StatCard';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import {
  getFinanceRecordsApi, getFinanceOverviewApi, getProfitTrendApi, getCostCompositionApi,
} from '@/api/modules/finance';
import InvoiceTab from './tabs/InvoiceTab';
import ReconciliationTab from './tabs/ReconciliationTab';
import CostTab from './tabs/CostTab';
import ProfitAnalysisTab from './tabs/ProfitAnalysisTab';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';

const typeColorMap = { rental: 'green', rental_cost: 'orange', overdue_fee: 'red', violation_fee: 'red', service_fee: 'purple' };
// 流水方向：rental=流入（收入），其余=流出（支出）
const getDirection = (type) => (type === 'rental' ? 'inflow' : 'outflow');

const FinanceOverview = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [records, setRecords] = useState([]);
  const [recordTotal, setRecordTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [recordLoading, setRecordLoading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterDirection, setFilterDirection] = useState(''); // inflow / outflow
  const [profitTrend, setProfitTrend] = useState([]);
  const [costComposition, setCostComposition] = useState([]);
  const [costPeriod, setCostPeriod] = useState('total');
  const [activeTab, setActiveTab] = useState('overview');

  const { map: financeTypeMap } = useDict('finance_type');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // costComposition 由独立的 fetchCostComposition(costPeriod) 负责加载，避免重复请求与竞态
      const [overviewRes, trendRes] = await Promise.all([
        getFinanceOverviewApi(),
        getProfitTrendApi(6),
      ]);
      setStats(overviewRes || {});
      setProfitTrend(trendRes || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const fetchCostComposition = useCallback(async (period) => {
    try {
      const res = await getCostCompositionApi(period);
      setCostComposition(res || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchRecords = useCallback(async () => {
    setRecordLoading(true);
    try {
      const res = await getFinanceRecordsApi({ page, pageSize: 10, type: filterType, direction: filterDirection });
      setRecords(res?.list || []); setRecordTotal(res?.total || 0);
    } catch (e) { console.error(e); } finally { setRecordLoading(false); }
  }, [page, filterType, filterDirection]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => { void fetchRecords(); }, [fetchRecords]);
  useEffect(() => { void fetchCostComposition(costPeriod); }, [costPeriod, fetchCostComposition]);

  // 后端已按 direction 筛选，前端直接使用 records
  const filteredRecords = records;

  const recordColumns = useMemo(() => [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 140 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (t) => <Tag color={typeColorMap[t] || 'default'}>{financeTypeMap[t]?.label || t}</Tag> },
    { title: '方向', dataIndex: 'direction', key: 'direction', width: 80, render: (_, r) => {
      const dir = getDirection(r.type);
      return <Tag color={dir === 'inflow' ? 'green' : 'red'}>{dir === 'inflow' ? '流入' : '流出'}</Tag>;
    } },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 80 },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, render: (v, r) => {
      const dir = getDirection(r.type);
      const isInflow = dir === 'inflow';
      const abs = Math.abs(Number(v || 0));
      return <span style={{ color: isInflow ? 'var(--success-color, #10b981)' : 'var(--error-color, #ef4444)', fontWeight: 600 }}>{isInflow ? '+' : '-'}¥{abs.toLocaleString()}</span>;
    } },
    { title: '方式', dataIndex: 'method', key: 'method', width: 100 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s) => s === 'completed' ? <Tag color="green">已完成</Tag> : <Tag color="orange">待处理</Tag> },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: formatTime.render },
  ], [financeTypeMap]);

  const tabItems = useMemo(() => [
    { key: 'overview', label: '营收总览', children: (
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}><StatCard icon={<RiseOutlined />} title="总营收" value={stats?.totalRevenue || 0} prefix="¥" color="#10b981" /></Col>
          <Col xs={24} sm={12} lg={6}><StatCard icon={<GiftOutlined />} title="优惠券优惠" value={stats?.totalCouponDiscount || 0} prefix="¥" color="#fa8c16" /></Col>
          <Col xs={24} sm={12} lg={6}><StatCard icon={<FallOutlined />} title="总成本" value={stats?.totalCost || 0} prefix="¥" color="#ef4444" /></Col>
          <Col xs={24} sm={12} lg={6}><StatCard icon={<DollarOutlined />} title="净利润" value={stats?.totalProfit || 0} prefix="¥" color="#1a365d" /></Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={6}><Card size="small" variant="borderless"><div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>本月营收</div><div style={{ fontSize: 20, fontWeight: 600, color: '#10b981' }}>¥{Number(stats?.monthRevenue || 0).toLocaleString()}</div></Card></Col>
          <Col xs={24} sm={6}><Card size="small" variant="borderless"><div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>本月优惠</div><div style={{ fontSize: 20, fontWeight: 600, color: '#fa8c16' }}>¥{Number(stats?.monthCouponDiscount || 0).toLocaleString()}</div></Card></Col>
          <Col xs={24} sm={6}><Card size="small" variant="borderless"><div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>本月成本</div><div style={{ fontSize: 20, fontWeight: 600, color: '#ef4444' }}>¥{Number(stats?.monthCost || 0).toLocaleString()}</div></Card></Col>
          <Col xs={24} sm={6}><Card size="small" variant="borderless"><div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>本月净利润</div><div style={{ fontSize: 20, fontWeight: 600, color: Number(stats?.monthProfit || 0) >= 0 ? '#1a365d' : '#ef4444' }}>¥{Number(stats?.monthProfit || 0).toLocaleString()}</div></Card></Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="营收 / 成本 / 净利润趋势（近6月）" variant="borderless">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={profitTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f0f0f0)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="营收" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="cost" name="成本" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" name="净利润" stroke="#1a365d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="成本构成" variant="borderless" extra={
              <Select size="small" value={costPeriod} onChange={setCostPeriod} style={{ width: 90 }}
                options={[{ value: 'total', label: '全部' }, { value: 'month', label: '本月' }, { value: 'year', label: '本年' }]} />
            }>
              <ResponsiveContainer width="100%" height={300}>
                {/* key 绑定数据长度，数据从空→有数据时强制重建组件，规避 recharts 不响应数据变化的渲染问题 */}
                <PieChart key={costComposition?.length || 0}>
                  <Pie data={costComposition || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ¥${Number(e.value || 0).toLocaleString()}`}>
                    {(costComposition || []).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
        <Card title="资金流水" variant="borderless" style={{ marginTop: 16 }} extra={
          <Space>
            <Select value={filterDirection || undefined} onChange={(v) => { setFilterDirection(v || ''); setPage(1); }} allowClear placeholder="方向" style={{ width: 100 }}
              options={[{ value: 'inflow', label: '流入' }, { value: 'outflow', label: '流出' }]} />
            <DictSelect dictType="finance_type" placeholder="类型" value={filterType || undefined} onChange={(v) => { setFilterType(v); setPage(1); }} allowClear style={{ width: 140 }} />
          </Space>
        }>
          <div>
          <Table columns={recordColumns} dataSource={filteredRecords} rowKey="id" loading={recordLoading} scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize: 10,
            total: recordTotal,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p) => setPage(p),
          }} />
          </div>
        </Card>
      </Spin>
    ) },
    { key: 'invoice', label: '发票管理', children: <InvoiceTab /> },
    { key: 'reconciliation', label: '对账管理', children: <ReconciliationTab /> },
    { key: 'cost', label: '成本统计', children: <CostTab /> },
    { key: 'profit', label: <><PieChartOutlined /> 利润分析</>, children: <ProfitAnalysisTab /> },
  ], [loading, stats, profitTrend, costComposition, costPeriod, filterType, filterDirection, page, recordTotal, filteredRecords, recordLoading, recordColumns]);

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.finance')}</h2>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
};

FinanceOverview.routeConfig = { path: '/finance', permission: 'finance' };
export default FinanceOverview;
