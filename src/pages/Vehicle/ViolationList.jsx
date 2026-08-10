import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Select, Row, Col, Button, Tag, Space, Modal, Form, Input, InputNumber, DatePicker, Popconfirm, Descriptions } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { message } from '@/utils/antdStatic';
import dayjs from 'dayjs';
import { getCarViolationListApi, getCarViolationDetailApi, addCarViolationApi, updateCarViolationApi, handleCarViolationApi, deleteCarViolationApi } from '@/api/modules/car-violation';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useVehicleOptions from '@/hooks/useVehicleOptions';
import { formatTime } from '@/utils/formatTime';

const VIOLATION_TYPE_DICT = 'violation_type';
const VIOLATION_STATUS_DICT = 'violation_status';

const statusColorMap = { resolved: 'green', processing: 'blue' };

const ViolationList = () => {
  const { options: vehicleOptions } = useVehicleOptions();
  const { map: statusMap } = useDict(VIOLATION_STATUS_DICT);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 新增/编辑弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增违章记录');
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  // 处理弹窗
  const [handleVisible, setHandleVisible] = useState(false);
  const [handleId, setHandleId] = useState(null);
  const [handleForm] = Form.useForm();

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCarViolationListApi({
        page: pagination.page,
        pageSize: pagination.pageSize,
        vehicleId: filterVehicle || undefined,
        violationType: filterType || undefined,
        status: filterStatus || undefined,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [pagination, filterVehicle, filterType, filterStatus]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleSearch = () => { setPagination((p) => ({ ...p, page: 1 })); };
  const handleReset = () => {
    setFilterVehicle(''); setFilterType(''); setFilterStatus('');
    setPagination({ page: 1, pageSize: 10 });
  };

  const handleAdd = () => {
    setEditingId(null);
    setModalTitle('新增违章记录');
    form.resetFields();
    form.setFieldsValue({ status: 'pending', violationDate: dayjs() });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setModalTitle('编辑违章记录');
    form.setFieldsValue({
      ...record,
      violationDate: record.violationDate ? dayjs(record.violationDate) : null,
      handleDate: record.handleDate ? dayjs(record.handleDate) : null,
    });
    setModalVisible(true);
  };

  const handleDetail = async (id) => {
    try {
      const res = await getCarViolationDetailApi(id);
      setDetail(res);
      setDetailVisible(true);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCarViolationApi(id);
      void fetchData();
    } catch (e) { console.error(e); }
  };

  const openHandle = (record) => {
    setHandleId(record.id);
    handleForm.resetFields();
    handleForm.setFieldsValue({ status: 'resolved', handler: '', handleDate: dayjs() });
    setHandleVisible(true);
  };

  const submitHandle = async () => {
    try {
      const values = await handleForm.validateFields();
      setSubmitLoading(true);
      await handleCarViolationApi(handleId, {
        status: values.status,
        handler: values.handler,
        handleDate: values.handleDate ? values.handleDate.format('YYYY-MM-DD') : null,
      });
      message.success('处理成功');
      setHandleVisible(false);
      void fetchData();
    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
    } finally { setSubmitLoading(false); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      const payload = {
        ...values,
        violationDate: values.violationDate ? values.violationDate.format('YYYY-MM-DD HH:mm:ss') : null,
        handleDate: values.handleDate ? values.handleDate.format('YYYY-MM-DD') : null,
        vehicleName: vehicleOptions.find((v) => v.value === values.vehicleId)?.label || '',
      };
      if (editingId) {
        await updateCarViolationApi({ ...payload, id: editingId });
      } else {
        await addCarViolationApi(payload);
      }
      message.success(editingId ? '编辑成功' : '新增成功');
      setModalVisible(false);
      void fetchData();
    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
    } finally { setSubmitLoading(false); }
  };

  const columns = [
    { title: '车辆', dataIndex: 'vehicleName', key: 'vehicleName', width: 150 },
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 140, render: (v) => v || '-' },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 80, render: (v) => v || '-' },
    { title: '违章类型', dataIndex: 'violationType', key: 'violationType', width: 100, render: (v) => v ? <Tag color="red">{v}</Tag> : '-' },
    { title: '地点', dataIndex: 'location', key: 'location', width: 180, ellipsis: true, render: (v) => v || '-' },
    { title: '罚款', dataIndex: 'fineAmount', key: 'fineAmount', width: 90, render: (v) => v != null ? `¥${v}` : '-' },
    { title: '扣分', dataIndex: 'points', key: 'points', width: 60, render: (v) => v ?? '-' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v) => {
        const cfg = statusMap[v];
        const text = cfg?.label || v || '-';
        const color = statusColorMap[v] || 'orange';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', fixed: 'right', width: 230,
      render: (_, r) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleDetail(r.id)}>详情</Button>
          <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => openHandle(r)}>处理</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除该违章记录？" onConfirm={() => handleDelete(r.id)} okText="确认" cancelText="取消">
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
              dictType={VIOLATION_TYPE_DICT}
              placeholder="违章类型"
              value={filterType || undefined}
              onChange={(v) => { setFilterType(v || ''); setPagination((p) => ({ ...p, page: 1 })); }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <DictSelect
              dictType={VIOLATION_STATUS_DICT}
              placeholder="违章状态"
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增违章记录</Button>
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
              <Form.Item name="violationType" label="违章类型" rules={[{ required: true, message: '请选择违章类型' }]}>
                <DictSelect dictType={VIOLATION_TYPE_DICT} placeholder="请选择" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="violationDate" label="违章时间" rules={[{ required: true, message: '请选择违章时间' }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="违章地点" rules={[{ required: true, message: '请输入违章地点' }]}>
                <Input placeholder="违章地点" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="fineAmount" label="罚款金额(元)">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="points" label="扣分">
                <InputNumber min={0} max={12} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <DictSelect dictType={VIOLATION_STATUS_DICT} placeholder="请选择" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 处理弹窗 */}
      <Modal title="处理违章" open={handleVisible} onOk={submitHandle} onCancel={() => setHandleVisible(false)} confirmLoading={submitLoading} width={480} destroyOnClose>
        <Form form={handleForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="handler" label="处理人" rules={[{ required: true, message: '请输入处理人' }]}>
            <Input placeholder="处理人姓名" />
          </Form.Item>
          <Form.Item name="status" label="处理结果" rules={[{ required: true }]}>
            <DictSelect dictType={VIOLATION_STATUS_DICT} placeholder="请选择" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="handleDate" label="处理日期" rules={[{ required: true, message: '请选择处理日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal title="违章详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={640}>
        {detail && (
          <Descriptions column={2} labelStyle={{ width: 100 }}>
            <Descriptions.Item label="车辆">{detail.vehicleName || '-'}</Descriptions.Item>
            <Descriptions.Item label="订单号">{detail.orderNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户">{detail.customerName || '-'}</Descriptions.Item>
            <Descriptions.Item label="违章类型">{detail.violationType ? <Tag color="red">{detail.violationType}</Tag> : '-'}</Descriptions.Item>
            <Descriptions.Item label="违章时间">{formatTime.renderDatetime(detail.violationDate)}</Descriptions.Item>
            <Descriptions.Item label="地点">{detail.location || '-'}</Descriptions.Item>
            <Descriptions.Item label="罚款">{detail.fineAmount != null ? `¥${detail.fineAmount}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="扣分">{detail.points ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColorMap[detail.status] || 'orange'}>{statusMap[detail.status]?.label || detail.status || '-'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="处理人">{detail.handler || '-'}</Descriptions.Item>
            <Descriptions.Item label="处理时间">{detail.handleDate ? formatTime.render(detail.handleDate) : '-'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{detail.remark || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default ViolationList;
