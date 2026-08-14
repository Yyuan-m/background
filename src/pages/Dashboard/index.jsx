import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Table, Tag, Spin, Alert } from 'antd';
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
  getVehicleHotDataApi, getRepurchaseDataApi, getPeakHoursDataApi } from '@/api/modules/finance';
import { getOrdersApi } from '@/api/modules/order';
import { getCustomersApi } from '@/api/modules/customer';
import '@/pages/Dashboard/Dashboard.scss';
import { formatTime } from '@/utils/formatTime';
import { getChartColor } from '@/utils/chartColors';

// 卡片标题：带快捷跳转箭头
const CardTitle = ({ icon, title, to }) => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-card-title">
      <span>{icon && <span className="dashboard-card-title-icon">{icon}</span>}{title}</span>
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes, revenueRes, typeRes, hotRes, repurchaseRes, peakRes, ordersRes, customersRes] = await Promise.all([
        getDashboardStatsApi(), getOrderTrendApi(), getRevenueDataApi(), getVehicleTypeDataApi(),
        getVehicleHotDataApi(), getRepurchaseDataApi(), getPeakHoursDataApi(),
        getOrdersApi({ page: 1, pageSize: 5 }), getCustomersApi({ page: 1, pageSize: 5 }),
      ]);
      setStats(statsRes || {}); setOrderTrend(trendRes || []); setRevenueData(revenueRes || []);
      setVehicleTypeData(typeRes || []); setVehicleHotData(hotRes || []); setRepurchaseData(repurchaseRes || []);
      setPeakHoursData(peakRes || []); setLatestOrders(ordersRes?.list || []); setLatestCustomers(customersRes?.list || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

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
            <Card title={<CardTitle title="客户复购率" to="/customers" />} variant="borderless" className="chart-card">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={repurchaseData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {repurchaseData.map((entry, index) => <Cell key={index} fill={getChartColor(index, entry.color)} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* 实时动态 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title={<CardTitle title="最新订单" to="/orders" />} variant="borderless" className="table-card">
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
