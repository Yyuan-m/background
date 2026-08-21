import { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Space, Tag, Input, Select, Modal, Form, InputNumber, Popconfirm, Row, Col, Card, Tabs, Descriptions, Image, Divider } from 'antd';
import { message } from '@/utils/antdStatic';
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SettingOutlined, PictureOutlined } from '@ant-design/icons';
import { getVehiclesApi, getVehicleDetailApi, addVehicleApi, updateVehicleApi, deleteVehicleApi, toggleVehicleStatusApi } from '@/api/modules/vehicle';
import DictSelect from '@/components/DictSelect';
import FileUploader from '@/components/FileUploader';
import { useDict } from '@/hooks/useDict';
import useAuthStore from '@/store/useAuthStore';
import { t } from '@/i18n';
import { imageUrl } from '@/utils/imageUrl';
import MaintenanceList from './MaintenanceList';
import DocumentList from './DocumentList';
import GpsTrack from './GpsTrack';
import ViolationList from './ViolationList';
import ImageGallery from './ImageGallery';

const VEHICLE_TYPE_DICT = 'vehicle_type';
const VEHICLE_STATUS_DICT = 'vehicle_status';
const VEHICLE_TAG_DICT = 'vehicle_tag';

// 车况等级（车辆固有属性，非业务字典）
const conditionLevelOptions = ['S', 'A+', 'A', 'B', 'C'];
const conditionLevelColors = { S: 'purple', 'A+': 'green', A: 'blue', B: 'orange', C: 'red' };

// 燃料类型选项（车辆固有属性，非业务字典）
const fuelOptions = ['汽油', '柴油', '纯电', '油电混合', '增程式电动', '插电式混合'];

// 安全配置 / 娱乐配置与字符串互转（后端以 " / " 分隔存储，前端用 TextArea 每行一项便于编辑）
const configListToText = (s) => (s ? String(s).split(/\s*\/\s*/).filter(Boolean).join('\n') : '');
const configTextToList = (text) => (text ? String(text).split('\n').map((s) => s.trim()).filter(Boolean).join(' / ') : null);

// 车辆状态颜色映射
const statusColorMap = {
  idle: 'green',
  rented: 'blue',
  maintenance: 'orange',
  reserved: 'gold',
  offline: 'default',
  returning: 'cyan',
  returned: 'geekblue',
  inspection: 'purple',
  decommissioned: 'red',
};

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try { return JSON.parse(tags); } catch { return [tags]; }
  }
  return [];
};

// 素材分类展示顺序（与字典 sort_order 一致）
const MATERIAL_CATEGORY_ORDER = ['外观', '内饰', '细节', '轮毂', '发动机舱', '后备箱', '配置功能', '宣传图', '其他'];

