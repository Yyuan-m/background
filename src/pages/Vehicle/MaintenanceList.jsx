import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Select, Row, Col, Button, Tag, Space, Modal, Form, Input, InputNumber, DatePicker, Popconfirm, Descriptions } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { message } from '@/utils/antdStatic';
import dayjs from 'dayjs';
import { getCarMaintenanceListApi, getCarMaintenanceDetailApi, addCarMaintenanceApi, updateCarMaintenanceApi, deleteCarMaintenanceApi } from '@/api/modules/car-maintenance';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useVehicleOptions from '@/hooks/useVehicleOptions';
import { formatTime } from '@/utils/formatTime';

const MAINTENANCE_STATUS_DICT = 'maintenance_status';

const statusTagRender = (map, v) => {
  const cfg = map[v];
  if (!cfg) return v || '-';
  let color = 'orange';
  if (v === 'completed') color = 'green';
  else if (v === 'processing') color = 'blue';
  return <Tag color={color}>{cfg.label}</Tag>;
};

const MaintenanceList = () => {
  const { options: vehicleOptions } = useVehicleOptions();
  const { map: statusMap } = useDict(MAINTENANCE_STATUS_DICT);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增维保记录');
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCarMaintenanceListApi({
        page: pagination.page,
        pageSize: pagination.pageSize,
        vehicleId: filterVehicle || undefined,
        status: filterStatus || undefined,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [pagination, filterVehicle, filterStatus]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleSearch = () => { setPagination((p) => ({ ...p, page: 1 })); };
  const handleReset = () => {
    setFilterVehicle(''); setFilterStatus('');
    setPagination({ page: 1, pageSize: 10 });
  };

  const handleAdd = () => {
    setEditingId(null);
    setModalTitle('新增维保记录');
    form.resetFields();
    form.setFieldsValue({ status: 'pending' });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setModalTitle('编辑维保记录');
    form.setFieldsValue({
      ...record,
      maintenanceDate: record.maintenanceDate ? dayjs(record.maintenanceDate) : null,
      nextDate: record.nextDate ? dayjs(record.nextDate) : null,
    });
    setModalVisible(true);
  };

  const handleDetail = async (id) => {
    try {
      const res = await getCarMaintenanceDetailApi(id);
      setDetail(res);
      setDetailVisible(true);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCarMaintenanceApi(id);
      void fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      const payload = {
        ...values,
        maintenanceDate: values.maintenanceDate ? values.maintenanceDate.format('YYYY-MM-DD') : null,
        nextDate: values.nextDate ? values.nextDate.format('YYYY-MM-DD') : null,
        vehicleName: vehicleOptions.find((v) => v.value === values.vehicleId)?.label || '',
      };
      if (editingId) {
        await updateCarMaintenanceApi({ ...payload, id: editingId });
      } else {
        await addCarMaintenanceApi(payload);
      }
      message.success(editingId ? '编辑成功' : '新增成功');
      setModalVisible(false);
      void fetchData();
    } catch (e) {
      if (e?.errorFields) return; // 校验失败
      console.error(e);
    } finally { setSubmitLoading(false); }
  };

  const columns = [
    { title: '车辆', dataIndex: 'vehicleName', key: 'vehicleName', width: 160 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (v) => v ? <Tag color="gold">{v}</Tag> : '-' },
    { title: '详情', dataIndex: 'description', key: 'description', width: 200, ellipsis: true },
    { title: '费用', dataIndex: 'cost', key: 'cost', width: 100, render: (v) => v > 0 ? `¥${Number(v).toLocaleString()}` : '-' },
    { title: '维修厂', dataIndex: 'company', key: 'company', width: 140, render: (v) => v || '-' },
    { title: '里程(km)', dataIndex: 'mileage', key: 'mileage', width: 100, render: (v) => v ?? '-' },
    { title: '维保日期', dataIndex: 'maintenanceDate', key: 'maintenanceDate', width: 110, render: formatTime.render },
    { title: '下次日期', dataIndex: 'nextDate', key: 'nextDate', width: 110, render: (v) => v ? formatTime.render(v) : '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (v) => statusTagRender(statusMap, v) },
    {
      title: '操作', key: 'action', fixed: 'right', width: 180,
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleDetail(r.id)}>详情</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除该维保记录？" onConfirm={() => handleDelete(r.id)} okText="确认" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card variant="borderless">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="选择车辆"
              value={filterVehicle || undefined}
              onChange={(v) => { setFilterVehicle(v || ''); setPagination((p) => ({ ...p, page: 1 })); }}
              allowClear showSearch
              style={{ width: '100%' }}
              optionFilterProp="label"
              options={vehicleOptions}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <DictSelect
              dictType={MAINTENANCE_STATUS_DICT}
              placeholder="维保状态"
              value={filterStatus || undefined}
              onChange={(v) => { setFilterStatus(v || ''); setPagination((p) => ({ ...p, page: 1 })); }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>
      <Card variant="borderless" style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增维保记录</Button>
        </div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => setPagination({ page: p, pageSize: ps }),
          }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal title={modalTitle} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} confirmLoading={submitLoading} width={680} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vehicleId" label="车辆" rules={[{ required: true, message: '请选择车辆' }]}>
                <Select placeholder="请选择车辆" showSearch optionFilterProp="label" options={vehicleOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="维保类型" rules={[{ required: true, message: '请输入维保类型' }]}>
                <Input placeholder="如：保养/维修" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cost" label="费用(元)">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mileage" label="里程(km)">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="里程数" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maintenanceDate" label="维保日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nextDate" label="下次维保日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="company" label="维修厂">
                <Input placeholder="维修厂名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <DictSelect dictType={MAINTENANCE_STATUS_DICT} placeholder="请选择" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="维保详情">
            <Input.TextArea rows={3} placeholder="维保内容描述" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal title="维保详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={600}>
        {detail && (
          <Descriptions column={2} labelStyle={{ width: 100 }}>
            <Descriptions.Item label="车辆">{detail.vehicleName || '-'}</Descriptions.Item>
            <Descriptions.Item label="类型">{detail.type || '-'}</Descriptions.Item>
            <Descriptions.Item label="费用">{detail.cost ? `¥${Number(detail.cost).toLocaleString()}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="里程">{detail.mileage ? `${detail.mileage} km` : '-'}</Descriptions.Item>
            <Descriptions.Item label="维修厂">{detail.company || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{statusTagRender(statusMap, detail.status)}</Descriptions.Item>
            <Descriptions.Item label="维保日期">{formatTime.render(detail.maintenanceDate)}</Descriptions.Item>
            <Descriptions.Item label="下次日期">{detail.nextDate ? formatTime.render(detail.nextDate) : '-'}</Descriptions.Item>
            <Descriptions.Item label="详情" span={2}>{detail.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{detail.remark || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default MaintenanceList;
