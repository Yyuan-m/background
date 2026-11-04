import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Table, Spin, Select, Space } from 'antd';
import {
  ShoppingCartOutlined, CarOutlined, DollarOutlined, RiseOutlined,
  WarningOutlined, ToolOutlined, ClockCircleOutlined,
  FireOutlined, ThunderboltOutlined, ArrowRightOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import StatCard from '@/components/StatCard';
// 轮播图已从仪表盘移除，改为仅在系统设置中配置，供 C 端官网首页使用
import { getDashboardStatsApi, getOrderTrendApi, getRevenueDataApi, getVehicleTypeDataApi,
  getVehicleHotDataApi, getRepurchaseDataApi, getPeakHoursDataApi,
  getLatestOrdersApi, getLatestCustomersApi, getCouponUsageApi } from '@/api/modules/finance';
import '@/pages/Dashboard/Dashboard.scss';
import { formatTime } from '@/utils/formatTime';
import { getChartColor } from '@/utils/chartColors';
import useAuthStore from '@/store/useAuthStore';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

const axisTick = { fontSize: 12, fill: 'var(--text-muted, #94a3b8)' };

const compactNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (Math.abs(n) >= 10000) {
    const digits = Math.abs(n) >= 100000 ? 0 : 1;
    return `${(n / 10000).toFixed(digits)}万`;
  }
  return n.toLocaleString();
};

const formatTipValue = (item) => {
  const n = Number(item.value || 0).toLocaleString();
  if (item.dataKey === 'discountTotal' || item.dataKey === 'revenue') return `¥${n}`;
  if (item.dataKey === 'usedCount') return `${n} 次`;
  return n;
};

const readChartTheme = () => {
  const fallback = {
    c1: '#1a365d',
    c2: '#c9a96e',
    c3: '#3b82f6',
    accent: '#c9a96e',
    success: '#10b981',
    grid: '#f0f0f0',
    muted: '#94a3b8',
  };
  if (typeof document === 'undefined') return fallback;
  const style = getComputedStyle(document.documentElement);
  const pick = (name, fb) => style.getPropertyValue(name).trim() || fb;
  return {
    c1: pick('--chart-color-1', fallback.c1),
    c2: pick('--chart-color-2', fallback.c2),
    c3: pick('--chart-color-3', fallback.c3),
    accent: pick('--accent-color', fallback.accent),
    success: pick('--success-color', fallback.success),
    grid: pick('--chart-grid', fallback.grid),
    muted: pick('--text-muted', fallback.muted),
  };
};

