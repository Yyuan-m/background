import { useState, useMemo, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Row, Col, Statistic } from 'antd';
import { message } from '@/utils/antdStatic';
import { ToolOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAfterSalesListApi, handleAfterSalesApi } from '@/api/modules/after-sales';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';
import { getChartColor } from '@/utils/chartColors';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useAuthStore from '@/store/useAuthStore';

const statusColorMap = { pending: 'default', processing: 'processing', resolved: 'success', rejected: 'error' };
const typeColorMap = { service: 'orange', vehicle: 'red', billing: 'gold', damage: 'volcano', other: 'blue' };
const priorityColorMap = { urgent: 'red', high: 'orange', normal: 'blue', low: 'default' };

const AfterSales = () => {
  const { hasPermission } = useAuthStore();
  const [filterStatus, setFilterStatus] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentComplaint, setCurrentComplaint] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const { options: complaintTypeOptions, map: complaintTypeMap } = useDict('complaint_type');
  const { map: complaintStatusMap } = useDict('complaint_status');
  const { map: priorityMap } = useDict('complaint_priority');

  // 拉取后端数据（pageSize=1000 拉全部，前端 Table 客户端分页）
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAfterSalesListApi({ page: 1, pageSize: 1000, status: filterStatus || undefined });
      setData(res?.list || []);
    } catch (e) {
      console.error('获取售后工单列表失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus]);

  // 预计算统计数据，避免 render 中重复 filter
  const stats = useMemo(() => {
    const pending = data.filter((c) => c.status === 'pending').length;
    const processing = data.filter((c) => c.status === 'processing').length;
    const resolved = data.filter((c) => c.status === 'resolved').length;
    const rated = data.filter((c) => c.satisfaction > 0);
    const avgSatisfaction = rated.length > 0
      ? (rated.reduce((s, c) => s + c.satisfaction, 0) / rated.length).toFixed(1)
      : '-';
    return { pending, processing, resolved, avgSatisfaction };
  }, [data]);

  // 满意度统计
  const satisfactionData = useMemo(() => [
    { name: '5星', value: data.filter((c) => c.satisfaction === 5).length, color: '#10b981' },
    { name: '4星', value: data.filter((c) => c.satisfaction === 4).length, color: '#c9a96e' },
    { name: '3星', value: data.filter((c) => c.satisfaction === 3).length, color: '#f59e0b' },
    { name: '2星', value: data.filter((c) => c.satisfaction === 2).length, color: '#ef4444' },
    { name: '1星', value: data.filter((c) => c.satisfaction === 1).length, color: '#dc2626' },
    { name: '未评分', value: data.filter((c) => c.satisfaction === 0).length, color: '#94a3b8' },
  ].filter((d) => d.value > 0), [data]);

  // 投诉类型统计
  const typeData = useMemo(() =>
    complaintTypeOptions.map((t) => ({
      name: t.label,
      value: data.filter((c) => c.type === t.value).length,
      color: typeColorMap[t.value] || 'default',
    })).filter((d) => d.value > 0),
  [data, complaintTypeOptions]);

  const handleViewDetail = (record) => {
    setCurrentComplaint(record);
    form.setFieldsValue({ solution: record.solution || '' });
    setDetailVisible(true);
  };

  const handleResolve = async () => {
    if (!currentComplaint) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      // handleAfterSalesApi 已封装 successMsg='工单处理完成'，无需页面层重复 message.success
      await handleAfterSalesApi(currentComplaint.id, {
        status: 'resolved',
        assignee: currentComplaint.assignee,
        solution: values.solution || '',
      });
      setDetailVisible(false);
      fetchData();
    } catch (e) {
      console.error('工单处理失败:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(() => [
    { title: '工单号', dataIndex: 'ticketNo', key: 'ticketNo', width: 140 },
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 130 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 80 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (v) => <Tag color={typeColorMap[v] || 'default'}>{complaintTypeMap[v]?.label || v}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (v) => <Tag color={priorityColorMap[v] || 'default'}>{priorityMap[v]?.label || v}</Tag>,
    },
    { title: '处理人', dataIndex: 'assignee', key: 'assignee', width: 100 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s) => <Tag color={statusColorMap[s] || 'default'}>{complaintStatusMap[s]?.label || s}</Tag> },
    { title: '满意度', dataIndex: 'satisfaction', key: 'satisfaction', width: 80, render: (v) => v > 0 ? `${'★'.repeat(v)}${'☆'.repeat(5 - v)}` : '-' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: formatTime.render },
    ...(hasPermission('after_sales:complaint:handle') ? [{
      title: '操作', key: 'action', width: 100, render: (_, record) => (
        <Button type="link" size="small" onClick={() => handleViewDetail(record)}>处理</Button>
      ),
    }] : []),
  ], [handleViewDetail, complaintTypeMap, complaintStatusMap, priorityMap, hasPermission]);

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.afterSales')}</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="待处理" value={stats.pending} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="处理中" value={stats.processing} valueStyle={{ color: '#3b82f6' }} /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="已解决" value={stats.resolved} valueStyle={{ color: '#10b981' }} /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="平均满意度" value={stats.avgSatisfaction} suffix="分" valueStyle={{ color: '#c9a96e' }} /></Card></Col>
      </Row>

      {/* 满意度与投诉类型统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title="满意度分布" variant="borderless">
            {satisfactionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={satisfactionData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                    {satisfactionData.map((d, i) => <Cell key={i} fill={getChartColor(i, d.color)} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted, #999)' }}>暂无评分数据</div>}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="投诉类型分布" variant="borderless">
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                    {typeData.map((d, i) => <Cell key={i} fill={getChartColor(i, d.color)} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted, #999)' }}>暂无数据</div>}
          </Card>
        </Col>
      </Row>

      <Card variant="borderless"
        extra={<DictSelect dictType="complaint_status" placeholder="筛选状态" value={filterStatus || undefined} onChange={setFilterStatus} allowClear style={{ width: 140 }} />}>
        <div>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 10,
          }} />
        </div>
      </Card>

      <Modal title="工单处理" open={detailVisible} onCancel={() => setDetailVisible(false)} width={600}
        footer={currentComplaint?.status !== 'resolved' && currentComplaint?.status !== 'rejected' ? [
          <Button key="reject" danger icon={<CloseCircleOutlined />}>驳回</Button>,
          <Button key="resolve" type="primary" icon={<CheckCircleOutlined />} onClick={handleResolve} loading={submitting}>标记已解决</Button>,
        ] : null}>
        {currentComplaint && (
          <div>
            <p><strong>工单号：</strong>{currentComplaint.ticketNo}</p>
            <p><strong>类型：</strong><Tag color={typeColorMap[currentComplaint.type] || 'default'}>{complaintTypeMap[currentComplaint.type]?.label || currentComplaint.type}</Tag></p>
            <p><strong>客户：</strong>{currentComplaint.customerName} | <strong>订单：</strong>{currentComplaint.orderNo}</p>
            <p><strong>描述：</strong>{currentComplaint.description}</p>
            <Form form={form} layout="vertical">
              <Form.Item name="solution" label="处理方案">
                <Input.TextArea rows={3} placeholder="请输入处理方案" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

AfterSales.routeConfig = { path: '/after-sales', permission: 'after_sales' };
export default AfterSales;
