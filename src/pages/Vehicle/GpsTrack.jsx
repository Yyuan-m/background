import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Select, Row, Col, Button, Badge, Space, Modal, Form, Input, InputNumber, DatePicker, Popconfirm, Descriptions } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { message } from '@/utils/antdStatic';
import dayjs from 'dayjs';
import { getGpsTrackListApi, addGpsTrackApi, updateGpsTrackApi, deleteGpsTrackApi } from '@/api/modules/gps-track';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useVehicleOptions from '@/hooks/useVehicleOptions';
import { formatTime } from '@/utils/formatTime';
import useAuthStore from '@/store/useAuthStore';

const GPS_STATUS_DICT = 'gps_status';

const GpsTrack = () => {
  const { options: vehicleOptions } = useVehicleOptions();
  const { map: statusMap } = useDict(GPS_STATUS_DICT);
  const { hasPermission } = useAuthStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增GPS轨迹');
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGpsTrackListApi({
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
    setModalTitle('新增GPS轨迹');
    form.resetFields();
    form.setFieldsValue({ status: 'parked', timestamp: dayjs() });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setModalTitle('编辑GPS轨迹');
    form.setFieldsValue({
      ...record,
      timestamp: record.timestamp ? dayjs(record.timestamp) : null,
    });
    setModalVisible(true);
  };

  const handleDetail = (record) => {
    setDetail(record);
    setDetailVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteGpsTrackApi(id);
      void fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      const payload = {
        ...values,
        timestamp: values.timestamp ? values.timestamp.format('YYYY-MM-DD HH:mm:ss') : null,
        vehicleName: vehicleOptions.find((v) => v.value === values.vehicleId)?.label || '',
      };
      if (editingId) {
        await updateGpsTrackApi({ ...payload, id: editingId });
      } else {
        await addGpsTrackApi(payload);
      }
      message.success(editingId ? '编辑成功' : '新增成功');
      setModalVisible(false);
      void fetchData();
    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
    } finally { setSubmitLoading(false); }
  };

  const columns = useMemo(() => [
    { title: '车辆', dataIndex: 'vehicleName', key: 'vehicleName', width: 160 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v) => {
        const cfg = statusMap[v];
        const text = cfg?.label || v || '-';
        return v === 'moving' ? <Badge status="processing" text={text} /> : <Badge status="default" text={text} />;
      },
    },
    { title: '速度(km/h)', dataIndex: 'speed', key: 'speed', width: 100, render: (v) => v ?? '-' },
    { title: '位置', dataIndex: 'address', key: 'address', width: 200, ellipsis: true, render: (v) => v || '-' },
    { title: '经度', dataIndex: 'longitude', key: 'longitude', width: 110, render: (v) => v ?? '-' },
    { title: '纬度', dataIndex: 'latitude', key: 'latitude', width: 110, render: (v) => v ?? '-' },
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 160, render: formatTime.renderDatetime },
    {
      title: '操作', key: 'action', fixed: 'right', width: 180,
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleDetail(r)}>详情</Button>
          {hasPermission('vehicle:gps:update') && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>}
          {hasPermission('vehicle:gps:delete') && (
            <Popconfirm title="确认删除该GPS轨迹？" onConfirm={() => handleDelete(r.id)} okText="确认" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ], [hasPermission, statusMap, handleDetail, handleEdit, handleDelete]);

  return (
    <div className="page-container">
      <h2 className="page-title">GPS轨迹</h2>
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
              dictType={GPS_STATUS_DICT}
              placeholder="GPS状态"
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
          {hasPermission('vehicle:gps:add') && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增GPS轨迹</Button>}
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
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <DictSelect dictType={GPS_STATUS_DICT} placeholder="请选择" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="latitude" label="纬度" rules={[{ required: true, message: '请输入纬度' }]}>
                <InputNumber min={-90} max={90} step={0.000001} style={{ width: '100%' }} placeholder="如：39.9042" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="longitude" label="经度" rules={[{ required: true, message: '请输入经度' }]}>
                <InputNumber min={-180} max={180} step={0.000001} style={{ width: '100%' }} placeholder="如：116.4074" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="speed" label="速度(km/h)">
                <InputNumber min={0} max={300} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timestamp" label="采集时间" rules={[{ required: true, message: '请选择采集时间' }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="位置描述">
            <Input placeholder="如：北京市东安门大街" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal title="GPS轨迹详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={600}>
        {detail && (
          <Descriptions column={2} labelStyle={{ width: 100 }}>
            <Descriptions.Item label="车辆">{detail.vehicleName || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {detail.status === 'moving'
                ? <Badge status="processing" text={statusMap[detail.status]?.label || detail.status} />
                : <Badge status="default" text={statusMap[detail.status]?.label || detail.status} />}
            </Descriptions.Item>
            <Descriptions.Item label="速度">{detail.speed != null ? `${detail.speed} km/h` : '-'}</Descriptions.Item>
            <Descriptions.Item label="时间">{formatTime.renderDatetime(detail.timestamp)}</Descriptions.Item>
            <Descriptions.Item label="经度">{detail.longitude ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="纬度">{detail.latitude ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="位置" span={2}>{detail.address || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

GpsTrack.routeConfig = { path: '/vehicles/gps', permission: 'vehicle:gps' };
export default GpsTrack;
