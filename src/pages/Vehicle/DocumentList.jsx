import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Select, Row, Col, Button, Tag, Space, Modal, Form, Input, DatePicker, Popconfirm, Descriptions } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { message } from '@/utils/antdStatic';
import dayjs from 'dayjs';
import { getCarDocumentListApi, getCarDocumentDetailApi, addCarDocumentApi, updateCarDocumentApi, deleteCarDocumentApi } from '@/api/modules/car-document';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useVehicleOptions from '@/hooks/useVehicleOptions';
import { formatTime } from '@/utils/formatTime';

const DOCUMENT_TYPE_DICT = 'document_type';
const DOCUMENT_STATUS_DICT = 'document_status';

const statusColorMap = { valid: 'green', warning: 'orange', expiring: 'orange', expired: 'red' };

const DocumentList = () => {
  const { options: vehicleOptions } = useVehicleOptions();
  const { map: statusMap } = useDict(DOCUMENT_STATUS_DICT);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增证件');
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCarDocumentListApi({
        page: pagination.page,
        pageSize: pagination.pageSize,
        vehicleId: filterVehicle || undefined,
        docType: filterType || undefined,
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
    setModalTitle('新增证件');
    form.resetFields();
    form.setFieldsValue({ status: 'valid' });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setModalTitle('编辑证件');
    form.setFieldsValue({
      ...record,
      issueDate: record.issueDate ? dayjs(record.issueDate) : null,
      expireDate: record.expireDate ? dayjs(record.expireDate) : null,
    });
    setModalVisible(true);
  };

  const handleDetail = async (id) => {
    try {
      const res = await getCarDocumentDetailApi(id);
      setDetail(res);
      setDetailVisible(true);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCarDocumentApi(id);
      void fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      const payload = {
        ...values,
        issueDate: values.issueDate ? values.issueDate.format('YYYY-MM-DD') : null,
        expireDate: values.expireDate ? values.expireDate.format('YYYY-MM-DD') : null,
        vehicleName: vehicleOptions.find((v) => v.value === values.vehicleId)?.label || '',
      };
      if (editingId) {
        await updateCarDocumentApi({ ...payload, id: editingId });
      } else {
        await addCarDocumentApi(payload);
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
    { title: '车辆', dataIndex: 'vehicleName', key: 'vehicleName', width: 160 },
    { title: '证件类型', dataIndex: 'docType', key: 'docType', width: 100, render: (v) => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: '证件编号', dataIndex: 'docNumber', key: 'docNumber', width: 140, render: (v) => v || '-' },
    { title: '有效期', key: 'period', width: 200, render: (_, r) => `${formatTime.render(r.issueDate)} ~ ${formatTime.render(r.expireDate)}` },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v) => {
        const cfg = statusMap[v];
        const text = cfg?.label || v || '-';
        return <Tag color={statusColorMap[v] || 'default'}>{text}</Tag>;
      },
    },
    { title: '备注', dataIndex: 'remark', key: 'remark', width: 180, ellipsis: true, render: (v) => v || '-' },
    {
      title: '操作', key: 'action', fixed: 'right', width: 180,
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleDetail(r.id)}>详情</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除该证件？" onConfirm={() => handleDelete(r.id)} okText="确认" cancelText="取消">
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
              dictType={DOCUMENT_TYPE_DICT}
              placeholder="证件类型"
              value={filterType || undefined}
              onChange={(v) => { setFilterType(v || ''); setPagination((p) => ({ ...p, page: 1 })); }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <DictSelect
              dictType={DOCUMENT_STATUS_DICT}
              placeholder="证件状态"
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增证件</Button>
        </div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
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
              <Form.Item name="docType" label="证件类型" rules={[{ required: true, message: '请选择证件类型' }]}>
                <DictSelect dictType={DOCUMENT_TYPE_DICT} placeholder="请选择" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="docNumber" label="证件编号" rules={[{ required: true, message: '请输入证件编号' }]}>
                <Input placeholder="证件编号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <DictSelect dictType={DOCUMENT_STATUS_DICT} placeholder="请选择" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="issueDate" label="发证日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expireDate" label="到期日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="imageUrl" label="证件图片URL">
            <Input placeholder="证件图片地址" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal title="证件详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={600}>
        {detail && (
          <Descriptions column={2} labelStyle={{ width: 100 }}>
            <Descriptions.Item label="车辆">{detail.vehicleName || '-'}</Descriptions.Item>
            <Descriptions.Item label="证件类型">{detail.docType || '-'}</Descriptions.Item>
            <Descriptions.Item label="证件编号">{detail.docNumber || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColorMap[detail.status] || 'default'}>{statusMap[detail.status]?.label || detail.status || '-'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发证日期">{formatTime.render(detail.issueDate)}</Descriptions.Item>
            <Descriptions.Item label="到期日期">{formatTime.render(detail.expireDate)}</Descriptions.Item>
            <Descriptions.Item label="图片" span={2}>{detail.imageUrl || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{detail.remark || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default DocumentList;
