import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Input, InputNumber,
  Popconfirm, Space, Select, Drawer, Row, Col, Tooltip, Statistic,
} from 'antd';
import { message } from '@/utils/antdStatic';
import {
  EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined,
  ReloadOutlined, CopyOutlined, SearchOutlined, RestOutlined,
} from '@ant-design/icons';
import {
  getDictTypesApi,
  addDictTypeApi,
  updateDictTypeApi,
  deleteDictTypeApi,
  batchDeleteDictTypeApi,
  getDictDataPageApi,
  addDictDataApi,
  updateDictDataApi,
  deleteDictDataApi,
  batchDeleteDictDataApi,
} from '@/api/modules/dict';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';
import useAuthStore from '@/store/useAuthStore';

const STATUS_OPTIONS = [
  { value: 1, label: '启用' },
  { value: 0, label: '停用' },
];

const statusRender = (v) => (
  v === 1 || v === '1'
    ? <Tag color="green">正常</Tag>
    : <Tag color="red">停用</Tag>
);

const DictionarySettings = () => {
  // ---------- 字典类型 ----------
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 字典类型筛选条件
  const [filters, setFilters] = useState({ dictName: '', dictType: '', status: undefined });
  const [filtersInput, setFiltersInput] = useState({ dictName: '', dictType: '', status: undefined });

  // ---------- 字典数据 ----------
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTypeName, setSelectedTypeName] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [dictData, setDictData] = useState([]);
  const [dictDataLoading, setDictDataLoading] = useState(false);
  const [dictDataPagination, setDictDataPagination] = useState({ page: 1, pageSize: 10 });
  const [dictDataTotal, setDictDataTotal] = useState(0);
  const [dataModalVisible, setDataModalVisible] = useState(false);
  const [editingDataId, setEditingDataId] = useState(null);
  const [dataSubmitting, setDataSubmitting] = useState(false);
  const [dataForm] = Form.useForm();
  const [dataSelectedRowKeys, setDataSelectedRowKeys] = useState([]);

  // 字典数据筛选条件
  const [dataFilters, setDataFilters] = useState({ dictLabel: '', status: undefined });
  const [dataFiltersInput, setDataFiltersInput] = useState({ dictLabel: '', status: undefined });

  const { hasPermission } = useAuthStore();
  const canDictUpdate = hasPermission('settings:dict:update');
  const canDictDelete = hasPermission('settings:dict:delete');

  // ========== 字典类型查询 ==========
  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDictTypesApi({
        page: pagination.page,
        pageSize: pagination.pageSize,
        dictName: filters.dictName || undefined,
        dictType: filters.dictType || undefined,
        status: filters.status,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (e) {
      message.error(e.message || '查询字典类型失败');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    void fetchTypes();
  }, [fetchTypes]);

  const handleSearch = () => {
    setFilters(filtersInput);
    setPagination({ ...pagination, page: 1 });
  };

  const handleReset = () => {
    setFiltersInput({ dictName: '', dictType: '', status: undefined });
    setFilters({ dictName: '', dictType: '', status: undefined });
    setPagination({ ...pagination, page: 1 });
  };

  const handleRefresh = () => {
    setSelectedRowKeys([]);
    void fetchTypes();
  };

  const handleTableChange = (pag) => {
    setPagination({ page: pag.current, pageSize: pag.pageSize });
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ status: 1 });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      status: Number(record.status),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDictTypeApi(id);
      // 删除后若当前页只剩一条且非首页，回退一页
      if (data.length === 1 && pagination.page > 1) {
        setPagination({ ...pagination, page: pagination.page - 1 });
      } else {
        void fetchTypes();
      }
    } catch (e) {
      message.error(e.message || '删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await batchDeleteDictTypeApi(selectedRowKeys);
      setSelectedRowKeys([]);
      if (data.length === selectedRowKeys.length && pagination.page > 1) {
        setPagination({ ...pagination, page: pagination.page - 1 });
      } else {
        void fetchTypes();
      }
    } catch (e) {
      message.error(e.message || '批量删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingId) {
        await updateDictTypeApi({ ...values, id: editingId });
      } else {
        await addDictTypeApi(values);
      }
      setModalVisible(false);
      void fetchTypes();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 一键复制字典类型编码
  const handleCopyType = (text) => {
    if (!text) return;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      message.success(`已复制：${text}`);
    } catch {
      message.error('复制失败，请手动复制');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  // ========== 字典数据查询 ==========
  const fetchDictData = useCallback(async () => {
    if (!selectedType) return;
    setDictDataLoading(true);
    try {
      const res = await getDictDataPageApi({
        page: dictDataPagination.page,
        pageSize: dictDataPagination.pageSize,
        dictType: selectedType,
        dictLabel: dataFilters.dictLabel || undefined,
        status: dataFilters.status,
      });
      setDictData(res?.list || []);
      setDictDataTotal(res?.total || 0);
    } catch (e) {
      message.error(e.message || '查询字典数据失败');
    } finally {
      setDictDataLoading(false);
    }
  }, [selectedType, dictDataPagination, dataFilters]);

  const handleViewData = (record) => {
    setSelectedType(record.dictType);
    setSelectedTypeName(record.dictName);
    setDrawerVisible(true);
    setDataFilters({ dictLabel: '', status: undefined });
    setDataFiltersInput({ dictLabel: '', status: undefined });
    setDictDataPagination({ page: 1, pageSize: 10 });
    setDataSelectedRowKeys([]);
  };

  useEffect(() => {
    if (drawerVisible && selectedType) {
      void fetchDictData();
    }
  }, [drawerVisible, selectedType, dictDataPagination, dataFilters, fetchDictData]);

  const handleDataSearch = () => {
    setDataFilters(dataFiltersInput);
    setDictDataPagination({ ...dictDataPagination, page: 1 });
  };

  const handleDataReset = () => {
    setDataFiltersInput({ dictLabel: '', status: undefined });
    setDataFilters({ dictLabel: '', status: undefined });
    setDictDataPagination({ ...dictDataPagination, page: 1 });
  };

  const handleDataRefresh = () => {
    setDataSelectedRowKeys([]);
    void fetchDictData();
  };

  const handleDataTableChange = (pag) => {
    setDictDataPagination({ page: pag.current, pageSize: pag.pageSize });
  };

  const handleAddData = () => {
    setEditingDataId(null);
    dataForm.resetFields();
    dataForm.setFieldsValue({ dictType: selectedType, status: 1, sortOrder: 0 });
    setDataModalVisible(true);
  };

  const handleEditData = (record) => {
    setEditingDataId(record.id);
    dataForm.setFieldsValue({
      ...record,
      status: Number(record.status),
      sortOrder: Number(record.sortOrder ?? 0),
    });
    setDataModalVisible(true);
  };

  const handleDeleteData = async (id) => {
    try {
      await deleteDictDataApi(id);
      if (dictData.length === 1 && dictDataPagination.page > 1) {
        setDictDataPagination({ ...dictDataPagination, page: dictDataPagination.page - 1 });
      } else {
        void fetchDictData();
      }
    } catch (e) {
      message.error(e.message || '删除失败');
    }
  };

  const handleBatchDeleteData = async () => {
    if (dataSelectedRowKeys.length === 0) return;
    try {
      await batchDeleteDictDataApi(dataSelectedRowKeys);
      setDataSelectedRowKeys([]);
      if (dictData.length === dataSelectedRowKeys.length && dictDataPagination.page > 1) {
        setDictDataPagination({ ...dictDataPagination, page: dictDataPagination.page - 1 });
      } else {
        void fetchDictData();
      }
    } catch (e) {
      message.error(e.message || '批量删除失败');
    }
  };

  const handleSubmitData = async () => {
    try {
      const values = await dataForm.validateFields();
      setDataSubmitting(true);
      if (editingDataId) {
        await updateDictDataApi({ ...values, id: editingDataId });
      } else {
        await addDictDataApi(values);
      }
      setDataModalVisible(false);
      void fetchDictData();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message || '操作失败');
    } finally {
      setDataSubmitting(false);
    }
  };

  // ========== 列定义 ==========
  const columns = useMemo(() => [
    { title: '字典名称', dataIndex: 'dictName', key: 'dictName', width: 160 },
    {
      title: '字典类型', dataIndex: 'dictType', key: 'dictType', width: 200,
      render: (text) => (
        <Space>
          <code style={{ background: 'var(--table-header-bg, #fafbfc)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{text}</code>
          <Tooltip title="复制类型编码">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopyType(text)} />
          </Tooltip>
        </Space>
      ),
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: statusRender },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180, render: formatTime.render },
    {
      title: '操作', key: 'action', width: 240, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewData(record)}>数据</Button>
          {canDictUpdate && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>}
          {canDictDelete && (
            <Popconfirm title="确认删除该字典类型？" onConfirm={() => handleDelete(record.id)} okText="确认" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ], [data, pagination, canDictUpdate, canDictDelete]);

  const dictDataColumns = useMemo(() => [
    { title: '标签', dataIndex: 'dictLabel', key: 'dictLabel', width: 160 },
    {
      title: '键值', dataIndex: 'dictValue', key: 'dictValue', width: 140,
      render: (text) => (
        <Space>
          <code style={{ background: 'var(--table-header-bg, #fafbfc)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{text}</code>
          <Tooltip title="复制键值">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopyType(text)} />
          </Tooltip>
        </Space>
      ),
    },
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 80, align: 'center' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: statusRender },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: formatTime.render },
    ...(canDictUpdate || canDictDelete ? [{
      title: '操作', key: 'action', width: 140, fixed: 'right',
      render: (_, record) => (
        <Space>
          {canDictUpdate && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditData(record)}>编辑</Button>}
          {canDictDelete && (
            <Popconfirm title="确认删除该字典数据？" onConfirm={() => handleDeleteData(record.id)} okText="确认" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ], [dictData, dictDataPagination, canDictUpdate, canDictDelete]);

  // 字典类型行选择
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    preserveSelectedRowKeys: true,
  };

  // 字典数据行选择
  const dataRowSelection = {
    selectedRowKeys: dataSelectedRowKeys,
    onChange: (keys) => setDataSelectedRowKeys(keys),
    preserveSelectedRowKeys: true,
  };

  const hasTypeSelection = selectedRowKeys.length > 0;
  const hasDataSelection = dataSelectedRowKeys.length > 0;

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.dictionary')}</h2>

      <Card variant="borderless" style={{ marginBottom: 12 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="字典名称（模糊查询）"
              value={filtersInput.dictName}
              onChange={(e) => setFiltersInput({ ...filtersInput, dictName: e.target.value })}
              onPressEnter={handleSearch}
              allowClear
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="字典类型编码（模糊查询）"
              value={filtersInput.dictType}
              onChange={(e) => setFiltersInput({ ...filtersInput, dictType: e.target.value })}
              onPressEnter={handleSearch}
              allowClear
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="状态"
              value={filtersInput.status}
              onChange={(v) => setFiltersInput({ ...filtersInput, status: v })}
              allowClear
              options={STATUS_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={7}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
              <Button icon={<RestOutlined />} onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card variant="borderless">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Space wrap>
            {hasPermission('settings:dict:add') && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增字典类型</Button>}
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>刷新</Button>
            {hasTypeSelection && hasPermission('settings:dict:delete') && (
              <Popconfirm
                title={`确认批量删除选中的 ${selectedRowKeys.length} 条字典类型？`}
                description="若类型下存在字典数据将无法删除"
                onConfirm={handleBatchDelete}
                okText="确认" cancelText="取消"
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量删除 {hasTypeSelection ? `(${selectedRowKeys.length})` : ''}
                </Button>
              </Popconfirm>
            )}
          </Space>
          {hasTypeSelection && (
            <span style={{ color: 'var(--primary-color)' }}>
              已选中 {selectedRowKeys.length} 项
            </span>
          )}
        </div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (count) => `共 ${count} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>

      {/* 字典类型新增/编辑 Modal */}
      <Modal
        title={editingId ? '编辑字典类型' : '新增字典类型'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dictName" label="字典名称" rules={[{ required: true, message: '请输入字典名称' }]}>
                <Input placeholder="如：车辆品牌、订单状态" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dictType"
                label="字典类型编码"
                rules={[
                  { required: true, message: '请输入字典类型编码' },
                  { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '须以字母开头，仅支持字母、数字、下划线' },
                ]}
                tooltip="唯一标识，如 vehicle_brand"
              >
                <Input placeholder="如：vehicle_brand" disabled={!!editingId} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注说明" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 字典数据 Drawer */}
      <Drawer
        title={
          <Space>
            <span>字典数据</span>
            {selectedTypeName && <Tag color="blue">{selectedTypeName}</Tag>}
            {selectedType && <code style={{ fontSize: 12 }}>{selectedType}</code>}
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleDataRefresh}>刷新</Button>
          </Space>
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={960}
      >
        {/* 字典数据统计 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="字典类型" value={selectedType || '-'} valueStyle={{ fontSize: 14 }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="类型名称" value={selectedTypeName || '-'} valueStyle={{ fontSize: 14 }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="数据总数" value={dictDataTotal} valueStyle={{ fontSize: 14 }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="当前页"
                value={`${dictDataPagination.page}/${Math.max(1, Math.ceil(dictDataTotal / dictDataPagination.pageSize))}`}
                valueStyle={{ fontSize: 14 }}
              />
            </Card>
          </Col>
        </Row>

        {/* 字典数据筛选区 */}
        <Card size="small" variant="borderless" style={{ marginBottom: 12 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="字典标签（模糊查询）"
                value={dataFiltersInput.dictLabel}
                onChange={(e) => setDataFiltersInput({ ...dataFiltersInput, dictLabel: e.target.value })}
                onPressEnter={handleDataSearch}
                allowClear
                prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="状态"
                value={dataFiltersInput.status}
                onChange={(v) => setDataFiltersInput({ ...dataFiltersInput, status: v })}
                allowClear
                options={STATUS_OPTIONS}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={24} md={10}>
              <Space>
                <Button type="primary" size="small" icon={<SearchOutlined />} onClick={handleDataSearch}>查询</Button>
                <Button size="small" icon={<RestOutlined />} onClick={handleDataReset}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 字典数据操作区 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <Space wrap>
            {hasPermission('settings:dict:add') && <Button type="primary" icon={<PlusOutlined />} onClick={handleAddData}>新增字典数据</Button>}
            {hasDataSelection && hasPermission('settings:dict:delete') && (
              <Popconfirm
                title={`确认批量删除选中的 ${dataSelectedRowKeys.length} 条字典数据？`}
                onConfirm={handleBatchDeleteData}
                okText="确认" cancelText="取消"
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量删除 ({dataSelectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}
          </Space>
          {hasDataSelection && (
            <span style={{ color: 'var(--primary-color)' }}>
              已选中 {dataSelectedRowKeys.length} 项
            </span>
          )}
        </div>

        <Table
          columns={dictDataColumns}
          dataSource={dictData}
          rowKey="id"
          loading={dictDataLoading}
          rowSelection={dataRowSelection}
          onChange={handleDataTableChange}
          size="small"
          scroll={{ x: 900 }}
          pagination={{
            current: dictDataPagination.page,
            pageSize: dictDataPagination.pageSize,
            total: dictDataTotal,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (count) => `共 ${count} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Drawer>

      {/* 字典数据新增/编辑 Modal */}
      <Modal
        title={editingDataId ? '编辑字典数据' : '新增字典数据'}
        open={dataModalVisible}
        onOk={handleSubmitData}
        onCancel={() => setDataModalVisible(false)}
        confirmLoading={dataSubmitting}
        destroyOnClose
        width={560}
      >
        <Form form={dataForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="dictType" label="字典类型" rules={[{ required: true }]}>
            <Input disabled />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dictLabel" label="字典标签" rules={[{ required: true, message: '请输入字典标签' }]}>
                <Input placeholder="如：保时捷、待审核" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dictValue" label="字典键值" rules={[{ required: true, message: '请输入字典键值' }]}>
                <Input placeholder="如：porsche、pending" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}
                tooltip="数字越小越靠前">
                <InputNumber min={0} max={9999} style={{ width: '100%' }} placeholder="请输入排序" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

DictionarySettings.routeConfig = { path: '/settings/dictionary', permission: 'settings' };
export default DictionarySettings;