const useChartTheme = () => {
  const [theme, setTheme] = useState(readChartTheme);
  useEffect(() => {
    const update = () => setTheme(readChartTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-theme-mode'],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dash-tooltip">
      {label != null && label !== '' && <div className="dash-tooltip-label">{label}</div>}
      <div className="dash-tooltip-list">
        {payload.map((item) => (
          <div className="dash-tooltip-row" key={item.dataKey || item.name}>
            <span className="dash-tooltip-dot" style={{ background: item.color || item.fill }} />
            <span className="dash-tooltip-name">{item.name}</span>
            <span className="dash-tooltip-value">{formatTipValue(item)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChartEmpty = ({ text = '暂无数据' }) => (
  <div className="dash-empty">{text}</div>
);

const renderLegend = () => (
  <Legend
    iconType="circle"
    iconSize={8}
    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
    formatter={(value) => <span className="dash-legend-text">{value}</span>}
  />
);

// 卡片标题：带快捷跳转箭头，extra（筛选框等）渲染在右箭头左边
const CardTitle = ({ icon, title, desc, to, extra }) => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-card-title">
      <div className="dashboard-card-title-main">
        <span className="dashboard-card-title-text">
          {icon && <span className="dashboard-card-title-icon">{icon}</span>}
          {title}
        </span>
        {desc && <span className="dashboard-card-title-desc">{desc}</span>}
      </div>
      <span className="dashboard-card-title-actions">
        {extra}
        {to && (
          <button
            type="button"
            className="dashboard-card-jump"
            onClick={() => navigate(to)}
            aria-label={`跳转到${title}`}
          >
            <ArrowRightOutlined />
          </button>
        )}
      </span>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const colors = useChartTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [orderTrend, setOrderTrend] = useState([]);
  const [, setRevenueData] = useState([]);
  const [vehicleTypeData, setVehicleTypeData] = useState([]);
  const [vehicleHotData, setVehicleHotData] = useState([]);
  const [repurchaseData, setRepurchaseData] = useState([]);
  const [peakHoursData, setPeakHoursData] = useState([]);
  const [latestOrders, setLatestOrders] = useState([]);
  const [latestCustomers, setLatestCustomers] = useState([]);
  const [couponUsageData, setCouponUsageData] = useState([]);
  const [couponStatusFilter, setCouponStatusFilter] = useState('');
  const [couponTypeFilter, setCouponTypeFilter] = useState('');
  // 最新订单状态筛选，默认显示租赁中的订单
  const [latestOrderStatus, setLatestOrderStatus] = useState('renting');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes, revenueRes, typeRes, hotRes, repurchaseRes, peakRes, customersRes, couponRes] = await Promise.all([
        getDashboardStatsApi(), getOrderTrendApi(), getRevenueDataApi(), getVehicleTypeDataApi(),
        getVehicleHotDataApi(), getRepurchaseDataApi(), getPeakHoursDataApi(),
        getLatestCustomersApi(), getCouponUsageApi(),
      ]);
      setStats(statsRes || {}); setOrderTrend(trendRes || []); setRevenueData(revenueRes || []);
      setVehicleTypeData(typeRes || []); setVehicleHotData(hotRes || []); setRepurchaseData(repurchaseRes || []);
      setPeakHoursData(peakRes || []); setLatestCustomers(customersRes || []);
      setCouponUsageData(couponRes || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  // 最新订单独立请求：状态筛选变化时只刷新该卡片
  const fetchLatestOrders = useCallback(async () => {
    const res = await getLatestOrdersApi(latestOrderStatus);
    setLatestOrders(res || []);
  }, [latestOrderStatus]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => { void fetchLatestOrders(); }, [fetchLatestOrders]);

  // 优惠券图筛选：按上线状态（published 已投放 / offline 已下线 / draft 草稿）与券类型（discount 折扣 / deduction 满减 / duration 时长）
  const filteredCouponData = useMemo(() => (couponUsageData || []).filter((c) => {
    if (couponStatusFilter && c.status !== couponStatusFilter) return false;
    if (couponTypeFilter && c.type !== couponTypeFilter) return false;
    return true;
  }), [couponUsageData, couponStatusFilter, couponTypeFilter]);

  const rankedCustomers = useMemo(() => (
    [...(repurchaseData || [])]
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .slice(0, 8)
  ), [repurchaseData]);

  const rankMax = rankedCustomers[0] ? Number(rankedCustomers[0].value || 0) : 0;

  const peakMax = useMemo(
    () => peakHoursData.reduce((max, item) => Math.max(max, Number(item.orders || 0)), 0),
    [peakHoursData],
  );

  const vehicleTotal = useMemo(
    () => vehicleTypeData.reduce((sum, item) => sum + Number(item.value || 0), 0),
    [vehicleTypeData],
  );

  const statusMap = useMemo(() => ({
    pending: { text: '待支付', tone: 'warn' },
    paid: { text: '已支付', tone: 'info' },
    renting: { text: '租赁中', tone: 'ok' },
    completed: { text: '已完成', tone: 'mute' },
    cancelled: { text: '已取消', tone: 'danger' },
    overdue: { text: '已逾期', tone: 'danger' },
  }), []);

  const orderColumns = useMemo(() => [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 148, render: (v) => <span className="dash-mono">{v}</span> },
    { title: '联系人', dataIndex: 'contactName', key: 'contactName', width: 80 },
    { title: '车辆', dataIndex: 'carName', key: 'carName', ellipsis: true },
    { title: '金额', dataIndex: 'totalAmount', key: 'totalAmount', width: 110, render: (v) => <span className="dash-amount">¥{v?.toLocaleString()}</span> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 88, render: (s) => { const cfg = statusMap[s] || { text: s, tone: 'mute' }; return <span className={`dash-status dash-status--${cfg.tone}`}>{cfg.text}</span>; } },
    { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 150, render: formatTime.render },
  ], [statusMap]);

  const customerColumns = useMemo(() => [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 80 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 120, render: (v) => <span className="dash-mono">{v}</span> },
    { title: '会员', dataIndex: 'membershipName', key: 'membershipName', width: 88, render: (v) => <span className="dash-member">{v || '—'}</span> },
    {
      title: '信用分',
      dataIndex: 'creditScore',
      key: 'creditScore',
      width: 78,
      render: (v) => <span className={`dash-score ${v >= 80 ? 'is-good' : v >= 60 ? 'is-mid' : 'is-low'}`}>{v}</span>,
    },
    { title: '累计消费', dataIndex: 'totalSpent', key: 'totalSpent', width: 100, render: (v) => <span className="dash-amount">¥{v?.toLocaleString()}</span> },
  ], []);

  const today = new Date();
  const hour = today.getHours();
  const hello = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const displayName = user?.nickname || user?.username || '管理员';

  const alerts = [
    stats?.overdueOrders > 0 && {
      key: 'overdue',
      tone: 'danger',
      icon: <WarningOutlined />,
      text: `${stats.overdueOrders} 个逾期订单待处理`,
      to: '/orders',
    },
    stats?.pendingComplaints > 0 && {
      key: 'complaint',
      tone: 'warn',
      icon: <ToolOutlined />,
      text: `${stats.pendingComplaints} 个投诉工单待处理`,
      to: '/after-sales',
    },
    stats?.pendingMaintenance > 0 && {
      key: 'maintain',
      tone: 'info',
      icon: <ClockCircleOutlined />,
      text: `${stats.pendingMaintenance} 辆车待维保`,
      to: '/vehicles/maintenance',
    },
  ].filter(Boolean);

  return (
    <div className="page-container dashboard-page">
      <header className="dash-hero">
        <div className="dash-hero-copy">
          <div className="dash-kicker">
            <span className="dash-kicker-mark" />
            经营总览
          </div>
          <h1 className="dash-hello">{hello}，{displayName}</h1>
          <p className="dash-subtitle">车队出租、订单履约与营收表现，集中在这一页。</p>
        </div>
        <div className="dash-date">
          <span className="dash-date-day">{today.getMonth() + 1}月{today.getDate()}日</span>
          <span className="dash-date-sub">{today.getFullYear()} · {WEEKDAYS[today.getDay()]}</span>
        </div>
      </header>

      <Spin spinning={loading}>
        <div className="dash-body">
          {!loading && (
            alerts.length > 0 ? (
              <div className="dash-alerts">
                {alerts.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`dash-alert dash-alert--${item.tone}`}
                    onClick={() => navigate(item.to)}
                  >
                    <span className="dash-alert-icon">{item.icon}</span>
                    <span>{item.text}</span>
                    <ArrowRightOutlined className="dash-alert-arrow" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="dash-clear">
                <CheckCircleOutlined />
                <span>当前没有待处理预警</span>
              </div>
            )
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <StatCard variant="premium" icon={<ShoppingCartOutlined />} title="订单总数" caption="累计成交订单" value={stats.totalOrders || 0} color={colors.c1} to="/orders" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard variant="premium" icon={<DollarOutlined />} title="本年营收" caption="本年度累计收入" value={stats.yearRevenue || 0} prefix="¥" color={colors.accent} to="/finance" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard variant="premium" icon={<RiseOutlined />} title="本月营收" caption="本月已确认收入" value={stats.monthRevenue || 0} prefix="¥" color={colors.success} to="/finance" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard variant="premium" icon={<CarOutlined />} title="出租率" caption="当前在租占比" value={stats?.rentalRate ? Math.round(stats.rentalRate * 100) : 0} suffix="%" color={colors.c3} to="/vehicles" />
            </Col>
          </Row>

          <section className="dash-section">
            <div className="dash-section-head">
              <h2>经营走势</h2>
              <p>订单量与营收的月度对照</p>
            </div>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Card title={<CardTitle title="订单与营收趋势" to="/orders" />} variant="borderless" className="chart-card">
                  {orderTrend.length === 0 ? <ChartEmpty /> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={orderTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashOrdersFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.c1} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={colors.c1} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="dashRevenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.c2} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={colors.c2} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="4 6" />
                        <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                        <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={48} tickFormatter={compactNumber} />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: colors.muted, strokeDasharray: '3 3' }} />
                        {renderLegend()}
                        <Area yAxisId="left" type="monotone" dataKey="orders" name="订单数" stroke={colors.c1} fill="url(#dashOrdersFill)" strokeWidth={2.4} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                        <Area yAxisId="right" type="monotone" dataKey="revenue" name="营收(¥)" stroke={colors.c2} fill="url(#dashRevenueFill)" strokeWidth={2.4} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title={<CardTitle title="车辆类型占比" to="/vehicles" />} variant="borderless" className="chart-card">
                  {vehicleTypeData.length === 0 ? <ChartEmpty /> : (
                    <div className="dash-donut-wrap">
                      <div className="dash-donut">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={vehicleTypeData}
                              cx="50%"
                              cy="50%"
                              innerRadius="62%"
                              outerRadius="84%"
                              paddingAngle={3}
                              dataKey="value"
                              nameKey="name"
                              stroke="none"
                            >
                              {vehicleTypeData.map((entry, index) => <Cell key={entry.name || index} fill={getChartColor(index, entry.color)} />)}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="dash-donut-center">
                          <span className="dash-donut-value">{vehicleTotal.toLocaleString()}</span>
                          <span className="dash-donut-caption">合计</span>
                        </div>
                      </div>
                      <ul className="dash-legend">
                        {vehicleTypeData.map((entry, index) => (
                          <li key={entry.name || index}>
                            <i style={{ background: getChartColor(index, entry.color) }} />
                            <span>{entry.name}</span>
                            <strong>{Number(entry.value || 0).toLocaleString()}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </section>

          <section className="dash-section">
            <div className="dash-section-head">
              <h2>运营洞察</h2>
              <p>高峰、热门车型与复购客户</p>
            </div>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={8}>
                <Card title={<CardTitle icon={<ThunderboltOutlined />} title="高峰时段分析" to="/orders" />} variant="borderless" className="chart-card">
                  {peakHoursData.length === 0 ? <ChartEmpty /> : (
                    <ResponsiveContainer width="100%" height={268}>
                      <BarChart data={peakHoursData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="4 6" />
                        <XAxis dataKey="hour" tick={{ ...axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--table-row-hover, rgba(0,0,0,0.04))' }} />
                        <Bar dataKey="orders" name="订单量" radius={[6, 6, 0, 0]} maxBarSize={22}>
                          {peakHoursData.map((entry, index) => (
                            <Cell
                              key={entry.hour || index}
                              fill={peakMax > 0 && Number(entry.orders) === peakMax ? colors.accent : colors.c1}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title={<CardTitle icon={<FireOutlined />} title="车型热度排行" to="/vehicles" />} variant="borderless" className="chart-card">
                  {vehicleHotData.length === 0 ? <ChartEmpty /> : (
                    <ResponsiveContainer width="100%" height={268}>
                      <BarChart data={vehicleHotData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid horizontal={false} stroke={colors.grid} strokeDasharray="4 6" />
                        <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" width={84} tick={{ ...axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--table-row-hover, rgba(0,0,0,0.04))' }} />
                        <Bar dataKey="orders" name="租赁次数" fill={colors.c2} radius={[0, 6, 6, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title={<CardTitle title="客户租车次数排行" to="/customers" />} variant="borderless" className="chart-card">
                  {rankedCustomers.length === 0 ? <ChartEmpty /> : (
                    <ol className="dash-rank">
                      {rankedCustomers.map((item, index) => {
                        const value = Number(item.value || 0);
                        const width = rankMax > 0 ? Math.max(6, (value / rankMax) * 100) : 0;
                        return (
                          <li className="dash-rank-row" key={item.name || index}>
                            <span className={`dash-rank-index${index < 3 ? ' is-top' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
                            <div className="dash-rank-main">
                              <div className="dash-rank-meta">
                                <span className="dash-rank-name">{item.name}</span>
                                <strong>{value.toLocaleString()} 次</strong>
                              </div>
                              <div className="dash-rank-track">
                                <div className={`dash-rank-bar${index < 3 ? ' is-top' : ''}`} style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </Card>
              </Col>
            </Row>
          </section>

          <section className="dash-section">
            <div className="dash-section-head">
              <h2>营销表现</h2>
              <p>使用次数与优惠金额只统计已完成订单</p>
            </div>
            <Card
              title={(
                <CardTitle
                  title="优惠券使用统计"
                  desc="列出库里全部优惠券，含尚未使用的券"
                  extra={(
                    <Space wrap>
                      <Select
                        className="dash-filter"
                        size="small"
                        variant="borderless"
                        value={couponStatusFilter || undefined}
                        onChange={(v) => setCouponStatusFilter(v || '')}
                        allowClear
                        placeholder="上线状态"
                        style={{ width: 118 }}
                        options={[
                          { value: 'published', label: '已投放' },
                          { value: 'offline', label: '已下线' },
                          { value: 'draft', label: '草稿' },
                        ]}
                      />
                      <Select
                        className="dash-filter"
                        size="small"
                        variant="borderless"
                        value={couponTypeFilter || undefined}
                        onChange={(v) => setCouponTypeFilter(v || '')}
                        allowClear
                        placeholder="券类型"
                        style={{ width: 108 }}
                        options={[
                          { value: 'discount', label: '折扣券' },
                          { value: 'deduction', label: '满减券' },
                          { value: 'duration', label: '时长券' },
                        ]}
                      />
                    </Space>
                  )}
                />
              )}
              variant="borderless"
              className="chart-card"
            >
              {filteredCouponData.length === 0 ? (
                <ChartEmpty text="暂无符合条件的优惠券" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={filteredCouponData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="4 6" />
                    <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={52} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="count" tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                    <YAxis yAxisId="amount" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => compactNumber(v)} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--table-row-hover, rgba(0,0,0,0.04))' }} />
                    {renderLegend()}
                    <Bar yAxisId="count" dataKey="usedCount" name="使用次数" fill={colors.c1} radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar yAxisId="amount" dataKey="discountTotal" name="优惠总金额" fill={colors.accent} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </section>

          <section className="dash-section">
            <div className="dash-section-head">
              <h2>实时动态</h2>
              <p>最新订单与新注册用户</p>
            </div>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card
                  title={(
                    <CardTitle
                      title="最新订单"
                      to="/orders"
                      extra={(
                        <Select
                          className="dash-filter"
                          size="small"
                          variant="borderless"
                          value={latestOrderStatus}
                          onChange={setLatestOrderStatus}
                          style={{ width: 110 }}
                          options={[
                            { value: '', label: '全部' },
                            { value: 'pending', label: '待支付' },
                            { value: 'renting', label: '租赁中' },
                            { value: 'completed', label: '已完成' },
                            { value: 'cancelled', label: '已取消' },
                            { value: 'overdue', label: '已逾期' },
                          ]}
                        />
                      )}
                    />
                  )}
                  variant="borderless"
                  className="table-card"
                >
                  <Table columns={orderColumns} dataSource={latestOrders} rowKey="id" pagination={false} size="small" scroll={{ x: 640 }} />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title={<CardTitle title="最新注册用户" to="/customers" />} variant="borderless" className="table-card">
                  <Table columns={customerColumns} dataSource={latestCustomers} rowKey="id" pagination={false} size="small" scroll={{ x: 520 }} />
                </Card>
              </Col>
            </Row>
          </section>
        </div>
      </Spin>
    </div>
  );
};

Dashboard.routeConfig = { path: '/dashboard', permission: 'dashboard' };
export default Dashboard;
