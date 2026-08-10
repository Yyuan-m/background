import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Tag, Input, DatePicker, Modal, Row, Col, Card, Tabs, Badge } from 'antd';
import { message } from '@/utils/antdStatic';
import { SearchOutlined, ReloadOutlined, EyeOutlined, EditOutlined, ExportOutlined } from '@ant-design/icons';
import { getOrdersApi, updateOrderStatusApi } from '@/api/modules/order';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useAuthStore from '@/store/useAuthStore';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';

const { RangePicker } = DatePicker;

// 状态颜色映射（字典不存颜色，本地维护）
const statusColorMap = { pending: 'orange', paid: 'blue', renting: 'processing', completed: 'green', cancelled: 'default', overdue: 'red' };

const OrderList = () => {
  const navigate = useNavigate();
  const { hasButtonPermission } = useAuthStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateRange, setDateRange] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  const { options: statusOptions, map: statusMap } = useDict('order_status');

  // 用于追踪最新的请求，避免竞态条件导致旧响应覆盖新数据
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const params = { page, pageSize, keyword };
      if (activeTab !== 'all') params.status = activeTab;
      else if (filterStatus) params.status = filterStatus;
      if (dateRange.length === 2) { params.startDate = dateRange[0].format('YYYY-MM-DD'); params.endDate = dateRange[1].format('YYYY-MM-DD'); }
      const res = await getOrdersApi(params);
      // 如果这不是最新的请求（用户已切换到其他tab/筛选条件），忽略旧响应
      if (fetchId !== fetchIdRef.current) return;
      // res 为 null 时（请求被去重取消），不覆盖已有数据
      if (res == null) return;
      setData(res?.list || []); setTotal(res?.total || 0);
    } catch (e) { console.error(e); } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [page, pageSize, keyword, activeTab, filterStatus, dateRange]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleSearch = () => { setPage(1); void fetchData(); };
  const handleReset = () => { setKeyword(''); setFilterStatus(''); setDateRange([]); setActiveTab('all'); setPage(1); };
  const handlePageChange = (p, ps) => { setPage(p); setPageSize(ps); };

  const handleOpenStatusModal = useCallback((record) => { setCurrentOrder(record); setNewStatus(record.status); setStatusModalVisible(true); }, []);

  const handleStatusChange = async () => {
    if (!currentOrder || newStatus === currentOrder.status) { setStatusModalVisible(false); return; }
    await updateOrderStatusApi(currentOrder.id, newStatus); message.success('状态修改成功'); setStatusModalVisible(false); void fetchData();
  };

  const handleExport = () => {
    const headers = '订单号,车辆,联系人,联系电话,租期,总金额,状态,城市,门店,创建时间\n';
    const csv = data.map((d) => `${d.orderNo},${d.carName},${d.contactName},${d.contactPhone},${d.startDate}~${d.endDate}(${d.days}天),${d.totalAmount},${d.statusName || statusMap[d.status]?.label || d.status},${d.city || ''},${d.store || ''},${d.createTime}`).join('\n');
    const blob = new Blob([`\uFEFF${  headers  }${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `订单导出_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  const columns = useMemo(() => [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 160 },
    { title: '车辆', dataIndex: 'carName', key: 'carName', width: 150, ellipsis: true },
    { title: '联系人', dataIndex: 'contactName', key: 'contactName', width: 90 },
    { title: '联系电话', dataIndex: 'contactPhone', key: 'contactPhone', width: 120 },
    { title: '租期', key: 'period', width: 200, render: (_, r) => `${formatTime(r.startDate)}~${formatTime(r.endDate)}(${r.days}天)` },
    { title: '总金额', dataIndex: 'totalAmount', key: 'totalAmount', width: 120, render: (v) => <span style={{ color: 'var(--amount-color, #c9a96e)', fontWeight: 600 }}>¥{v?.toLocaleString()}</span> },
    { title: '城市', dataIndex: 'city', key: 'city', width: 90, render: (v) => v ? <Tag>{v}</Tag> : '-' },
    { title: '门店', dataIndex: 'store', key: 'store', width: 130, ellipsis: true, render: (v) => v || '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (s, r) => {
      const cfg = statusMap[s];
      const text = cfg?.label || r.statusName || s;
      const color = statusColorMap[s] || 'default';
      return <Tag color={color}>{text}</Tag>;
    } },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160, render: formatTime.render },
    {
      title: '操作', key: 'action', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/orders/${record.id}`)}>详情</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenStatusModal(record)}>状态</Button>
        </Space>
      ),
    },
  ], [navigate, statusMap, handleOpenStatusModal]);

  const tabItems = useMemo(() => [
    { key: 'all', label: '全部' },
    { key: 'pending', label: <>待支付 <Badge count={data.filter((d) => d.status === 'pending').length} size="small" /></> },
    { key: 'renting', label: <>租赁中 <Badge count={data.filter((d) => d.status === 'renting').length} size="small" /></> },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' },
  ], [data]);

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.orders')}</h2>
      <Card className="" variant="borderless">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}><Input placeholder="订单号/车辆/联系人/电话" prefix={<SearchOutlined />} value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} allowClear /></Col>
          <Col xs={24} sm={12} md={4}><DictSelect dictType="order_status" placeholder="状态" value={filterStatus || undefined} onChange={setFilterStatus} allowClear style={{ width: '100%' }} /></Col>
          <Col xs={24} sm={12} md={6}><RangePicker style={{ width: '100%' }} value={dateRange} onChange={setDateRange} /></Col>
          <Col><Space><Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button><Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>{hasButtonPermission('order', 'export') && <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>}</Space></Col>
        </Row>
      </Card>

      <Card className="" variant="borderless">
        <Tabs activeKey={activeTab} onChange={(k) => { setActiveTab(k); setPage(1); }} items={tabItems} />
        <div>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1500 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: handlePageChange,
          }} />
        </div>
      </Card>

      <Modal title="修改订单状态" open={statusModalVisible} onOk={handleStatusChange} onCancel={() => setStatusModalVisible(false)} okText="确认修改">
        {currentOrder && (
          <div style={{ padding: '16px 0' }}>
            <p>订单号：<strong>{currentOrder.orderNo}</strong> | 当前状态：<Tag color={statusColorMap[currentOrder.status] || 'default'}>{statusMap[currentOrder.status]?.label || currentOrder.statusName || currentOrder.status}</Tag></p>
            <DictSelect dictType="order_status" value={newStatus} onChange={setNewStatus} style={{ width: '100%' }} />
          </div>
        )}
      </Modal>
    </div>
  );
};

OrderList.routeConfig = { path: '/orders', permission: 'order' };
export default OrderList;