// 将素材列表按分类分组并按既定顺序排列
const groupMaterialsByCategory = (materials) => {
  if (!Array.isArray(materials) || materials.length === 0) return [];
  const map = new Map();
  materials.forEach((m) => {
    const cat = m.category || '其他';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(m);
  });
  return [...map.entries()].sort((a, b) => {
    const ia = MATERIAL_CATEGORY_ORDER.indexOf(a[0]);
    const ib = MATERIAL_CATEGORY_ORDER.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
};

const VehicleList = () => {
  const { hasButtonPermission } = useAuthStore();
  const { map: statusMap } = useDict(VEHICLE_STATUS_DICT);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState('list');

  // 弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增车辆');
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailVehicle, setDetailVehicle] = useState(null);

  // 车辆图片（一辆车一张照片）
  const [vehicleImage, setVehicleImage] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVehiclesApi({ page, pageSize, keyword, type: filterType, status: filterStatus });
      setData(res?.list || []); setTotal(res?.total || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [page, pageSize, keyword, filterType, filterStatus]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleSearch = () => { setPage(1); void fetchData(); };
  const handleReset = () => { setKeyword(''); setFilterType(''); setFilterStatus(''); setPage(1); };
  const handlePageChange = (p, ps) => { setPage(p); setPageSize(ps); };

  const handleAdd = () => {
    setEditingId(null);
    setModalTitle('新增车辆');
    form.resetFields();
    setVehicleImage('');
    // 新增时给配置字段默认值，避免提交时缺失字段
    form.setFieldsValue({
      conditionLevel: 'A',
      status: 'idle',
      carConfig: { fuel: '汽油', rangeKm: '-' },
    });
    setModalVisible(true);
  };
  const handleEdit = async (record) => {
    setEditingId(record.id);
    setModalTitle('编辑车辆');
    setVehicleImage(record.images || '');
    setModalVisible(true);
    // 列表行数据不含 carConfig，需调用详情接口获取完整数据
    try {
      const detail = await getVehicleDetailApi(record.id);
      const cfg = detail?.carConfig || {};
      form.setFieldsValue({
        ...detail,
        tags: parseTags(detail.tags),
        carConfig: {
          ...cfg,
          // TextArea 回显：把 "A / B / C" 转成多行文本，便于编辑
          safety: configListToText(cfg.safety),
          entertainment: configListToText(cfg.entertainment),
        },
      });
    } catch (e) {
      // 详情接口失败时回退到列表行数据
      console.error(e);
      form.setFieldsValue({ ...record, tags: parseTags(record.tags) });
    }
  };
  const handleViewDetail = async (record) => {
    // 列表行不含 carConfig，先调详情接口获取完整数据
    setDetailVehicle(record);
    setDetailVisible(true);
    try {
      const detail = await getVehicleDetailApi(record.id);
      if (detail) setDetailVehicle(detail);
    } catch (e) {
      console.error('获取车辆详情失败:', e);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      values.images = vehicleImage || null;
      // DictSelect 的 valueAsJson 仅在用户交互（onChange）时把数组序列化为 JSON 字符串，
      // 若用户未修改 tags，validateFields 返回的是数组，需手动序列化以匹配后端 String 类型
      if (Array.isArray(values.tags)) {
        values.tags = JSON.stringify(values.tags);
      }
      // 车辆配置：TextArea 多行文本转回 " / " 分隔字符串，与后端存储格式一致
      if (values.carConfig) {
        values.carConfig.safety = configTextToList(values.carConfig.safety);
        values.carConfig.entertainment = configTextToList(values.carConfig.entertainment);
      }
      setSubmitLoading(true);
      if (editingId) { await updateVehicleApi(editingId, values); message.success('编辑成功'); } else { await addVehicleApi(values); message.success('新增成功'); }
      setModalVisible(false); void fetchData();
    } catch (e) { if (e.errorFields) return; message.error(e.message || '操作失败'); } finally { setSubmitLoading(false); }
  };

  const handleDelete = async (id) => { await deleteVehicleApi(id); message.success('删除成功'); void fetchData(); };
  const handleToggleStatus = async (record) => {
    // 上架/下架：空闲(idle) ↔ 已下架(offline)
    const newStatus = record.status === 'offline' ? 'idle' : 'offline';
    await toggleVehicleStatusApi(record.id, newStatus); message.success('操作成功'); void fetchData();
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 50 },
    { title: '车辆图片', dataIndex: 'images', key: 'images', width: 90,
      render: (url) => url ? <Image src={imageUrl(url)} width={70} height={50} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <span style={{ color: 'var(--text-secondary, #999)' }}>-</span>,
    },
    { title: '素材', dataIndex: 'materialCount', key: 'materialCount', width: 80,
      render: (count, record) => {
        const n = Number(count) || 0;
        return (
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => handleViewDetail(record)}>
            {n > 0 ? <Tag color="blue" style={{ cursor: 'pointer' }}>{n} 张</Tag> : <span style={{ color: 'var(--text-tertiary, #bbb)' }}>0</span>}
          </Button>
        );
      },
    },
    { title: '车辆名称', dataIndex: 'name', key: 'name', width: 170, ellipsis: true },
    { title: '品牌', dataIndex: 'brand', key: 'brand', width: 90 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (v) => v ? <Tag color="gold">{v}</Tag> : '-' },
    { title: '车牌号', dataIndex: 'plateNumber', key: 'plateNumber', width: 120 },
    { title: '日租(¥)', dataIndex: 'dailyPrice', key: 'dailyPrice', width: 100, render: (v) => <span style={{ color: 'var(--amount-color, #c9a96e)', fontWeight: 500 }}>¥{v?.toLocaleString()}</span> },
    { title: '日成本(¥)', dataIndex: 'dailyCost', key: 'dailyCost', width: 100, render: (v) => v != null ? <span style={{ color: 'var(--text-secondary, #64748b)' }}>¥{Number(v).toLocaleString()}</span> : '-' },
    { title: '最大租期(天)', dataIndex: 'maxRentDays', key: 'maxRentDays', width: 100,
      render: (v) => v != null && v > 0 ? <Tag color="cyan">{v} 天</Tag> : <span style={{ color: 'var(--text-tertiary, #bbb)' }}>不限制</span>,
    },
    { title: '车况', dataIndex: 'conditionLevel', key: 'conditionLevel', width: 70, render: (v) => <Tag color={conditionLevelColors[v] || 'default'}>{v}</Tag> },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (s) => {
        const cfg = statusMap[s];
        const text = cfg?.label || s || '-';
        const color = statusColorMap[s] || 'default';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    { title: '标签', dataIndex: 'tags', key: 'tags', width: 120, render: (tags) => parseTags(tags).map((t) => <Tag key={t} color="geekblue">{t}</Tag>) },
    {
      title: '操作', key: 'action', width: 260, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          {hasButtonPermission('vehicle', 'edit') && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>}
          {hasButtonPermission('vehicle', 'edit') && <Button type="link" size="small" onClick={() => handleToggleStatus(record)}>{record.status === 'offline' ? '上架' : '下架'}</Button>}
          {hasButtonPermission('vehicle', 'delete') && (
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ], [hasButtonPermission, statusMap, handleEdit, handleToggleStatus, handleDelete]);

  const tabItems = [
    { key: 'list', label: '车辆列表', children: (
      <>
        <Card className="" variant="borderless">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={5}><Input placeholder="搜索名称/品牌/车牌" prefix={<SearchOutlined />} value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} allowClear /></Col>
            <Col xs={24} sm={12} md={4}>
              <DictSelect
                dictType={VEHICLE_TYPE_DICT}
                placeholder="车辆类型"
                value={filterType || undefined}
                onChange={(v) => setFilterType(v || '')}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <DictSelect
                dictType={VEHICLE_STATUS_DICT}
                placeholder="车辆状态"
                value={filterStatus || undefined}
                onChange={(v) => setFilterStatus(v || '')}
                style={{ width: '100%' }}
              />
            </Col>
            <Col><Space><Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button><Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button></Space></Col>
          </Row>
        </Card>
        <Card className="" variant="borderless">
          {hasButtonPermission('vehicle', 'add') && <div style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增车辆</Button></div>}
          <div>
          <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1780 }}
            pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: handlePageChange,
          }} />
          </div>
        </Card>
      </>
    ) },
    { key: 'maintenance', label: '维保记录', children: <MaintenanceList /> },
    { key: 'documents', label: '证件管理', children: <DocumentList /> },
    { key: 'gps', label: 'GPS轨迹', children: <GpsTrack /> },
    { key: 'violations', label: '违章记录', children: <ViolationList /> },
    { key: 'images', label: '素材管理', children: <ImageGallery /> },
  ];

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.vehicles')}</h2>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} style={{ background: 'transparent' }} />

      {/* 新增/编辑弹窗 */}
      <Modal title={modalTitle} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} confirmLoading={submitLoading} width={'60%'} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="name" label="车辆名称" rules={[{ required: true }]}><Input placeholder="如：保时捷 911 Carrera" /></Form.Item></Col>
            <Col span={8}><Form.Item name="brand" label="品牌" rules={[{ required: true }]}><Input placeholder="如：保时捷" /></Form.Item></Col>
            <Col span={8}><Form.Item name="series" label="车系"><Input placeholder="如：911" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="type" label="车辆类型" rules={[{ required: true }]}>
                <DictSelect dictType={VEHICLE_TYPE_DICT} placeholder="请选择" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}><Form.Item name="plateNumber" label="车牌号" rules={[{ required: true }]}><Input placeholder="京A·88888" /></Form.Item></Col>
            <Col span={6}><Form.Item name="vin" label="车架号"><Input placeholder="VIN码" /></Form.Item></Col>
            <Col span={6}><Form.Item name="engineNo" label="发动机号"><Input placeholder="发动机号" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="dailyPrice" label="日租价格(元)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} onChange={(v) => {
                  // 日租价格变动时，若用户未手动改过成本价，则自动 = 日租 × 0.54
                  const cur = form.getFieldValue('dailyCost');
                  if (v != null && (cur == null || cur === '')) {
                    form.setFieldsValue({ dailyCost: Math.round(v * 0.54 * 100) / 100 });
                  }
                }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="dailyCost" label="日成本价(元)" tooltip="默认=日租×0.54，可手动修改">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="自动计算" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="minRentDays" label="起租天数" initialValue={1} rules={[{ required: true, message: '请输入起租天数' }]}>
                <InputNumber min={1} max={180} style={{ width: '100%' }} placeholder="1-180" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="maxRentDays" label="最大租期(天)" tooltip="留空表示不限制租车天数">
                <InputNumber min={1} max={36500} placeholder="不限制" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}><Form.Item name="displacement" label="排量"><Input placeholder="如：3.0T" /></Form.Item></Col>
            <Col span={6}><Form.Item name="color" label="颜色"><Input placeholder="如：胭脂红" /></Form.Item></Col>
            <Col span={6}>
              <Form.Item name="conditionLevel" label="车况等级" initialValue="A">
                <Select>
                  {conditionLevelOptions.map((l) => <Select.Option key={l} value={l}>{l}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}><Form.Item name="originalValue" label="原值(万)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}>
              <Form.Item name="status" label="状态" initialValue="idle">
                <DictSelect dictType={VEHICLE_STATUS_DICT} placeholder="请选择" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}><Form.Item name="seats" label="座位数"><InputNumber min={1} max={20} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="tags" label="车辆标签">
                <DictSelect dictType={VEHICLE_TAG_DICT} mode="multiple" valueAsJson placeholder="请选择标签" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="车辆介绍"><Input.TextArea rows={2} /></Form.Item>

          {/* 车辆配置区块：与车辆一对一关联，新增/编辑时一并保存 */}
          <Divider orientation="left" plain><SettingOutlined /> 车辆配置</Divider>
          <Row gutter={16}>
            <Col span={6}><Form.Item name={['carConfig', 'power']} label="动力"><Input placeholder="如：3.0T 涡轮增压" /></Form.Item></Col>
            <Col span={6}><Form.Item name={['carConfig', 'transmission']} label="变速箱"><Input placeholder="如：8挡手自一体" /></Form.Item></Col>
            <Col span={6}>
              <Form.Item name={['carConfig', 'fuel']} label="燃料类型">
                <Select placeholder="请选择" allowClear>
                  {fuelOptions.map((f) => <Select.Option key={f} value={f}>{f}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}><Form.Item name={['carConfig', 'rangeKm']} label="续航里程"><Input placeholder="燃油车填 -，电动填如 705km" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}><Form.Item name={['carConfig', 'interior']} label="内饰材质"><Input placeholder="如：Nappa 真皮 / Alcantara 翻毛皮" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['carConfig', 'safety']} label="安全配置" tooltip="每行一项，保存时以 ' / ' 分隔存储">
                <Input.TextArea rows={4} placeholder={'每行一项，如：\n8气囊\n自适应巡航\n车道保持\n主动刹车'} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['carConfig', 'entertainment']} label="娱乐配置" tooltip="每行一项，保存时以 ' / ' 分隔存储">
                <Input.TextArea rows={4} placeholder={'每行一项，如：\nBurmester 音响\n抬头显示\n后排娱乐'} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="车辆图片">
            {vehicleImage && (
              <div style={{ marginBottom: 8 }}>
                <Image src={imageUrl(vehicleImage)} width={120} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
              </div>
            )}
            <FileUploader
              bizType="vehicle_image"
              onlyImage
              maxCount={1}
              listType="picture-card"
              uploadText={vehicleImage ? '上传替换' : '上传'}
              hint="支持 jpg/jpeg/png/gif/webp，单文件最大 50MB，上传新图片将替换现有图片"
              onChange={(file) => setVehicleImage(file?.url || '')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal title="车辆详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={800}>
        {detailVehicle && (() => {
          // 安全/娱乐配置字符串切分为 Tag 列表
          const cfg = detailVehicle.carConfig || {};
          const safetyList = cfg.safety ? String(cfg.safety).split(/\s*\/\s*/).filter(Boolean) : [];
          const entList = cfg.entertainment ? String(cfg.entertainment).split(/\s*\/\s*/).filter(Boolean) : [];
          // 素材按分类分组
          const groupedMaterials = groupMaterialsByCategory(detailVehicle.materials);
          return (
            <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="车辆名称">{detailVehicle.name}</Descriptions.Item>
              <Descriptions.Item label="品牌">{detailVehicle.brand}</Descriptions.Item>
              <Descriptions.Item label="车牌号">{detailVehicle.plateNumber}</Descriptions.Item>
              <Descriptions.Item label="车架号">{detailVehicle.vin}</Descriptions.Item>
              <Descriptions.Item label="发动机号">{detailVehicle.engineNo}</Descriptions.Item>
              <Descriptions.Item label="车辆类型">{detailVehicle.type}</Descriptions.Item>
              <Descriptions.Item label="日租价格">¥{detailVehicle.dailyPrice?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="日成本价">¥{detailVehicle.dailyCost?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="起租天数">{detailVehicle.minRentDays ? `${detailVehicle.minRentDays} 天` : '-'}</Descriptions.Item>
              <Descriptions.Item label="最大租期">{detailVehicle.maxRentDays ? `${detailVehicle.maxRentDays} 天` : '不限制'}</Descriptions.Item>
              <Descriptions.Item label="半日租">¥{detailVehicle.halfDayPrice?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="夜租">¥{detailVehicle.nightPrice?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="周租折扣">{((detailVehicle.weeklyDiscount || 0) * 100).toFixed(0)}%</Descriptions.Item>
              <Descriptions.Item label="月租折扣">{((detailVehicle.monthlyDiscount || 0) * 100).toFixed(0)}%</Descriptions.Item>
              <Descriptions.Item label="节假日溢价">{((detailVehicle.holidaySurcharge || 0) * 100).toFixed(0)}%</Descriptions.Item>
              <Descriptions.Item label="原值">¥{detailVehicle.originalValue?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="里程">{detailVehicle.mileage?.toLocaleString()} km</Descriptions.Item>
              <Descriptions.Item label="车辆标签">{parseTags(detailVehicle.tags).map((t) => <Tag key={t}>{t}</Tag>)}</Descriptions.Item>
              <Descriptions.Item label="车辆图片">{detailVehicle.images ? <Image src={imageUrl(detailVehicle.images)} width={120} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '-'}</Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>{detailVehicle.description}</Descriptions.Item>

              {/* 车辆配置：动力 / 传动 / 燃料 / 续航 / 内饰 */}
              <Descriptions.Item label="动力总成">{cfg.power || '-'}</Descriptions.Item>
              <Descriptions.Item label="变速箱">{cfg.transmission || '-'}</Descriptions.Item>
              <Descriptions.Item label="燃料类型">{cfg.fuel || '-'}</Descriptions.Item>
              <Descriptions.Item label="续航里程">{cfg.rangeKm || '-'}</Descriptions.Item>
              <Descriptions.Item label="内饰材质" span={2}>{cfg.interior || '-'}</Descriptions.Item>
              {/* 安全配置：以 Tag 形式展示，每个配置项一个 Tag */}
              <Descriptions.Item label="安全配置" span={2}>
                {safetyList.length ? safetyList.map((s) => <Tag key={s} color="red" style={{ marginBottom: 4 }}>{s}</Tag>) : <span style={{ color: 'var(--text-tertiary, #999)' }}>-</span>}
              </Descriptions.Item>
              {/* 娱乐配置：以 Tag 形式展示，每个配置项一个 Tag */}
              <Descriptions.Item label="娱乐配置" span={2}>
                {entList.length ? entList.map((s) => <Tag key={s} color="blue" style={{ marginBottom: 4 }}>{s}</Tag>) : <span style={{ color: 'var(--text-tertiary, #999)' }}>-</span>}
              </Descriptions.Item>
            </Descriptions>

            {/* 车辆素材：只读展示，按分类分组，不可编辑 */}
            <Divider orientation="left" plain><PictureOutlined /> 车辆素材（只读）</Divider>
            {groupedMaterials.length > 0 ? (
              groupedMaterials.map(([category, imgs]) => (
                <div key={category} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag color="blue">{category}</Tag>
                    <span style={{ color: 'var(--text-secondary)' }}>{imgs.length} 张</span>
                  </div>
                  <Image.PreviewGroup>
                    <Space wrap>
                      {imgs.map((m) => (
                        <Image
                          key={m.id}
                          src={imageUrl(m.url)}
                          width={100}
                          height={75}
                          style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--text-tertiary, #999)' }}>暂无素材，请在「素材管理」Tab 中上传</span>
            )}
            </>
          );
        })()}
      </Modal>
    </div>
  );
};

VehicleList.routeConfig = { path: '/vehicles', permission: 'vehicle' };
export default VehicleList;
