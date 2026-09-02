import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card, Table, Tag, Button, Row, Col, Statistic,
  Modal, Form, Input, InputNumber, DatePicker, Popconfirm,
  Select, Radio, Space, Tooltip, Spin, Switch, message,
} from 'antd';
import {
  PlusOutlined, GiftOutlined, CalendarOutlined,
  DeleteOutlined, EditOutlined, SendOutlined, DownCircleOutlined,
  CarOutlined, UnorderedListOutlined, ExclamationCircleOutlined,
  ProfileOutlined, UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatTime } from '@/utils/formatTime';
import { t } from '@/i18n';
import {
  getCouponListApi, getCouponDetailApi, addCouponApi, updateCouponApi,
  deleteCouponApi, publishCouponApi, offlineCouponApi, listReceiveRecordsApi,
  listUsedOrdersApi,
} from '@/api/modules/coupon';
import { getVehiclesApi } from '@/api/modules/vehicle';
import { getCustomersApi } from '@/api/modules/customer';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useAuthStore from '@/store/useAuthStore';

const { RangePicker } = DatePicker;

const couponTypeColorMap = { discount: 'blue', deduction: 'green', duration: 'orange' };
// 券状态：草稿(运营未投放) / 待生效(已投放未到生效时间) / 已投放(正常可用) / 已领完(库存售罄) / 已过期(超过有效期) / 已下线(运营主动下线)
const couponStatusColorMap = {
  draft: 'default',
  pending: 'processing',
  published: 'success',
  sold_out: 'warning',
  expired: 'error',
  offline: 'orange',
};
const couponStatusTextMap = {
  draft: '草稿',
  pending: '待生效',
  published: '已投放',
  sold_out: '已领完',
  expired: '已过期',
  offline: '已下线',
};
// 券状态筛选项
const couponStatusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '待生效', value: 'pending' },
  { label: '已投放', value: 'published' },
  { label: '已领完', value: 'sold_out' },
  { label: '已过期', value: 'expired' },
  { label: '已下线', value: 'offline' },
];
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
  const { hasPermission } = useAuthStore();
  // ---------- 优惠券状态 ----------
  const [couponData, setCouponData] = useState([]);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [couponEditing, setCouponEditing] = useState(null);
  const [couponForm] = Form.useForm();
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponPagination, setCouponPagination] = useState({ page: 1, pageSize: 10 });
  const [couponTotal, setCouponTotal] = useState(0);
  const [couponFilters, setCouponFilters] = useState({ name: '', type: '', status: '', stackable: undefined });

  // 关联车辆可选列表
  const [vehicleOptions, setVehicleOptions] = useState([]);
  // 定向发放目标会员可选列表（C端会员，id 即 member.id）
  const [memberOptions, setMemberOptions] = useState([]);

  // 领取记录
  const [receiveModalVisible, setReceiveModalVisible] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveRecords, setReceiveRecords] = useState([]);
  const [receiveCouponName, setReceiveCouponName] = useState('');
  // 关联订单弹窗
  const [usedOrdersModalVisible, setUsedOrdersModalVisible] = useState(false);
  const [usedOrdersLoading, setUsedOrdersLoading] = useState(false);
  const [usedOrdersData, setUsedOrdersData] = useState({ orders: [], totalOrders: 0, completedOrders: 0, totalDiscount: 0 });
  const [usedOrdersCouponName, setUsedOrdersCouponName] = useState('');

  // ---------- 字典 ----------
  const { map: couponTypeMap } = useDict('coupon_type');
  const { map: memberLevelMap } = useDict('member_level');

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
        stackable: couponFilters.stackable,
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

  // 拉取 C 端会员列表（按指定用户发放的选择器用，id 即 member_coupon.member_id）
  const fetchMemberOptions = useCallback(async () => {
    try {
      const res = await getCustomersApi({ page: 1, pageSize: 500 });
      const list = res?.list || [];
      setMemberOptions(list.map((m) => ({
        label: `${m.name || m.nickname || m.username || ('会员' + m.id)}${m.phone ? `（${m.phone}）` : ''}`,
        value: m.id,
      })));
    } catch (err) {
      console.error('获取会员列表失败:', err);
      setMemberOptions([]);
    }
  }, []);

  // 分页变化时重新查询（page/pageSize 任一变化即触发）
  useEffect(() => { fetchCouponData(); }, [fetchCouponData, couponPagination.page, couponPagination.pageSize]);
  useEffect(() => { fetchVehicleOptions(); }, [fetchVehicleOptions]);
  useEffect(() => { fetchMemberOptions(); }, [fetchMemberOptions]);

  // 当前编辑的券类型/适用范围/已选车辆（用 useWatch 响应式监听，避免 render 阶段直接 getFieldValue）
  const currentType = Form.useWatch('type', couponForm);
  const currentScope = Form.useWatch('applyScope', couponForm);
  const currentGrantType = Form.useWatch('grantType', couponForm);
  const watchedTargetLevel = Form.useWatch('targetLevel', couponForm);
  const watchedMemberIds = Form.useWatch('memberIds', couponForm);
  const selectedMemberCount = Array.isArray(watchedMemberIds) ? watchedMemberIds.length : 0;
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
      title: '发放方式', dataIndex: 'grantType', key: 'grantType', width: 110, align: 'center',
      render: (v, r) => {
        if (v === 'level') {
          const levelName = memberLevelMap[r.targetLevel]?.label || r.targetLevel || '会员等级';
          return <Tag color="purple">定向-{levelName}</Tag>;
        }
        if (v === 'user') return <Tag color="magenta">定向-指定用户</Tag>;
        return <Tag color="blue">全量投放</Tag>;
      },
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
        const received = r.receivedCount ?? 0;
        const used = r.usedCount ?? 0;
        // 定向-按指定用户：券直接发放到目标会员个人中心，无"库存/领取"概念，只展示已发放/已核销
        if (r.grantType === 'user') {
          return (
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <div>已发放：<span style={{ color: 'var(--text-secondary, #666)' }}>{received}</span> 张</div>
              <div>已核销：<span style={{ color: 'var(--text-secondary, #666)' }}>{used}/{received}</span></div>
            </div>
          );
        }
        // 全量投放 与 定向-按会员等级（会员券需会员手动领取）：统一按"库存 / 领取 / 核销"展示
        // 总库存（-1 无限），库存剩余 = 总量 - 已领
        const total = r.totalCount === -1 ? '∞' : (r.totalCount ?? 0);
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
      title: '可叠加', dataIndex: 'stackable', key: 'stackable', width: 80, align: 'center',
      render: (v) => v === 1
        ? <Tag color="success">可叠加</Tag>
        : <Tag>不可叠加</Tag>,
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
      title: '操作', key: 'action', width: 280, fixed: 'right',
      render: (_, record) => {
        // isPublishedLike: 处于运营投放态（含派生状态 published/pending/sold_out/expired），
        //   均对应数据库 status=published，需先下线才能编辑/删除
        const isPublishedLike = ['published', 'pending', 'sold_out', 'expired'].includes(record.status);
        const isDraftOrOffline = record.status === 'draft' || record.status === 'offline';
        // 按指定用户发放的券：保存时已直接发放进用户账户，不支持再投放（后端同步拦截）
        const isUserTargeted = record.grantType === 'user';
        return (
          <Space size={0} wrap>
            {hasPermission('marketing:coupon:update') && (
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenCouponModal(record)}>编辑</Button>
            )}
            {isDraftOrOffline && !isUserTargeted && hasPermission('marketing:coupon:update') && (
              <Popconfirm
                title="确认投放该优惠券？"
                description="投放后C端用户将可见可领（按会员等级券仅对应等级会员可领）。"
                icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                okText="确认投放"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={() => handlePublish(record.id)}
              >
                <Button type="link" size="small" icon={<SendOutlined />} style={{ color: '#52c41a' }}>投放</Button>
              </Popconfirm>
            )}
            {isPublishedLike && hasPermission('marketing:coupon:update') && (
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
            <Button type="link" size="small" icon={<ProfileOutlined />} onClick={() => handleOpenUsedOrdersModal(record)}>关联订单</Button>
            {hasPermission('marketing:coupon:delete') && (
              <Popconfirm
                title="确定删除该优惠券？"
                description={isPublishedLike ? '已投放的优惠券不可删除，请先下线' : '删除后不可恢复'}
                okText="删除"
                okButtonProps={{ danger: true, disabled: isPublishedLike }}
                cancelText="取消"
                disabled={isPublishedLike}
                onConfirm={() => handleDeleteCoupon(record.id)}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={isPublishedLike}>删除</Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ]), [couponTypeMap, memberLevelMap, hasPermission]);

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
        grantType: detail.grantType || 'all',
        targetLevel: detail.targetLevel,
        value: detail.value != null ? Number(detail.value) : undefined,
        minAmount: detail.minAmount != null ? Number(detail.minAmount) : undefined,
        discountCap: detail.discountCap != null ? Number(detail.discountCap) : undefined,
        totalCount: detail.totalCount,
        perUserLimit: detail.perUserLimit,
        applyScope: detail.applyScope || 'all',
        stackable: detail.stackable === 1,
        carIds: carIdList,
        validTimeRange: start && end ? [start, end] : undefined,
        remark: detail.remark,
      });
    } else {
      setCouponEditing(null);
      couponForm.resetFields();
      couponForm.setFieldsValue({
        type: 'deduction',
        grantType: 'all',
        applyScope: 'all',
        stackable: false,
        totalCount: 100,
        perUserLimit: 1,
        minAmount: 0,
        validTimeRange: [dayjs().startOf('day'), dayjs().add(30, 'day').endOf('day')],
      });
    }
    setCouponModalVisible(true);
  };

  const handleSaveCoupon = async () => {
    // 进入即置为提交中，让“保存并发放”按钮立即进入 loading，避免误以为没反应
    setCouponSaving(true);
    try {
      const values = await couponForm.validateFields();
      const [validStartTime, validEndTime] = values.validTimeRange;
      // 发放方式即派发对象类型：all 全量 / level 按等级 / user 按用户（三态已合一）
      const grantType = values.grantType;
      const memberIds = [];
      if (grantType === 'user') {
        const raw = Array.isArray(values.memberIds) ? values.memberIds : [];
        const list = raw.map((v) => (typeof v === 'number' ? v : Number(v))).filter((v) => !Number.isNaN(v));
        if (list.length === 0) {
          message.warning('按指定用户发放必须选择至少一名目标会员');
          return;
        }
        memberIds.push(...list);
        // 按用户发放：发行总量需覆盖所选人数（-1 无限）
        if (values.totalCount !== -1 && values.totalCount < list.length) {
          message.warning(`发行总量（${values.totalCount}）不能少于所选会员人数（${list.length}）`);
          return;
        }
      } else if (grantType === 'level' && !values.targetLevel) {
        message.warning('按会员等级发放必须先选择目标等级');
        return;
      }
      // 关联车辆ID统一转为数字数组
      const rawCarIds = Array.isArray(values.carIds) ? values.carIds : [];
      const carIds = values.applyScope === 'specified'
        ? rawCarIds.map((v) => (typeof v === 'number' ? v : Number(v))).filter((v) => !Number.isNaN(v))
        : [];
      if (values.applyScope === 'specified' && carIds.length === 0) {
        message.warning('指定车辆券必须关联至少一辆车');
        return;
      }
      const payload = {
        name: values.name,
        type: values.type,
        typeName: couponTypeMap[values.type]?.label || values.type,
        // grantType：all / level / user（用户与前端二级选择对齐）
        grantType,
        targetLevel: grantType === 'level' ? values.targetLevel : null,
        memberIds,
        value: values.value,
        minAmount: values.minAmount ?? 0,
        discountCap: values.type === 'discount' ? values.discountCap : null,
        totalCount: values.totalCount,
        perUserLimit: values.perUserLimit,
        applyScope: values.applyScope,
        stackable: values.stackable ? 1 : 0,
        carIds,
        validStartTime: validStartTime.format('YYYY-MM-DD HH:mm:ss'),
        validEndTime: validEndTime.format('YYYY-MM-DD HH:mm:ss'),
        remark: values.remark,
      };
      if (couponEditing) {
        payload.id = couponEditing.id;
        payload.version = couponEditing.version;
        await updateCouponApi(payload);
        message.success('优惠券修改成功');
      } else {
        await addCouponApi(payload);
        // 成功提示区分发放方式：全量=草稿态待投放；按等级=草稿态待投放、会员可领；按用户=直接发放
        if (grantType === 'user') {
          message.success(`优惠券已保存，并直接发放给 ${memberIds.length} 名会员`);
        } else if (grantType === 'level') {
          message.success('优惠券已保存（草稿态），请在列表点击「投放」后该等级会员可在C端领取');
        } else {
          message.success('优惠券已保存（草稿态），请在列表点击「投放」并二次确认后C端才可见可领');
        }
      }
      setCouponModalVisible(false);
      couponForm.resetFields();
      fetchCouponData();
    } catch (err) {
      // 必须把失败暴露给用户，否则会表现为“点保存并发放没反应、也没报错、像卡住”
      console.error('保存优惠券失败:', err);
      // 表单校验失败：request 层不会自动提示，需在此把具体原因弹给用户
      const validationMsg = err?.errorFields?.[0]?.errors?.[0];
      if (validationMsg) {
        message.error(validationMsg);
      }
      // 网络/后端错误：request.js 响应拦截器已统一弹出错误提示，此处不重复提示
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

  // ---------- 关联订单 ----------
  const handleOpenUsedOrdersModal = async (record) => {
    setUsedOrdersCouponName(record.name);
    setUsedOrdersModalVisible(true);
    setUsedOrdersLoading(true);
    try {
      const res = await listUsedOrdersApi(record.id);
      setUsedOrdersData(res || { orders: [], totalOrders: 0, completedOrders: 0, totalDiscount: 0 });
    } catch (err) {
      console.error('获取关联订单失败:', err);
      setUsedOrdersData({ orders: [], totalOrders: 0, completedOrders: 0, totalDiscount: 0 });
    } finally {
      setUsedOrdersLoading(false);
    }
  };

  // ---------- 统计 ----------
  const publishedCoupons = couponData.filter((c) => c.status === 'published').length;
  const totalReceived = couponData.reduce((s, c) => s + (c.receivedCount ?? 0), 0);
  const totalUsed = couponData.reduce((s, c) => s + (c.usedCount ?? 0), 0);
  const verifyRate = totalReceived > 0 ? Math.round((totalUsed / totalReceived) * 100) : 0;

  // 已投放的券不可编辑关键字段（含派生状态 pending/sold_out/expired，均对应数据库 status=published）
  const isPublishedCoupon = couponEditing && ['published', 'pending', 'sold_out', 'expired'].includes(couponEditing.status);

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
          hasPermission('marketing:coupon:add') ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCouponModal(null)}>
              新增优惠券
            </Button>
          ) : null
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
              placeholder="券状态"
              style={{ width: '100%' }}
              value={couponFilters.status || undefined}
              onChange={(v) => setCouponFilters((f) => ({ ...f, status: v || '' }))}
              options={couponStatusOptions}
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Select
              allowClear
              placeholder="是否可叠加"
              style={{ width: '100%' }}
              value={couponFilters.stackable}
              onChange={(v) => setCouponFilters((f) => ({ ...f, stackable: v }))}
              options={[
                { label: '可叠加', value: 1 },
                { label: '不可叠加', value: 0 },
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
          scroll={{ x: 1490 }}
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
        okText={currentGrantType === 'user' ? '保存并发放' : '保存（草稿）'}
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

          <Form.Item
            name="grantType"
            label="发放方式"
            rules={[{ required: true, message: '请选择发放方式' }]}
            extra={currentGrantType === 'all'
              ? '全量投放：保存为草稿，需在列表点击「投放」并二次确认后，C端所有用户可见可领'
              : currentGrantType === 'level'
                ? '按会员等级：保存为草稿，投放后仅该等级会员可在C端手动领取；不直接发放到账户'
                : '按指定用户：保存后直接发放到所选会员个人中心（来源记录为「后台发放」），无需领取，不支持再投放'}
          >
            <Radio.Group disabled={!!couponEditing || isPublishedCoupon} buttonStyle="solid">
              <Radio.Button value="all">全量投放</Radio.Button>
              <Radio.Button value="level">定向-按会员等级</Radio.Button>
              <Radio.Button value="user">定向-按指定用户</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {currentGrantType === 'level' && (
            <Form.Item
              name="targetLevel"
              label={<span><UserOutlined /> 目标会员等级（该等级会员可在C端领取）</span>}
              rules={[{ required: true, message: '请选择目标会员等级' }]}
              extra={`保存为草稿并投放后，仅「${memberLevelMap[watchedTargetLevel]?.label || '所选等级'}」等级会员可在C端手动领取，不直接发放到账户`}
            >
              <DictSelect
                dictType="member_level"
                placeholder="选择会员等级"
                style={{ width: '100%' }}
                disabled={!!couponEditing || isPublishedCoupon}
              />
            </Form.Item>
          )}

          {currentGrantType === 'user' && (
            couponEditing ? (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--bg-secondary, #f5f5f5)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary, #666)' }}>
                该券为定向发放，保存时已发放到目标会员的个人中心（每人一张，来源「后台发放」），具体发放名单可在列表「领取」中查看
              </div>
            ) : (
              <Form.Item
                name="memberIds"
                label={<span><UserOutlined /> 目标会员（可多选，每人发放一张）</span>}
                rules={[{ required: true, message: '请选择目标会员' }]}
                extra={`已选 ${selectedMemberCount} 名会员${selectedMemberCount > 0 ? `，保存后立即发放 ${selectedMemberCount} 张` : ''}`}
              >
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  placeholder="选择目标会员（可多选，支持搜索姓名/手机号）"
                  options={memberOptions}
                  style={{ width: '100%' }}
                  maxTagCount="responsive"
                  notFoundContent={memberOptions.length === 0 ? '暂无会员数据' : '未匹配到会员'}
                />
              </Form.Item>
            )
          )}

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
              <Form.Item
                name="perUserLimit"
                label="每人限领"
                rules={[{ required: true, message: '请输入每人限领' }]}
                extra={currentGrantType === 'user' ? '按指定用户：每人固定发一张，此配置不生效' : ''}
              >
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
                <Radio.Group disabled={isPublishedCoupon} buttonStyle="solid">
                  <Radio.Button value="all">全场通用</Radio.Button>
                  <Radio.Button value="specified">指定车辆</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="stackable"
            label="是否可叠加使用"
            valuePropName="checked"
            initialValue={false}
            extra="开启后，用户下单时可与其他可叠加券叠加使用；关闭则一笔订单仅限使用一张券"
          >
            <Switch
              checkedChildren="可叠加"
              unCheckedChildren="不可叠加"
              disabled={isPublishedCoupon}
            />
          </Form.Item>

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
            {currentGrantType === 'user'
              ? <span>按指定用户：点击「保存并发放」后券直接进入所选会员个人中心（来源记录为 <b>后台发放</b>），无需领取，每人一张</span>
              : currentGrantType === 'level'
                ? <span>按会员等级：新增后为 <b>草稿</b> 态，需在列表点击 <b>投放</b> 后，仅该等级会员可在C端手动领取；<b>不直接发放到账户</b></span>
                : <span>全量投放：新增/修改后默认为 <b>草稿</b> 态，需在列表点击 <b>投放</b> 并二次确认后C端才可见可领</span>}
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
              render: (v) => {
                // 渠道取值约定：manual=后台/手动发放，web=官网，miniprogram=小程序，h5=移动端H5
                // 未命中的值原样展示（避免对未上报的数据造假）
                const map = { manual: '后台发放', web: '官网', miniprogram: '小程序', h5: '移动端H5' };
                return map[v] || v || '-';
              },
            },
          ]}
        />
      </Modal>

      {/* ========== 关联订单 Modal ========== */}
      <Modal
        title={`关联订单 - ${usedOrdersCouponName}`}
        open={usedOrdersModalVisible}
        onCancel={() => setUsedOrdersModalVisible(false)}
        footer={<Button onClick={() => setUsedOrdersModalVisible(false)}>关闭</Button>}
        width={960}
        destroyOnClose
      >
        <Spin spinning={usedOrdersLoading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small" variant="borderless">
                <Statistic title="关联订单总数" value={usedOrdersData.totalOrders || 0} suffix="笔" />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" variant="borderless">
                <Statistic title="已完成订单" value={usedOrdersData.completedOrders || 0} suffix="笔"
                  valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" variant="borderless">
                <Statistic title="累计优惠金额" value={usedOrdersData.totalDiscount || 0} prefix="¥"
                  valueStyle={{ color: '#fa8c16' }} />
              </Card>
            </Col>
          </Row>
          <Table
            size="small"
            dataSource={usedOrdersData.orders || []}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 900 }}
            columns={[
              {
                title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 140, ellipsis: true,
                render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '-'}</span>,
              },
              {
                title: '车辆', dataIndex: 'carName', key: 'carName', width: 140, ellipsis: true,
                render: (v) => v || '-',
              },
              {
                title: '客户', dataIndex: 'contactName', key: 'contactName', width: 90,
                render: (v) => v || '-',
              },
              {
                title: '租金总额', dataIndex: 'rentAmount', key: 'rentAmount', width: 100, align: 'right',
                render: (v) => v != null ? `¥${Number(v).toLocaleString()}` : '-',
              },
              {
                title: '优惠金额', dataIndex: 'couponDiscount', key: 'couponDiscount', width: 100, align: 'right',
                render: (v) => v != null
                  ? <span style={{ color: '#fa8c16', fontWeight: 600 }}>-¥{Number(v).toLocaleString()}</span>
                  : '-',
              },
              {
                title: '实付金额', dataIndex: 'totalAmount', key: 'totalAmount', width: 100, align: 'right',
                render: (v) => v != null
                  ? <span style={{ color: '#10b981', fontWeight: 600 }}>¥{Number(v).toLocaleString()}</span>
                  : '-',
              },
              {
                title: '状态', dataIndex: 'status', key: 'status', width: 80, align: 'center',
                render: (v) => {
                  // 状态颜色对齐订单管理（OrderList.statusColorMap）：pending/paid/renting/completed/cancelled/overdue
                  const map = {
                    pending: ['orange', '待支付'],
                    paid: ['blue', '已支付'],
                    renting: ['processing', '租赁中'],
                    completed: ['green', '已完成'],
                    cancelled: ['default', '已取消'],
                    overdue: ['red', '已逾期'],
                  };
                  const [color, text] = map[v] || ['default', v];
                  return <Tag color={color}>{text}</Tag>;
                },
              },
              {
                title: '下单时间', dataIndex: 'createTime', key: 'createTime', width: 140,
                render: (v) => formatTime(v, 'YYYY-MM-DD HH:mm'),
              },
            ]}
          />
        </Spin>
      </Modal>
    </div>
  );
};

Marketing.routeConfig = { path: '/marketing', permission: 'marketing' };
export default Marketing;
