import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, Table, Tag, Button, Row, Col, Statistic,
  Modal, Form, Input, InputNumber, DatePicker, Popconfirm,
  Select, Radio, Space, Tooltip, message,
} from 'antd';
import {
  PlusOutlined, GiftOutlined, CalendarOutlined,
  DeleteOutlined, EditOutlined, SendOutlined, DownCircleOutlined,
  CarOutlined, UnorderedListOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatTime } from '@/utils/formatTime';
import { t } from '@/i18n';
import {
  getCouponListApi, getCouponDetailApi, addCouponApi, updateCouponApi,
  deleteCouponApi, publishCouponApi, offlineCouponApi, listReceiveRecordsApi,
} from '@/api/modules/coupon';
import { getVehiclesApi } from '@/api/modules/vehicle';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';

const { RangePicker } = DatePicker;

const couponTypeColorMap = { discount: 'blue', deduction: 'green', duration: 'orange' };
const couponStatusColorMap = { draft: 'default', published: 'green', offline: 'orange' };
const couponStatusTextMap = { draft: '草稿', published: '已投放', offline: '已下线' };
const memberCouponStatusTextMap = { unused: '未使用', locked: '已锁定', used: '已使用', expired: '已过期' };
const memberCouponStatusColorMap = { unused: 'blue', locked: 'orange', used: 'green', expired: 'default' };

// LocalDateTime 反序列化后通常为 "YYYY-MM-DD HH:mm:ss" 或 ISO，统一转 dayjs
const toDayjs = (v) => {
  if (!v) return null;
  const d = dayjs(typeof v === 'string' ? v.replace(' ', 'T') : v);
  return d.isValid() ? d : null;
};

// 车辆展示名：品牌/车系/车牌号
const carLabel = (c) => {
  if (!c) return '-';
  const parts = [c.brand, c.series, c.plateNumber].filter(Boolean);
  return parts.length ? parts.join(' / ') : (c.name || `#${c.id}`);
};

// 券类型对应单位
const typeUnit = (type) => {
  if (type === 'discount') return '折';
  if (type === 'duration') return '天';
  return '元';
};

