import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, Popconfirm, Switch, Image, DatePicker, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getCarouselListApi,
  addCarouselApi,
  updateCarouselApi,
  deleteCarouselApi,
  toggleCarouselStatusApi,
} from '@/api/modules/carousel';
import { getVehiclesApi } from '@/api/modules/vehicle';
import FileUploader from '@/components/FileUploader';
import { t } from '@/i18n';
import { imageUrl } from '@/utils/imageUrl';
import dayjs from 'dayjs';
import useAuthStore from '@/store/useAuthStore';

const CarouselSettings = () => {
  const { message: msgApi } = App.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [carouselImage, setCarouselImage] = useState('');
  const [vehicleList, setVehicleList] = useState([]);
  const [togglingId, setTogglingId] = useState(null);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();
  const canCarouselStatus = hasPermission('settings:carousel:status');
  const canCarouselUpdate = hasPermission('settings:carousel:update');
  const canCarouselDelete = hasPermission('settings:carousel:delete');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getCarouselListApi({ page: pagination.page, pageSize: pagination.pageSize });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchVehicles = async () => {
    try {
      const res = await getVehiclesApi({ page: 1, pageSize: 1000 });
      setVehicleList(res?.list || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const vehicleMap = useMemo(() => {
    const m = new Map();
    vehicleList.forEach((v) => m.set(String(v.id), v.name));
    return m;
  }, [vehicleList]);

  // 从 linkUrl（如 /vehicles/3）解析出车辆 ID
  const parseCarId = (linkUrl) => {
    const m = /\/vehicles\/(\d+)/.exec(linkUrl || '');
    return m ? Number(m[1]) : undefined;
  };

  const handleAdd = () => {
    setEditingId(null);
    setCarouselImage('');
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setCarouselImage(record.imageUrl || '');
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      carId: parseCarId(record.linkUrl),
      sortOrder: record.sortOrder,
      status: record.status,
      startTime: record.startTime ? dayjs(record.startTime) : undefined,
      endTime: record.endTime ? dayjs(record.endTime) : undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteCarouselApi(id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (record, checked) => {
    setTogglingId(record.id);
    try {
      await toggleCarouselStatusApi(record.id, checked ? 1 : 0);
      fetchData();
    } catch (e) {
      console.error(e);
    }
    setTogglingId(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!carouselImage) {
        msgApi.error('请上传轮播图图片');
        return;
      }
      const payload = {
        title: values.title,
        description: values.description,
        imageUrl: carouselImage,
        linkUrl: values.carId ? `/vehicles/${values.carId}` : null,
        sortOrder: values.sortOrder,
        status: values.status,
        startTime: values.startTime ? values.startTime.format('YYYY-MM-DD HH:mm:ss') : null,
        endTime: values.endTime ? values.endTime.format('YYYY-MM-DD HH:mm:ss') : null,
      };
      if (editingId) {
        await updateCarouselApi({ id: editingId, ...payload });
      } else {
        await addCarouselApi(payload);
      }
      setModalVisible(false);
      fetchData();
    } catch (e) {
      /* 校验失败或请求失败 */
    }
  };

  const columns = useMemo(() => [
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 60 },
    { title: '标题', dataIndex: 'title', key: 'title', width: 180 },
    { title: '描述', dataIndex: 'description', key: 'description', width: 200, ellipsis: true },
    { title: '图片', dataIndex: 'imageUrl', key: 'imageUrl', width: 100,
      render: (url) => url ? <Image src={imageUrl(url)} alt="轮播图" width={60} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <Tag>无</Tag>,
    },
    { title: '跳转车辆', dataIndex: 'linkUrl', key: 'linkUrl', width: 150, ellipsis: true,
      render: (linkUrl) => {
        const carId = parseCarId(linkUrl);
        return carId ? (vehicleMap.get(String(carId)) || `车辆#${carId}`) : <Tag>无</Tag>;
      },
    },
    { title: '上架时间', dataIndex: 'startTime', key: 'startTime', width: 160, render: (v) => v || '立即' },
    { title: '下架时间', dataIndex: 'endTime', key: 'endTime', width: 160, render: (v) => v || '长期' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (v) => v ? <Tag color="green">启用</Tag> : <Tag color="default">禁用</Tag> },
    ...(canCarouselStatus || canCarouselUpdate || canCarouselDelete ? [{
      title: '操作', key: 'action', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space>
          {canCarouselStatus && <Switch size="small" checked={record.status === 1} loading={togglingId === record.id} onChange={(checked) => handleToggleStatus(record, checked)} />}
          {canCarouselUpdate && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>}
          {canCarouselDelete && (
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ], [vehicleMap, togglingId, parseCarId, canCarouselStatus, canCarouselUpdate, canCarouselDelete, handleEdit, handleDelete, handleToggleStatus]);

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.carousel')}</h2>
      <Card variant="borderless">
        <div style={{ marginBottom: 16 }}>{hasPermission('settings:carousel:add') && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增轮播图</Button>}</div>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 'max-content' }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, pageSize) => setPagination({ page, pageSize }),
          }} />
      </Card>
      <Modal title={editingId ? '编辑轮播图' : '新增轮播图'} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} destroyOnClose width={560}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input placeholder="轮播图标题" /></Form.Item>
          <Form.Item name="description" label="描述"><Input placeholder="轮播图描述" /></Form.Item>
          <Form.Item label="轮播图图片" required>
            {carouselImage && (
              <div style={{ marginBottom: 8 }}>
                <Image src={imageUrl(carouselImage)} alt="轮播图" width={120} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
              </div>
            )}
            <FileUploader
              key={editingId || 'new'}
              bizType="carousel_image"
              onlyImage
              maxCount={1}
              listType="picture-card"
              uploadText={carouselImage ? '上传替换' : '上传'}
              hint="支持 jpg/jpeg/png/gif/webp，单文件最大 50MB，上传新图片将替换现有图片"
              onChange={(file) => setCarouselImage(file?.url || '')}
            />
          </Form.Item>
          <Form.Item name="carId" label="跳转车辆" tooltip="选择后 C 端点击轮播图跳转到该车辆详情页，不选则不跳转">
            <Select placeholder="选择跳转的车辆" allowClear showSearch optionFilterProp="label"
              options={vehicleList.map((v) => ({ label: v.name, value: v.id }))} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={1} rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select>
              <Select.Option value={1}>启用</Select.Option>
              <Select.Option value={0}>禁用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="startTime" label="定时上架时间" tooltip="留空则立即上架">
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endTime" label="定时下架时间" tooltip="留空则长期有效">
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

CarouselSettings.routeConfig = { path: '/settings/carousel', permission: 'settings' };
export default CarouselSettings;
