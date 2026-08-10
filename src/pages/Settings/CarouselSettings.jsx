import { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getCarouselListApi,
  addCarouselApi,
  updateCarouselApi,
  deleteCarouselApi,
} from '@/api/modules/carousel';
import { t } from '@/i18n';
import { imageUrl } from '@/utils/imageUrl';

const CarouselSettings = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination]);

  const handleAdd = () => { setEditingId(null); form.resetFields(); setModalVisible(true); };
  const handleEdit = (record) => { setEditingId(record.id); form.setFieldsValue(record); setModalVisible(true); };

  const handleDelete = async (id) => {
    try {
      await deleteCarouselApi(id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await updateCarouselApi({ id: editingId, ...values });
      } else {
        await addCarouselApi(values);
      }
      setModalVisible(false);
      fetchData();
    } catch (e) {
      /* 校验失败或请求失败 */
    }
  };

  const columns = [
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 60 },
    { title: '标题', dataIndex: 'title', key: 'title', width: 200 },
    { title: '描述', dataIndex: 'description', key: 'description', width: 200, ellipsis: true },
    { title: '图片', dataIndex: 'imageUrl', key: 'imageUrl', width: 100,
      render: (url) => url ? <img src={imageUrl(url)} alt="轮播图" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : <Tag>无</Tag>,
    },
    { title: '链接', dataIndex: 'linkUrl', key: 'linkUrl', width: 150, ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (v) => v ? <Tag color="green">启用</Tag> : <Tag color="default">禁用</Tag> },
    { title: '操作', key: 'action', width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.carousel')}</h2>
      <Card variant="borderless">
        <div style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增轮播图</Button></div>
        <div>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
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
        </div>
      </Card>
      <Modal title={editingId ? '编辑轮播图' : '新增轮播图'} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input placeholder="轮播图标题" /></Form.Item>
          <Form.Item name="description" label="描述"><Input placeholder="轮播图描述" /></Form.Item>
          <Form.Item name="imageUrl" label="图片地址"><Input placeholder="如：https://example.com/banner.jpg" /></Form.Item>
          <Form.Item name="linkUrl" label="跳转链接"><Input placeholder="如：/vehicles/3" /></Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={1}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}><Select><Select.Option value={1}>启用</Select.Option><Select.Option value={0}>禁用</Select.Option></Select></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

CarouselSettings.routeConfig = { path: '/settings/carousel', permission: 'settings' };
export default CarouselSettings;
