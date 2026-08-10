import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, DatePicker, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getInvoiceListApi, addInvoiceApi, updateInvoiceApi, deleteInvoiceApi, toggleInvoiceStatusApi,
} from '@/api/modules/finance';
import { formatTime } from '@/utils/formatTime';
import dayjs from 'dayjs';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';

const statusColorMap = { issued: 'green', pending: 'orange' };

const InvoiceTab = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState(undefined);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const { map: invoiceStatusMap } = useDict('invoice_status');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvoiceListApi({
        page: pagination.page,
        pageSize: pagination.pageSize,
        status: filterStatus,
        keyword: keyword || undefined,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [pagination, filterStatus, keyword]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ status: 'pending', type: '增值税普通发票', amount: 0 });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      issueDate: record.issueDate ? dayjs(record.issueDate) : null,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try { await deleteInvoiceApi(id); void fetchData(); } catch (e) { console.error(e); }
  };

  const handleToggleStatus = async (id, status) => {
    try { await toggleInvoiceStatusApi(id, status); void fetchData(); } catch (e) { console.error(e); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        issueDate: values.issueDate ? values.issueDate.format('YYYY-MM-DD') : null,
      };
      if (editingId) {
        await updateInvoiceApi({ id: editingId, ...payload });
      } else {
        await addInvoiceApi(payload);
      }
      setModalVisible(false);
      void fetchData();
    } catch (e) { /* 校验失败或请求失败 */ }
  };

  const columns = useMemo(() => [
    { title: '发票号', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 140, render: (v) => v || <Tag>未生成</Tag> },
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 140 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 80 },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '类型', dataIndex: 'type', key: 'type', width: 140 },
    { title: '抬头', dataIndex: 'title', key: 'title', width: 160, ellipsis: true },
    { title: '税号', dataIndex: 'taxNo', key: 'taxNo', width: 160, ellipsis: true, render: (v) => v || '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (v) => <Tag color={statusColorMap[v] || 'default'}>{invoiceStatusMap[v]?.label || v}</Tag> },
    { title: '开票日期', dataIndex: 'issueDate', key: 'issueDate', width: 110, render: formatTime.render },
    { title: '操作', key: 'action', width: 220, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          {record.status === 'pending' && <Button type="link" size="small" onClick={() => handleToggleStatus(record.id, 'issued')}>开具</Button>}
          {record.status === 'issued' && <Button type="link" size="small" onClick={() => handleToggleStatus(record.id, 'pending')}>撤销</Button>}
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [invoiceStatusMap]);

  return (
    <Card variant="borderless">
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col><Input.Search placeholder="订单号/客户/发票号/抬头" allowClear value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={() => setPagination({ ...pagination, page: 1 })} style={{ width: 260 }} /></Col>
        <Col>
          <DictSelect dictType="invoice_status" placeholder="状态筛选" allowClear value={filterStatus} onChange={(v) => { setFilterStatus(v); setPagination({ ...pagination, page: 1 }); }} style={{ width: 140 }} />
        </Col>
        <Col flex="auto" style={{ textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增发票</Button>
        </Col>
      </Row>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1300 }}
        pagination={{
          current: pagination.page, pageSize: pagination.pageSize, total,
          showSizeChanger: true, showQuickJumper: true, showTotal: (t) => `共 ${t} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, pageSize) => setPagination({ page, pageSize }),
        }} />
      <Modal title={editingId ? '编辑发票' : '新增发票'} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} destroyOnClose width={640}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="orderNo" label="订单号" rules={[{ required: true, message: '请输入订单号' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="customerName" label="客户姓名" rules={[{ required: true, message: '请输入客户姓名' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="amount" label="发票金额" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} addonAfter="元" /></Form.Item></Col>
            <Col span={12}><Form.Item name="type" label="发票类型" rules={[{ required: true }]}><Select>
              <Select.Option value="增值税普通发票">增值税普通发票</Select.Option>
              <Select.Option value="增值税专用发票">增值税专用发票</Select.Option>
            </Select></Form.Item></Col>
            <Col span={12}><Form.Item name="title" label="发票抬头" rules={[{ required: true, message: '请输入抬头' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="taxNo" label="税号（企业发票必填）"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="invoiceNo" label="发票号"><Input placeholder="开具时自动生成" /></Form.Item></Col>
            <Col span={12}><Form.Item name="issueDate" label="开票日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="状态" rules={[{ required: true }]}><DictSelect dictType="invoice_status" /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};

export default InvoiceTab;