const Marketing = () => {
  // ---------- 优惠券状态 ----------
  const [couponData, setCouponData] = useState([]);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [couponEditing, setCouponEditing] = useState(null);
  const [couponForm] = Form.useForm();
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponPagination, setCouponPagination] = useState({ page: 1, pageSize: 10 });
  const [couponTotal, setCouponTotal] = useState(0);
  const [couponFilters, setCouponFilters] = useState({ name: '', type: '', status: '', published: undefined });

  // 关联车辆可选列表
  const [vehicleOptions, setVehicleOptions] = useState([]);

  // 领取记录
  const [receiveModalVisible, setReceiveModalVisible] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveRecords, setReceiveRecords] = useState([]);
  const [receiveCouponName, setReceiveCouponName] = useState('');

  // ---------- 字典 ----------
  const { map: couponTypeMap } = useDict('coupon_type');

  // 分页 ref：始终保存最新分页参数，避免 useCallback 闭包捕获过期值导致删除/投放后用旧 pageSize 查询
  const paginationRef = useRef(couponPagination);
  paginationRef.current = couponPagination;

  // ---------- 数据获取 ----------
  // fetchCouponData 从 ref 读取最新分页参数，函数引用稳定，避免闭包陷阱
  const fetchCouponData = useCallback(async () => {
    setCouponLoading(true);
    try {
      const { page, pageSize } = paginationRef.current;
      const res = await getCouponListApi({
        page,
        pageSize,
        name: couponFilters.name || undefined,
        type: couponFilters.type || undefined,
        status: couponFilters.status || undefined,
        published: couponFilters.published,
      });
      setCouponData(res?.list || []);
      setCouponTotal(res?.total || 0);
    } catch (err) {
      console.error('获取优惠券列表失败:', err);
    } finally {
      setCouponLoading(false);
    }
  }, [couponFilters]);

  const fetchVehicleOptions = useCallback(async () => {
    try {
      // 调车辆接口拉取较大分页用于关联车辆选择，不依赖任何字典
      const res = await getVehiclesApi({ page: 1, pageSize: 200 });
      const list = res?.list || res?.records || [];
      setVehicleOptions(list.map((c) => ({
        label: carLabel(c),
        value: c.id,
        raw: c,
      })));
    } catch (err) {
      console.error('获取车辆列表失败:', err);
      setVehicleOptions([]);
    }
  }, []);

  // 分页变化时重新查询（page/pageSize 任一变化即触发）
  useEffect(() => { fetchCouponData(); }, [fetchCouponData, couponPagination.page, couponPagination.pageSize]);
  useEffect(() => { fetchVehicleOptions(); }, [fetchVehicleOptions]);

  // 当前编辑的券类型/适用范围/已选车辆（用 useWatch 响应式监听，避免 render 阶段直接 getFieldValue）
  const currentType = Form.useWatch('type', couponForm);
  const currentScope = Form.useWatch('applyScope', couponForm);
  const watchedCarIds = Form.useWatch('carIds', couponForm);
  const selectedCarCount = Array.isArray(watchedCarIds) ? watchedCarIds.length : 0;

  // ---------- 优惠券表格列 ----------
  const couponColumns = useMemo(() => ([
    {
      title: '券名称 / 券码', key: 'name', width: 200, ellipsis: true,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary, #999)' }}>{r.code || '-'}</div>
        </div>
      ),
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 90,
      render: (v, record) => (
        <Tag color={couponTypeColorMap[v] || 'default'}>
          {couponTypeMap[v]?.label || record.typeName || v}
        </Tag>
      ),
    },
    {
      title: '面值 / 门槛', key: 'value', width: 130,
      render: (_, r) => {
        let valueText = '-';
        if (r.value != null) {
          if (r.type === 'deduction') valueText = `¥${r.value}`;
          else if (r.type === 'duration') valueText = `+${r.value}天`;
          else valueText = `${(r.value * 100).toFixed(0)}折`;
        }
        const capText = r.type === 'discount' && r.discountCap != null ? `（封顶¥${r.discountCap}）` : '';
        return (
          <div>
            <div>{valueText}{capText}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary, #999)' }}>
              {r.minAmount > 0 ? `满¥${r.minAmount}可用` : '无门槛'}
            </div>
          </div>
        );
      },
    },
    {
      title: '库存 / 领取 / 核销', key: 'count', width: 130,
      render: (_, r) => {
        // 总库存：-1 表示无限库存
        const total = r.totalCount === -1 ? '∞' : (r.totalCount ?? 0);
        const received = r.receivedCount ?? 0;
        const used = r.usedCount ?? 0;
        // 库存剩余量 = 总库存 - 已领取数量（无限库存时显示 ∞）
        const remaining = r.totalCount === -1 ? '∞' : Math.max(0, (r.totalCount ?? 0) - received);
        return (
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <div>库存：<span style={{ color: 'var(--text-secondary, #666)' }}>{remaining}/{total}</span></div>
            <div>核销：<span style={{ color: 'var(--text-secondary, #666)' }}>{used}/{received || 0}</span></div>
          </div>
        );
      },
    },
    {
      title: '有效期', key: 'valid', width: 180,
      render: (_, r) => (
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          <div>{formatTime(r.validStartTime, 'YYYY-MM-DD HH:mm')}</div>
          <div style={{ color: 'var(--text-tertiary, #999)' }}>至 {formatTime(r.validEndTime, 'YYYY-MM-DD HH:mm')}</div>
        </div>
      ),
    },
    {
      title: '适用范围', key: 'scope', width: 140, ellipsis: true,
      render: (_, r) => {
        if (r.applyScope === 'specified') {
          const names = r.carNames && r.carNames.length ? r.carNames : [];
          // 车辆较多时只展示前 2 个，其余用 +N辆 省略，Tooltip 仍显示完整列表
          const maxShow = 2;
          const shown = names.slice(0, maxShow);
          const restCount = names.length - shown.length;
          const text = shown.length
            ? (restCount > 0 ? `${shown.join('、')} 等${names.length}辆` : shown.join('、'))
            : '未关联';
          return (
            <Tooltip title={names.length > maxShow ? names.join('、') : ''}>
              <Tag color="purple">指定车辆</Tag>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary, #999)', marginTop: 2 }}>
                {text}
              </div>
            </Tooltip>
          );
        }
        return <Tag color="blue">全场通用</Tag>;
      },
    },
    {
      title: '状态', key: 'status', width: 100,
      render: (_, r) => {
        const color = couponStatusColorMap[r.status] || 'default';
        const text = couponStatusTextMap[r.status] || r.status;
        // 只显示一个主状态标签，避免「已投放」与「已确认投放」重复
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 220, fixed: 'right',
      render: (_, record) => {
        const isPublished = record.status === 'published';
        const isDraftOrOffline = record.status === 'draft' || record.status === 'offline';
        return (
          <Space size={0} wrap>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenCouponModal(record)}>编辑</Button>
            {isDraftOrOffline && (
              <Popconfirm
                title="确认投放该优惠券？"
                description="投放后C端用户将可见并可领取，请二次确认。"
                icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                okText="确认投放"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={() => handlePublish(record.id)}
              >
                <Button type="link" size="small" icon={<SendOutlined />} style={{ color: '#52c41a' }}>投放</Button>
              </Popconfirm>
            )}
            {isPublished && (
              <Popconfirm
                title="确认下线该优惠券？"
                description="下线后C端不可再领取，已领取的券不受影响。"
                okText="确认下线"
                cancelText="取消"
                onConfirm={() => handleOffline(record.id)}
              >
                <Button type="link" size="small" icon={<DownCircleOutlined />} danger>下线</Button>
              </Popconfirm>
            )}
            <Button type="link" size="small" icon={<UnorderedListOutlined />} onClick={() => handleOpenReceiveModal(record)}>领取</Button>
            <Popconfirm
              title="确定删除该优惠券？"
              description={isPublished ? '已投放的优惠券不可删除，请先下线' : '删除后不可恢复'}
              okText="删除"
              okButtonProps={{ danger: true, disabled: isPublished }}
              cancelText="取消"
              disabled={isPublished}
              onConfirm={() => handleDeleteCoupon(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={isPublished}>删除</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ]), [couponTypeMap]);

  // ---------- 优惠券 CRUD ----------
  const handleOpenCouponModal = async (record) => {
    if (record) {
      // 编辑：拉取详情（含关联车辆ID）
      let detail = record;
      try {
        detail = await getCouponDetailApi(record.id);
      } catch (err) {
        console.error('获取优惠券详情失败:', err);
      }
      setCouponEditing(detail);
      const start = toDayjs(detail.validStartTime);
      const end = toDayjs(detail.validEndTime);
      // 后端返回的 carIds 可能是 Long[] 或 String[]，统一转 Number
      const carIdList = Array.isArray(detail.carIds)
        ? detail.carIds.map((v) => (typeof v === 'number' ? v : Number(v))).filter((v) => !Number.isNaN(v))
        : [];
      couponForm.setFieldsValue({
        name: detail.name,
        type: detail.type,
        value: detail.value != null ? Number(detail.value) : undefined,
        minAmount: detail.minAmount != null ? Number(detail.minAmount) : undefined,
        discountCap: detail.discountCap != null ? Number(detail.discountCap) : undefined,
        totalCount: detail.totalCount,
        perUserLimit: detail.perUserLimit,
        applyScope: detail.applyScope || 'all',
        carIds: carIdList,
        validTimeRange: start && end ? [start, end] : undefined,
        remark: detail.remark,
      });
    } else {
      setCouponEditing(null);
      couponForm.resetFields();
      couponForm.setFieldsValue({
        type: 'deduction',
        applyScope: 'all',
        totalCount: 100,
        perUserLimit: 1,
        minAmount: 0,
        validTimeRange: [dayjs().startOf('day'), dayjs().add(30, 'day').endOf('day')],
      });
    }
    setCouponModalVisible(true);
  };

  const handleSaveCoupon = async () => {
    try {
      const values = await couponForm.validateFields();
      setCouponSaving(true);
      const [validStartTime, validEndTime] = values.validTimeRange;
      // 关联车辆ID统一转为数字数组
      const rawCarIds = Array.isArray(values.carIds) ? values.carIds : [];
      const carIds = values.applyScope === 'specified'
        ? rawCarIds.map((v) => (typeof v === 'number' ? v : Number(v))).filter((v) => !Number.isNaN(v))
        : [];
      if (values.applyScope === 'specified' && carIds.length === 0) {
        message.warning('指定车辆券必须关联至少一辆车');
        setCouponSaving(false);
        return;
      }
      const payload = {
        name: values.name,
        type: values.type,
        typeName: couponTypeMap[values.type]?.label || values.type,
        value: values.value,
        minAmount: values.minAmount ?? 0,
        discountCap: values.type === 'discount' ? values.discountCap : null,
        totalCount: values.totalCount,
        perUserLimit: values.perUserLimit,
        applyScope: values.applyScope,
        carIds,
        validStartTime: validStartTime.format('YYYY-MM-DD HH:mm:ss'),
        validEndTime: validEndTime.format('YYYY-MM-DD HH:mm:ss'),
        remark: values.remark,
      };
      if (couponEditing) {
        payload.id = couponEditing.id;
        payload.version = couponEditing.version;
        await updateCouponApi(payload);
      } else {
        await addCouponApi(payload);
      }
      setCouponModalVisible(false);
      couponForm.resetFields();
      fetchCouponData();
    } catch (err) {
      console.error('保存优惠券失败:', err);
    } finally {
      setCouponSaving(false);
    }
  };

  const handleDeleteCoupon = async (id) => {
    try {
      await deleteCouponApi(id);
      fetchCouponData();
    } catch (err) {
      console.error('删除优惠券失败:', err);
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishCouponApi(id);
      fetchCouponData();
    } catch (err) {
      console.error('投放优惠券失败:', err);
    }
  };

  const handleOffline = async (id) => {
    try {
      await offlineCouponApi(id);
      fetchCouponData();
    } catch (err) {
      console.error('下线优惠券失败:', err);
    }
  };

  // ---------- 领取记录 ----------
  const handleOpenReceiveModal = async (record) => {
    setReceiveCouponName(record.name);
    setReceiveModalVisible(true);
    setReceiveLoading(true);
    try {
      const res = await listReceiveRecordsApi(record.id);
      setReceiveRecords(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('获取领取记录失败:', err);
      setReceiveRecords([]);
    } finally {
      setReceiveLoading(false);
    }
  };

  // ---------- 统计 ----------
  const publishedCoupons = couponData.filter((c) => c.status === 'published').length;
  const totalReceived = couponData.reduce((s, c) => s + (c.receivedCount ?? 0), 0);
  const totalUsed = couponData.reduce((s, c) => s + (c.usedCount ?? 0), 0);
  const verifyRate = totalReceived > 0 ? Math.round((totalUsed / totalReceived) * 100) : 0;

  // 已投放的券不可编辑关键字段
  const isPublishedCoupon = couponEditing?.status === 'published';

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.marketing')}</h2>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card variant="borderless">
            <Statistic title="投放中优惠券" value={publishedCoupons} prefix={<GiftOutlined />} valueStyle={{ color: 'var(--amount-color, #c9a96e)' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card variant="borderless">
            <Statistic title="累计领取" value={totalReceived} valueStyle={{ color: '#1a365d' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card variant="borderless">
            <Statistic title="累计核销" value={totalUsed} valueStyle={{ color: '#10b981' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card variant="borderless">
            <Statistic title="核销率" value={verifyRate} suffix="%" prefix={<CalendarOutlined />} valueStyle={{ color: '#6366f1' }} />
          </Card>
        </Col>
      </Row>

      {/* 优惠券管理 */}
      <Card
        title="优惠券管理"
        variant="borderless"
        style={{ marginBottom: 16 }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCouponModal(null)}>
            新增优惠券
          </Button>
        }
      >
        {/* 筛选 */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={6}>
            <Input
              allowClear
              placeholder="券名称搜索"
              value={couponFilters.name}
              onChange={(e) => setCouponFilters((f) => ({ ...f, name: e.target.value }))}
              onPressEnter={() => setCouponPagination((p) => ({ ...p, page: 1 }))}
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <DictSelect
              dictType="coupon_type"
              placeholder="券类型"
              allowClear
              style={{ width: '100%' }}
              value={couponFilters.type || undefined}
              onChange={(v) => setCouponFilters((f) => ({ ...f, type: v || '' }))}
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Select
              allowClear
              placeholder="投放状态"
              style={{ width: '100%' }}
              value={couponFilters.status || undefined}
              onChange={(v) => setCouponFilters((f) => ({ ...f, status: v || '' }))}
              options={[
                { label: '草稿', value: 'draft' },
                { label: '已投放', value: 'published' },
                { label: '已下线', value: 'offline' },
              ]}
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Select
              allowClear
              placeholder="确认投放标志"
              style={{ width: '100%' }}
              value={couponFilters.published}
              onChange={(v) => setCouponFilters((f) => ({ ...f, published: v }))}
              options={[
                { label: '已确认投放', value: 1 },
                { label: '未确认投放', value: 0 },
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={3}>
            <Button type="primary" onClick={() => setCouponPagination((p) => ({ ...p, page: 1 }))}>查询</Button>
          </Col>
        </Row>

        <Table
          columns={couponColumns}
          dataSource={couponData}
          rowKey="id"
          loading={couponLoading}
          scroll={{ x: 1300 }}
          onChange={(p) => setCouponPagination({ page: p.current, pageSize: p.pageSize })}
          pagination={{
            current: couponPagination.page,
            pageSize: couponPagination.pageSize,
            total: couponTotal,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }} />
      </Card>

      {/* ========== 优惠券 Modal ========== */}
      <Modal
        title={couponEditing ? '编辑优惠券' : '新增优惠券'}
        open={couponModalVisible}
        onOk={handleSaveCoupon}
        confirmLoading={couponSaving}
        onCancel={() => { setCouponModalVisible(false); couponForm.resetFields(); }}
        okText="保存（草稿）"
        cancelText="取消"
        width={680}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={couponForm} layout="vertical" style={{ marginTop: 16 }}>
          {isPublishedCoupon && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--bg-warn, #fffbe6)', border: '1px solid #ffe58f', borderRadius: 6 }}>
              <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 6 }} />
              该优惠券已投放，关键字段不可修改，请先下线后再编辑
            </div>
          )}

          <Form.Item name="name" label="券名称" rules={[{ required: true, message: '请输入券名称' }]}>
            <Input placeholder="如：新人专享券" maxLength={20} disabled={isPublishedCoupon} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="券类型" rules={[{ required: true, message: '请选择券类型' }]}>
                <DictSelect dictType="coupon_type" placeholder="选择券类型" disabled={isPublishedCoupon} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="value"
                label="面值 / 折扣"
                rules={[{ required: true, message: '请输入面值' }]}
                extra={currentType === 'discount' ? '折扣填 0.88 表示88折' : currentType === 'duration' ? '时长券填天数' : '满减券填金额'}
              >
                <InputNumber
                  min={0}
                  max={currentType === 'discount' ? 1 : 1000000}
                  step={currentType === 'discount' ? 0.01 : 1}
                  style={{ width: '100%' }}
                  placeholder="折扣0.88 / 满减500 / 时长7"
                  addonAfter={typeUnit(currentType)}
                  disabled={isPublishedCoupon}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="minAmount" label="最低消费（元）" rules={[{ required: true, message: '请输入最低消费' }]}>
                <InputNumber min={0} max={1000000} style={{ width: '100%' }} placeholder="0 表示无门槛" disabled={isPublishedCoupon} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="discountCap"
                label="折扣封顶（元）"
                extra={currentType === 'discount' ? '折扣券最大优惠金额，留空不封顶' : '仅折扣券适用'}
              >
                <InputNumber
                  min={0}
                  max={1000000}
                  style={{ width: '100%' }}
                  placeholder="留空不封顶"
                  disabled={isPublishedCoupon || currentType !== 'discount'}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="perUserLimit" label="每人限领" rules={[{ required: true, message: '请输入每人限领' }]}>
                <InputNumber min={1} max={100} style={{ width: '100%' }} placeholder="如：1" disabled={isPublishedCoupon} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="totalCount"
                label="发行总量"
                rules={[{ required: true, message: '请输入发行总量' }]}
                extra="填 -1 表示无限"
              >
                <InputNumber min={-1} max={1000000} style={{ width: '100%' }} placeholder="如：100 / -1 无限" disabled={isPublishedCoupon} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="applyScope" label="适用范围" rules={[{ required: true, message: '请选择适用范围' }]}>
                <Radio.Group disabled={isPublishedCoupon}>
                  <Radio.Button value="all">全场通用</Radio.Button>
                  <Radio.Button value="specified">指定车辆</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          {currentScope === 'specified' && (
            <Form.Item
              name="carIds"
              label={<span><CarOutlined /> 关联车辆（一对多，下单时一辆车只能用一张券）</span>}
              rules={[{ required: true, message: '请选择关联车辆' }]}
              extra={`已选 ${selectedCarCount} 辆车`}
            >
              <Select
                mode="multiple"
                showSearch
                allowClear
                optionFilterProp="label"
                optionLabelProp="label"
                placeholder="选择关联车辆（可多选，支持搜索品牌/车系/车牌）"
                options={vehicleOptions}
                style={{ width: '100%' }}
                disabled={isPublishedCoupon}
                maxTagCount="responsive"
                notFoundContent={vehicleOptions.length === 0 ? '暂无车辆数据' : '未匹配到车辆'}
              />
            </Form.Item>
          )}

          <Form.Item
            name="validTimeRange"
            label="有效期"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
              disabled={isPublishedCoupon}
              placeholder={['生效时间', '失效时间']}
            />
          </Form.Item>

          <Form.Item name="remark" label="备注说明">
            <Input.TextArea rows={2} maxLength={200} placeholder="活动说明、发放渠道、内部备注等" showCount />
          </Form.Item>

          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-secondary, #f5f5f5)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary, #666)' }}>
            新增/修改后默认为 <b>草稿</b> 态，需在列表点击 <b>投放</b> 并二次确认后C端才可见可领
          </div>
        </Form>
      </Modal>

      {/* ========== 领取记录 Modal ========== */}
      <Modal
        title={`领取记录 - ${receiveCouponName}`}
        open={receiveModalVisible}
        onCancel={() => setReceiveModalVisible(false)}
        footer={<Button onClick={() => setReceiveModalVisible(false)}>关闭</Button>}
        width={760}
        destroyOnClose
      >
        <Table
          size="small"
          loading={receiveLoading}
          dataSource={receiveRecords}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 600 }}
          columns={[
            { title: '会员ID', dataIndex: 'memberId', key: 'memberId', width: 90 },
            {
              title: '券码', dataIndex: 'code', key: 'code', width: 150, ellipsis: true,
              render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '-'}</span>,
            },
            {
              title: '状态', dataIndex: 'status', key: 'status', width: 90,
              render: (v) => <Tag color={memberCouponStatusColorMap[v] || 'default'}>{memberCouponStatusTextMap[v] || v}</Tag>,
            },
            {
              title: '领取时间', dataIndex: 'claimTime', key: 'claimTime', width: 150,
              render: (v) => formatTime(v, 'YYYY-MM-DD HH:mm'),
            },
            {
              title: '核销时间', dataIndex: 'useTime', key: 'useTime', width: 150,
              render: (v) => v ? formatTime(v, 'YYYY-MM-DD HH:mm') : '-',
            },
            {
              title: '订单ID', dataIndex: 'orderId', key: 'orderId', width: 90,
              render: (v) => v || '-',
            },
            {
              title: '来源', dataIndex: 'source', key: 'source', width: 90,
              render: (v) => v || '-',
            },
          ]}
        />
      </Modal>
    </div>
  );
};

Marketing.routeConfig = { path: '/marketing', permission: 'marketing' };
export default Marketing;
