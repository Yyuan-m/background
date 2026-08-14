import { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined, PhoneOutlined, ShopOutlined } from '@ant-design/icons';
import { message } from '@/utils/antdStatic';
import {
  getCityListApi, addCityApi, updateCityApi, deleteCityApi, toggleCityStatusApi,
  getStoreListApi, addStoreApi, updateStoreApi, deleteStoreApi, toggleStoreStatusApi,
} from '@/api/modules/storeConfig';
import { formatTime } from '@/utils/formatTime';

const { Text } = Typography;

const StoreSettings = () => {
  // ===== 城市状态 =====
  const [cityList, setCityList] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [cityModalMode, setCityModalMode] = useState('add'); // add | edit
  const [cityEditing, setCityEditing] = useState(null);
  const [cityForm] = Form.useForm();

  // ===== 门店状态 =====
  const [storeList, setStoreList] = useState([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [storeModalMode, setStoreModalMode] = useState('add');
  const [storeEditing, setStoreEditing] = useState(null);
  const [storeForm] = Form.useForm();

  // ===== 城市数据加载 =====
  const fetchCities = useCallback(async () => {
    setCityLoading(true);
    try {
      const res = await getCityListApi();
      setCityList(res || []);
      // 默认选中第一个城市
      if ((res || []).length > 0 && !selectedCityId) {
        setSelectedCityId(res[0].id);
      }
    } catch (e) { console.error(e); } finally { setCityLoading(false); }
  }, [selectedCityId]);

  // ===== 门店数据加载 =====
  const fetchStores = useCallback(async (cityId) => {
    if (!cityId) { setStoreList([]); return; }
    setStoreLoading(true);
    try {
      const res = await getStoreListApi(cityId);
      setStoreList(res || []);
    } catch (e) { console.error(e); } finally { setStoreLoading(false); }
  }, []);

  useEffect(() => { void fetchCities(); }, [fetchCities]);
  useEffect(() => { void fetchStores(selectedCityId); }, [selectedCityId, fetchStores]);

  // ===== 城市操作 =====
  const openCityAdd = () => {
    setCityModalMode('add');
    setCityEditing(null);
    cityForm.resetFields();
    cityForm.setFieldsValue({ sort: 0, status: 1 });
    setCityModalOpen(true);
  };

  const openCityEdit = (record) => {
    setCityModalMode('edit');
    setCityEditing(record);
    cityForm.setFieldsValue({
      name: record.name,
      sort: record.sort,
      status: record.status,
    });
    setCityModalOpen(true);
  };

  const handleCitySubmit = async () => {
    try {
      const values = await cityForm.validateFields();
      if (cityModalMode === 'add') {
        await addCityApi(values);
      } else {
        await updateCityApi(cityEditing.id, values);
      }
      setCityModalOpen(false);
      void fetchCities();
    } catch (e) {
      if (e?.errorFields) return; // 表单校验错误，不关闭弹窗
    }
  };

  const handleCityDelete = async (id) => {
    try {
      await deleteCityApi(id);
      if (selectedCityId === id) {
        const remaining = cityList.filter((c) => c.id !== id);
        setSelectedCityId(remaining.length > 0 ? remaining[0].id : null);
      } else {
        void fetchCities();
      }
    } catch { /* 请求模块已处理错误提示 */ }
  };

  const handleCityStatusToggle = async (record) => {
    try {
      await toggleCityStatusApi(record.id, record.status === 1 ? 0 : 1);
      void fetchCities();
    } catch { /* 请求模块已处理错误提示 */ }
  };

  // ===== 门店操作 =====
  const openStoreAdd = () => {
    if (!selectedCityId) { message.warning('请先选择城市'); return; }
    setStoreModalMode('add');
    setStoreEditing(null);
    storeForm.resetFields();
    storeForm.setFieldsValue({ sort: 0, status: 1 });
    setStoreModalOpen(true);
  };

  const openStoreEdit = (record) => {
    setStoreModalMode('edit');
    setStoreEditing(record);
    storeForm.setFieldsValue({
      name: record.name,
      address: record.address,
      phone: record.phone,
      sort: record.sort,
      status: record.status,
    });
    setStoreModalOpen(true);
  };

  const handleStoreSubmit = async () => {
    try {
      const values = await storeForm.validateFields();
      if (storeModalMode === 'add') {
        await addStoreApi({ ...values, cityId: selectedCityId });
      } else {
        await updateStoreApi(storeEditing.id, values);
      }
      setStoreModalOpen(false);
      void fetchStores(selectedCityId);
    } catch (e) {
      if (e?.errorFields) return; // 表单校验错误，不关闭弹窗
    }
  };

  const handleStoreDelete = async (id) => {
    try {
      await deleteStoreApi(id);
      void fetchStores(selectedCityId);
    } catch { /* 请求模块已处理错误提示 */ }
  };

  const handleStoreStatusToggle = async (record) => {
    try {
      await toggleStoreStatusApi(record.id, record.status === 1 ? 0 : 1);
      void fetchStores(selectedCityId);
    } catch { /* 请求模块已处理错误提示 */ }
  };

  // ===== 城市表格列 =====
  const cityColumns = useMemo(() => [
    { title: '城市名称', dataIndex: 'name', key: 'name', width: 140 },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 70, align: 'center' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80, align: 'center',
      render: (v) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160,
      render: (v) => formatTime(v),
    },
    {
      title: '操作', key: 'action', width: 180, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small"
            onClick={() => setSelectedCityId(record.id)}
            style={selectedCityId === record.id ? { color: '#1677ff', fontWeight: 600 } : {}}
          >查看门店</Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => openCityEdit(record)}>编辑</Button>
          <Button type="link" size="small"
            onClick={() => handleCityStatusToggle(record)}
            style={{ color: record.status === 1 ? '#faad14' : '#52c41a' }}
          >{record.status === 1 ? '禁用' : '启用'}</Button>
          <Popconfirm
            title="删除城市"
            description="删除城市将同时删除该城市下所有门店，确认删除？"
            onConfirm={() => handleCityDelete(record.id)}
            okText="确认" cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [selectedCityId, cityList]);

  // ===== 门店表格列 =====
  const storeColumns = useMemo(() => [
    { title: '门店名称', dataIndex: 'name', key: 'name', width: 160 },
    {
      title: '地址', dataIndex: 'address', key: 'address', width: 220,
      render: (v) => v ? <span><EnvironmentOutlined style={{ marginRight: 4, color: '#999' }} />{v}</span> : <Text type="secondary">-</Text>,
    },
    {
      title: '电话', dataIndex: 'phone', key: 'phone', width: 140,
      render: (v) => v ? <span><PhoneOutlined style={{ marginRight: 4, color: '#999' }} />{v}</span> : <Text type="secondary">-</Text>,
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 70, align: 'center' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80, align: 'center',
      render: (v) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 160, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => openStoreEdit(record)}>编辑</Button>
          <Button type="link" size="small"
            onClick={() => handleStoreStatusToggle(record)}
            style={{ color: record.status === 1 ? '#faad14' : '#52c41a' }}
          >{record.status === 1 ? '禁用' : '启用'}</Button>
          <Popconfirm
            title="确认删除该门店？"
            onConfirm={() => handleStoreDelete(record.id)}
            okText="确认" cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], []);

  const selectedCity = cityList.find((c) => c.id === selectedCityId);

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        {/* 左侧：城市列表 */}
        <Col xs={24} lg={10}>
          <Card
            title={<span><ShopOutlined style={{ marginRight: 8 }} />城市列表</span>}
            extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCityAdd}>新增城市</Button>}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              style={{ margin: 8 }}
              dataSource={cityList}
              columns={cityColumns}
              rowKey="id"
              loading={cityLoading}
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              onRow={(record) => ({
                onClick: () => setSelectedCityId(record.id),
                style: { cursor: 'pointer', background: selectedCityId === record.id ? '#e6f4ff' : undefined },
              })}
            />
          </Card>
        </Col>

        {/* 右侧：门店列表 */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <span>
                <EnvironmentOutlined style={{ marginRight: 8 }} />
                门店列表
                {selectedCity && <Text type="secondary" style={{ marginLeft: 8, fontSize: 14 }}>- {selectedCity.name}</Text>}
              </span>
            }
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={openStoreAdd} disabled={!selectedCityId}>
                新增门店
              </Button>
            }
            styles={{ body: { padding: 0 } }}
          >
            {selectedCityId ? (
              <Table
                style={{ margin: 8 }}
                dataSource={storeList}
                columns={storeColumns}
                rowKey="id"
                loading={storeLoading}
                size="small"
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#999' }}>
                <EnvironmentOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <div>请在左侧选择城市后查看门店</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 城市新增/编辑 Modal */}
      <Modal
        title={cityModalMode === 'add' ? '新增城市' : '编辑城市'}
        open={cityModalOpen}
        onOk={handleCitySubmit}
        onCancel={() => setCityModalOpen(false)}
        okText="保存" cancelText="取消"
        destroyOnClose
      >
        <Form form={cityForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="城市名称" rules={[{ required: true, message: '请输入城市名称' }]}>
            <Input placeholder="如：北京" maxLength={50} />
          </Form.Item>
          <Form.Item name="sort" label="排序" extra="数字越小越靠前">
            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 门店新增/编辑 Modal */}
      <Modal
        title={storeModalMode === 'add' ? '新增门店' : '编辑门店'}
        open={storeModalOpen}
        onOk={handleStoreSubmit}
        onCancel={() => setStoreModalOpen(false)}
        okText="保存" cancelText="取消"
        destroyOnClose
        width={520}
      >
        <Form form={storeForm} layout="vertical" style={{ marginTop: 16 }}>
          {selectedCity && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
              所属城市：<Text strong>{selectedCity.name}</Text>
            </div>
          )}
          <Form.Item name="name" label="门店名称" rules={[{ required: true, message: '请输入门店名称' }]}>
            <Input placeholder="如：北京首都机场店" maxLength={100} />
          </Form.Item>
          <Form.Item name="address" label="门店地址">
            <Input placeholder="如：北京市顺义区首都机场T3航站楼" maxLength={255} />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input placeholder="如：010-12345678" maxLength={20} />
          </Form.Item>
          <Form.Item name="sort" label="排序" extra="数字越小越靠前">
            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

StoreSettings.routeConfig = { path: '/settings/store', permission: 'settings' };

export default StoreSettings;
