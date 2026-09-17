import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Table, Tag, Spin, Alert, Select, Space } from 'antd';
import {
  ShoppingCartOutlined, CarOutlined, DollarOutlined, RiseOutlined,
  WarningOutlined, ToolOutlined, ClockCircleOutlined,
  FireOutlined, ThunderboltOutlined, ArrowRightOutlined,
} from '@ant-design/icons';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import StatCard from '@/components/StatCard';
// 轮播图已从仪表盘移除，改为仅在系统设置中配置，供 C 端官网首页使用
// import HomeCarousel from '@/components/HomeCarousel';
import { getDashboardStatsApi, getOrderTrendApi, getRevenueDataApi, getVehicleTypeDataApi,
  getVehicleHotDataApi, getRepurchaseDataApi, getPeakHoursDataApi,
  getLatestOrdersApi, getLatestCustomersApi, getCouponUsageApi } from '@/api/modules/finance';
import '@/pages/Dashboard/Dashboard.scss';
import { formatTime } from '@/utils/formatTime';
import { getChartColor } from '@/utils/chartColors';

// 卡片标题：带快捷跳转箭头，extra（筛选框等）渲染在右箭头左边
const CardTitle = ({ icon, title, to, extra }) => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-card-title">
      <span>{icon && <span className="dashboard-card-title-icon">{icon}</span>}{title}</span>
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [orderTrend, setOrderTrend] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
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

  const statusMap = useMemo(() => ({
    pending: { text: '待支付', color: 'orange' }, paid: { text: '已支付', color: 'blue' },
    renting: { text: '租赁中', color: 'green' }, completed: { text: '已完成', color: 'default' },
    cancelled: { text: '已取消', color: 'red' }, overdue: { text: '已逾期', color: 'red' },
  }), []);

  const orderColumns = useMemo(() => [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 140 },
    { title: '联系人', dataIndex: 'contactName', key: 'contactName', width: 80 },
    { title: '车辆', dataIndex: 'carName', key: 'carName', ellipsis: true },
    { title: '金额', dataIndex: 'totalAmount', key: 'totalAmount', width: 100, render: (v) => <span style={{ color: 'var(--amount-color, #c9a96e)', fontWeight: 500 }}>¥{v?.toLocaleString()}</span> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s) => { const cfg = statusMap[s] || { text: s, color: 'default' }; return <Tag color={cfg.color}>{cfg.text}</Tag>; } },
    { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 150, render: formatTime.render },
  ], [statusMap]);

  const customerColumns = useMemo(() => [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 70 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 110 },
    { title: '会员', dataIndex: 'membershipName', key: 'membershipName', width: 80, render: (v) => <Tag>{v}</Tag> },
    { title: '信用分', dataIndex: 'creditScore', key: 'creditScore', width: 70, render: (v) => <span style={{ color: v >= 80 ? 'var(--success-color, #10b981)' : v >= 60 ? 'var(--warning-color, #f59e0b)' : 'var(--error-color, #ef4444)' }}>{v}</span> },
    { title: '累计消费', dataIndex: 'totalSpent', key: 'totalSpent', width: 90, render: (v) => <span style={{ color: 'var(--amount-color, #c9a96e)' }}>¥{v?.toLocaleString()}</span> },
  ], []);

  return (
    <div className="page-container dashboard-page">
      <Spin spinning={loading}>
        {/* 轮播图已从仪表盘移除，仅供 C 端官网首页使用 */}
        {/* <HomeCarousel /> */}

        {/* 业务预警 */}
        <Row gutter={[16, 16]}>
          {(stats?.overdueOrders > 0) && (
            <Col xs={24} sm={12} lg={6}>
              <Alert message={`${stats.overdueOrders} 个逾期订单待处理`} type="error" showIcon icon={<WarningOutlined />} banner />
            </Col>
          )}
          {(stats?.pendingComplaints > 0) && (
            <Col xs={24} sm={12} lg={6}>
              <Alert message={`${stats.pendingComplaints} 个投诉工单待处理`} type="warning" showIcon icon={<ToolOutlined />} banner />
            </Col>
          )}
          {(stats?.pendingMaintenance > 0) && (
            <Col xs={24} sm={12} lg={6}>
              <Alert message={`${stats.pendingMaintenance} 辆车待维保`} type="info" showIcon icon={<ClockCircleOutlined />} banner />
            </Col>
          )}
        </Row>

        {/* 统计卡片 - 累计指标，点击跳转 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard icon={<ShoppingCartOutlined />} title="订单总数" value={stats.totalOrders || 0} color="#1a365d" to="/orders" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard icon={<DollarOutlined />} title="本年营收" value={stats.yearRevenue || 0} prefix="¥" color="#c9a96e" to="/finance" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard icon={<RiseOutlined />} title="本月营收" value={stats.monthRevenue || 0} prefix="¥" color="#10b981" to="/finance" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard icon={<CarOutlined />} title="出租率" value={stats?.rentalRate ? Math.round(stats.rentalRate * 100) : 0} suffix="%" color="#3b82f6" to="/vehicles" />
          </Col>
        </Row>

        {/* 优惠券使用统计（库里全部优惠券，含未使用；使用次数与优惠总金额仅统计已完成订单） */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              title={(
                <CardTitle
                  title="优惠券使用统计"
                  extra={(
                    <Space wrap>
                      <Select
                        size="small"
                        value={couponStatusFilter || undefined}
                        onChange={(v) => setCouponStatusFilter(v || '')}
                        allowClear
                        placeholder="上线状态"
                        style={{ width: 110 }}
                        options={[
                          { value: 'published', label: '已投放' },
                          { value: 'offline', label: '已下线' },
                          { value: 'draft', label: '草稿' },
                        ]}
                      />
                      <Select
                        size="small"
                        value={couponTypeFilter || undefined}
                        onChange={(v) => setCouponTypeFilter(v || '')}
                        allowClear
                        placeholder="券类型"
                        style={{ width: 100 }}
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
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginBottom: 8 }}>
                统计规则：列出库里全部优惠券（含未使用），使用次数与优惠总金额仅统计已完成订单
              </div>
              {filteredCouponData.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary, #64748b)', padding: '40px 0' }}>暂无符合条件的优惠券</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={filteredCouponData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f0f0f0)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis yAxisId="count" tick={{ fontSize: 11 }} allowDecimals={false} label={{ value: '使用次数', angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--text-secondary, #64748b)' }} />
                    <YAxis yAxisId="amount" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${Number(v).toLocaleString()}`} label={{ value: '优惠金额', angle: 90, position: 'insideRight', fontSize: 12, fill: 'var(--text-secondary, #64748b)' }} />
                    <Tooltip formatter={(value, name) => name === '优惠总金额' ? `¥${Number(value).toLocaleString()}` : `${value} 次`} />
                    <Legend />
                    <Bar yAxisId="count" dataKey="usedCount" name="使用次数" fill="var(--chart-color-1, #1a365d)" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="amount" dataKey="discountTotal" name="优惠总金额" fill="#fa8c16" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
        </Row>

        {/* 订单趋势 + 车辆占比 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={16}>
            <Card title={<CardTitle title="订单与营收趋势" to="/orders" />} variant="borderless" className="chart-card">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={orderTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f0f0f0)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip /><Legend />
                  <Line yAxisId="left" type="monotone" dataKey="orders" name="订单数" stroke="var(--chart-color-1, #1a365d)" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" name="营收(¥)" stroke="var(--chart-color-2, #c9a96e)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={<CardTitle title="车辆类型占比" to="/vehicles" />} variant="borderless" className="chart-card">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={vehicleTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {vehicleTypeData.map((entry, index) => <Cell key={index} fill={getChartColor(index, entry.color)} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* 智能分析：高峰时段 + 车型热度 + 复购率 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={8}>
            <Card title={<CardTitle icon={<ThunderboltOutlined />} title="高峰时段分析" to="/orders" />} variant="borderless" className="chart-card">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f0f0f0)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="orders" name="订单量" fill="var(--chart-color-1, #1a365d)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={<CardTitle icon={<FireOutlined />} title="车型热度排行" to="/vehicles" />} variant="borderless" className="chart-card">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={vehicleHotData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f0f0f0)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="orders" name="租赁次数" fill="var(--chart-color-2, #c9a96e)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={<CardTitle title="客户租车次数排行" to="/customers" />} variant="borderless" className="chart-card">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={repurchaseData} cx="50%" cy="45%" innerRadius={15} outerRadius={80} paddingAngle={2} dataKey="value" roseType="radius"
                    label={({ name, value }) => `${name}: ${value}次`}
                    fontSize={12}
                    labelLine={{ stroke: 'var(--text-secondary, #94a3b8)', strokeWidth: 1 }}>
                    {repurchaseData.map((entry, index) => <Cell key={index} fill={getChartColor(index, entry.color)} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} 次`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* 实时动态 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card
              title={(
                <CardTitle
                  title="最新订单"
                  to="/orders"
                  extra={(
                    <Select
                      size="small"
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
              <Table columns={orderColumns} dataSource={latestOrders} rowKey="id" pagination={false} size="small" scroll={{ x: 600 }} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<CardTitle title="最新注册用户" to="/customers" />} variant="borderless" className="table-card">
              <Table columns={customerColumns} dataSource={latestCustomers} rowKey="id" pagination={false} size="small" scroll={{ x: 500 }} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

Dashboard.routeConfig = { path: '/dashboard', permission: 'dashboard' };
export default Dashboard;
