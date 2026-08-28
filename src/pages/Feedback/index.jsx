/**
 * 预约咨询管理页面（数据来自 car_rental_customer.feedback，C端提交）
 *
 * 功能：
 * - 类型 tab（预约咨询/留言反馈/全部，带数量角标）+ 状态筛选 + 关键字 + 提交时间范围
 * - 统计卡片：待处理/已处理/今日新增/未来7天取车/累计记录（含计算规则提示）
 * - 列表展示：联系人（一键拨号）、会员、意向车型、取车日期（临近高亮）、留言、处理信息
 * - 详情抽屉：完整咨询信息 + 处理信息
 * - 处理流程：标记已处理（必填沟通备注，记录处理人/时间，防重复）→ 已处理可修改备注
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Space, Tag, Input, Modal, Form, Radio, DatePicker,
  Drawer, Descriptions, Tooltip, Statistic, Row, Col, Card, Avatar, Popconfirm, Tabs, Empty,
} from 'antd';
import { message } from '@/utils/antdStatic';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, CheckOutlined, DeleteOutlined,
  ScheduleOutlined, ClockCircleOutlined, CheckCircleOutlined, CalendarOutlined,
  PhoneOutlined, EditOutlined, UserOutlined, FieldTimeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getFeedbackListApi, getFeedbackDetailApi, getFeedbackStatsApi,
  processFeedbackApi, updateFeedbackRemarkApi, deleteFeedbackApi,
} from '@/api/modules/feedback';
import { customerImageUrl } from '@/utils/imageUrl';

const { RangePicker } = DatePicker;

// 类型展示
const typeMap = {
  appointment: { text: '预约咨询', color: 'blue' },
  feedback: { text: '留言反馈', color: 'default' },
};

// 状态展示
const statusMap = {
  pending: { text: '待处理', color: 'orange' },
  handled: { text: '已处理', color: 'green' },
};

const formatTime = (v) => (v && v !== '-' ? String(v).replace('T', ' ').slice(0, 19) : '-');

// 统计卡片计算规则说明（数据口径提示）
const statTips = {
  pending: '统计口径：全部记录中状态为「待处理」的数量（含预约咨询和留言反馈）',
  handled: '统计口径：全部记录中状态为「已处理」的数量',
  today: '统计口径：提交时间（create_time）为今天的全部记录数',
  upcoming: '统计口径：待处理、且取车日期在今天起 7 天内（含今天）的预约咨询数，用于提醒客服尽快跟进',
  total: '统计口径：feedback 表全部记录数（含预约咨询和留言反馈）',
};

const FeedbackPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选条件
  const [type, setType] = useState('appointment'); // 默认展示预约咨询
  const [status, setStatus] = useState('pending');
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState(null); // [dayjs, dayjs]

  // 统计
  const [stats, setStats] = useState({
    total: 0, pending: 0, handled: 0, today: 0, upcoming: 0, appointment: 0, feedbackCount: 0,
  });

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 处理弹窗 / 备注编辑弹窗
  const [processVisible, setProcessVisible] = useState(false);
  const [processRecord, setProcessRecord] = useState(null);
  const [processSubmitting, setProcessSubmitting] = useState(false);
  const [remarkVisible, setRemarkVisible] = useState(false);
  const [remarkRecord, setRemarkRecord] = useState(null);
  const [remarkSubmitting, setRemarkSubmitting] = useState(false);
  const [processForm] = Form.useForm();
  const [remarkForm] = Form.useForm();

  const fetchStats = useCallback(async () => {
    try {
      const res = await getFeedbackStatsApi();
      if (res) {
        setStats({
          total: Number(res.total) || 0,
          pending: Number(res.pending) || 0,
          handled: Number(res.handled) || 0,
          today: Number(res.today) || 0,
          upcoming: Number(res.upcoming) || 0,
          appointment: Number(res.appointment) || 0,
          feedbackCount: Number(res.feedbackCount) || 0,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFeedbackListApi({
        page,
        pageSize,
        type: type || undefined,
        status: status || undefined,
        keyword: keyword || undefined,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        endDate: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, type, status, keyword, dateRange]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => { void fetchStats(); }, [fetchStats]);

  const handleSearch = () => { setPage(1); void fetchData(); };
  const handleReset = () => {
    setType('appointment');
    setStatus('pending');
    setKeyword('');
    setDateRange(null);
    setPage(1);
  };
  const handlePageChange = (p, ps) => { setPage(p); setPageSize(ps); };

  // ---------- 详情 / 处理 / 备注 / 删除 ----------

  const openDetail = async (record) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await getFeedbackDetailApi(record.id);
      setDetail(res);
    } catch (e) {
      setDetail(record); // 降级使用列表数据
    } finally {
      setDetailLoading(false);
    }
  };

  const openProcess = (record) => {
    setProcessRecord(record);
    processForm.resetFields();
    setProcessVisible(true);
  };

  const handleProcess = async () => {
    let remark;
    try {
      const values = await processForm.validateFields();
      remark = values.remark;
    } catch {
      return; // 校验失败
    }
    setProcessSubmitting(true);
    try {
      await processFeedbackApi(processRecord.id, { remark });
      message.success('已标记为已处理');
      setProcessVisible(false);
      void fetchData();
      void fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessSubmitting(false);
    }
  };

  const openRemark = (record) => {
    setRemarkRecord(record);
    remarkForm.setFieldsValue({ remark: record.remark || '' });
    setRemarkVisible(true);
  };

  const handleRemark = async () => {
    let remark;
    try {
      const values = await remarkForm.validateFields();
      remark = values.remark;
    } catch {
      return;
    }
    setRemarkSubmitting(true);
    try {
      await updateFeedbackRemarkApi(remarkRecord.id, { remark });
      message.success('处理备注已更新');
      setRemarkVisible(false);
      void fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setRemarkSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteFeedbackApi(record.id);
      message.success('记录已删除');
      void fetchData();
      void fetchStats();
    } catch (e) {
      console.error(e);
    }
  };

  // ---------- 展示组件 ----------

  const statusTag = (s) => {
    const cfg = statusMap[s] || { text: s, color: 'default' };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  const typeTag = (t) => {
    const cfg = typeMap[t] || { text: t, color: 'default' };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  // 取车日期展示：待处理且 3 天内临近高亮，已过期标红
  const rentDateCell = (_, r) => {
    if (!r.rentDate) return '-';
    const days = dayjs(r.rentDate).diff(dayjs().startOf('day'), 'day');
    if (r.status === 'pending' && days < 0) {
      return (
        <Tooltip title={`取车日期已过 ${-days} 天，请尽快联系客户`}>
          <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{r.rentDate}</span>
          <Tag color="red" style={{ marginLeft: 6 }}>已过期</Tag>
        </Tooltip>
      );
    }
    if (r.status === 'pending' && days <= 3) {
      return (
        <Tooltip title={`距取车仅 ${days} 天，请尽快跟进`}>
          <span style={{ color: '#fa8c16', fontWeight: 600 }}>{r.rentDate}</span>
          <Tag color="orange" style={{ marginLeft: 6 }}>临近</Tag>
        </Tooltip>
      );
    }
    return r.rentDate;
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 96, render: typeTag },
    {
      title: '联系人', key: 'contact', width: 150,
      render: (_, r) => (
        <Space size={4}>
          <span style={{ fontWeight: 600 }}>{r.name || '-'}</span>
          {r.phone && (
            <Tooltip title={`拨打 ${r.phone}`}>
              <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()}>
                <PhoneOutlined style={{ color: '#1677ff' }} />
              </a>
            </Tooltip>
          )}
        </Space>
      ),
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 126 },
    {
      title: '关联会员', key: 'member', width: 150,
      render: (_, r) => (r.memberId ? (
        <Space size={6}>
          <Avatar size={28} src={r.avatar ? customerImageUrl(r.avatar) : null} icon={!r.avatar && <UserOutlined />}>
            {!r.avatar && (r.nickname || r.username || '会')?.slice(0, 1)}
          </Avatar>
          <span>{r.nickname || r.username || '-'}</span>
        </Space>
      ) : <Tag>游客</Tag>),
    },
    { title: '意向车型', dataIndex: 'carType', key: 'carType', width: 110, render: (v) => v || '-' },
    { title: '取车日期', key: 'rentDate', width: 170, render: rentDateCell },
    {
      title: '留言内容', dataIndex: 'content', key: 'content', width: 180, ellipsis: { showTitle: false },
      render: (v) => (v ? <Tooltip title={v} placement="topLeft"><span>{v}</span></Tooltip> : '-'),
    },
    { title: '提交时间', dataIndex: 'createTime', key: 'createTime', width: 160, render: formatTime },
    { title: '状态', dataIndex: 'status', key: 'status', width: 88, render: statusTag },
    {
      title: '处理信息', key: 'handleInfo', width: 170, ellipsis: true,
      render: (_, r) => (r.status === 'pending'
        ? <span style={{ color: '#999' }}>—</span>
        : (
          <Tooltip title={r.remark ? `处理备注：${r.remark}` : null}>
            <span style={{ fontSize: 12 }}>
              {r.handler || '-'} · {formatTime(r.processTime)}
            </span>
          </Tooltip>
        )),
    },
    {
      title: '操作', key: 'action', width: 210, fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>详情</Button>
          {r.status === 'pending' && (
            <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => openProcess(r)}>处理</Button>
          )}
          {r.status === 'handled' && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openRemark(r)}>备注</Button>
          )}
          <Popconfirm
            title="确认删除该记录？"
            description="删除后不可恢复，仅用于清理垃圾数据"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], []);

  // 统计卡片配置（点击卡片联动筛选）
  const statCards = [
    { key: 'pending', title: '待处理', value: stats.pending, icon: <ClockCircleOutlined />, color: '#faad14' },
    { key: 'handled', title: '已处理', value: stats.handled, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { key: 'today', title: '今日新增', value: stats.today, icon: <CalendarOutlined />, color: '#1677ff' },
    { key: 'upcoming', title: '未来7天取车', value: stats.upcoming, icon: <FieldTimeOutlined />, color: '#722ed1' },
    { key: 'total', title: '累计记录', value: stats.total, icon: <ScheduleOutlined />, color: '#13c2c2' },
  ];

  const handleStatClick = (key) => {
    const target = { pending: 'pending', handled: 'handled', total: '' }[key];
    if (target !== undefined) { setStatus(target); setPage(1); }
    else if (key === 'upcoming') { setType('appointment'); setStatus('pending'); setPage(1); }
  };

  // 类型 tab（带数量角标）
  const typeTabs = [
    { key: 'appointment', label: `预约咨询 (${stats.appointment})` },
    { key: 'feedback', label: `留言反馈 (${stats.feedbackCount})` },
    { key: '', label: `全部 (${stats.total})` },
  ];

  const detailInfo = detail || {};

  return (
    <div style={{ padding: 24, background: 'var(--bg-container, #fff)', borderRadius: 8 }}>
      {/* 统计概览卡片（悬停可见计算规则） */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {statCards.map(({ key, title, value, icon, color }) => (
          <Col xs={12} sm={8} md={4} key={key}>
            <Tooltip title={statTips[key]}>
              <Card size="small" hoverable onClick={() => handleStatClick(key)}>
                <Statistic
                  title={<span style={{ fontSize: 13 }}>{title}</span>}
                  value={value}
                  prefix={<span style={{ color, marginRight: 4 }}>{icon}</span>}
                  valueStyle={{ color, fontSize: 22, fontWeight: 600 }}
                />
              </Card>
            </Tooltip>
          </Col>
        ))}
      </Row>

      {/* 类型 tab */}
      <Tabs
        activeKey={type}
        onChange={(k) => { setType(k); setPage(1); }}
        items={typeTabs}
        style={{ marginBottom: 0 }}
      />

      {/* 筛选区 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Radio.Group value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} buttonStyle="solid">
          <Radio.Button value="pending">
            待处理{stats.pending > 0 ? ` (${stats.pending})` : ''}
          </Radio.Button>
          <Radio.Button value="handled">已处理</Radio.Button>
          <Radio.Button value="">全部</Radio.Button>
        </Radio.Group>
        <Input
          placeholder="搜索姓名 / 手机号 / 留言内容 / 意向车型"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
          allowClear
        />
        <RangePicker
          value={dateRange}
          onChange={(dates) => { setDateRange(dates); setPage(1); }}
          placeholder={['提交开始', '提交结束']}
        />
        <Button icon={<SearchOutlined />} type="primary" onClick={handleSearch}>搜索</Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1560 }}
        locale={{ emptyText: <Empty description="暂无预约咨询记录" /> }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`,
          onChange: handlePageChange,
        }}
      />

      {/* 详情抽屉 */}
      <Drawer
        title={detail ? `${typeMap[detail.type]?.text || '记录'}详情 #${detail.id}` : '记录详情'}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={560}
        destroyOnClose
      >
        {detailLoading || !detail ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : (
          <>
            <Descriptions title="咨询信息" column={2} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="类型">{typeTag(detailInfo.type)}</Descriptions.Item>
              <Descriptions.Item label="状态">{statusTag(detailInfo.status)}</Descriptions.Item>
              <Descriptions.Item label="联系人">{detailInfo.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="手机号">
                <Space>
                  <span>{detailInfo.phone || '-'}</span>
                  {detailInfo.phone && (
                    <Button type="primary" size="small" icon={<PhoneOutlined />} href={`tel:${detailInfo.phone}`}>
                      拨打电话
                    </Button>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="关联会员" span={2}>
                {detailInfo.memberId
                  ? (
                    <Space size={6}>
                      <Avatar size={24} src={detailInfo.avatar ? customerImageUrl(detailInfo.avatar) : null} icon={!detailInfo.avatar && <UserOutlined />} />
                      <span>{detailInfo.nickname || detailInfo.username || '-'}</span>
                    </Space>
                  )
                  : <Tag>游客提交（未登录）</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="意向车型">{detailInfo.carType || '-'}</Descriptions.Item>
              <Descriptions.Item label="取车日期">{detailInfo.rentDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}>{formatTime(detailInfo.createTime)}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="留言内容" column={1} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="内容">
                <span style={{ whiteSpace: 'pre-wrap' }}>{detailInfo.content || '（无留言）'}</span>
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="处理信息" column={1} size="small" bordered>
              <Descriptions.Item label="处理人">{detailInfo.handler || '—'}</Descriptions.Item>
              <Descriptions.Item label="处理时间">{detailInfo.processTime ? formatTime(detailInfo.processTime) : '—'}</Descriptions.Item>
              <Descriptions.Item label="处理备注">
                {detailInfo.remark
                  ? <span style={{ whiteSpace: 'pre-wrap' }}>{detailInfo.remark}</span>
                  : <span style={{ color: '#999' }}>待处理后填写沟通结果</span>}
              </Descriptions.Item>
            </Descriptions>

            {detailInfo.status === 'pending' && (
              <Button type="primary" block style={{ marginTop: 20 }} onClick={() => { setDetailVisible(false); openProcess(detailInfo); }}>
                去处理
              </Button>
            )}
            {detailInfo.status === 'handled' && (
              <Button block style={{ marginTop: 20 }} icon={<EditOutlined />} onClick={() => { setDetailVisible(false); openRemark(detailInfo); }}>
                修改处理备注
              </Button>
            )}
          </>
        )}
      </Drawer>

      {/* 处理弹窗（标记已处理，必填沟通备注） */}
      <Modal
        title={processRecord ? `处理记录 #${processRecord.id} — ${processRecord.name || ''}` : '处理记录'}
        open={processVisible}
        onCancel={() => setProcessVisible(false)}
        onOk={handleProcess}
        confirmLoading={processSubmitting}
        okText="确认已处理"
        destroyOnClose
      >
        {processRecord && (
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="类型">{typeTag(processRecord.type)}</Descriptions.Item>
            <Descriptions.Item label="联系人">{processRecord.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{processRecord.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="取车日期">{processRecord.rentDate || '-'}</Descriptions.Item>
            <Descriptions.Item label="意向车型" span={2}>{processRecord.carType || '-'}</Descriptions.Item>
            <Descriptions.Item label="留言内容" span={2}>
              <span style={{ whiteSpace: 'pre-wrap' }}>{processRecord.content || '（无留言）'}</span>
            </Descriptions.Item>
          </Descriptions>
        )}
        <Form form={processForm} layout="vertical">
          <Form.Item
            name="remark"
            label="处理备注（沟通结果，必填）"
            rules={[{ required: true, message: '请填写处理备注' }]}
            extra="建议记录：联系时间、沟通结果、客户意向等，便于后续跟进追溯"
          >
            <Input.TextArea
              rows={4}
              maxLength={500}
              showCount
              placeholder="例如：已电话联系客户，确认 8 月 30 日到店看车，已推荐奔驰 E 级"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 备注编辑弹窗（仅已处理记录） */}
      <Modal
        title={remarkRecord ? `修改处理备注 #${remarkRecord.id}` : '修改处理备注'}
        open={remarkVisible}
        onCancel={() => setRemarkVisible(false)}
        onOk={handleRemark}
        confirmLoading={remarkSubmitting}
        okText="保存"
        destroyOnClose
      >
        <Form form={remarkForm} layout="vertical">
          <Form.Item
            name="remark"
            label="处理备注"
            rules={[{ required: true, message: '处理备注不能为空' }]}
          >
            <Input.TextArea rows={4} maxLength={500} showCount placeholder="补充或修改沟通结果" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

FeedbackPage.routeConfig = { path: '/feedback', permission: 'feedback' };
export default FeedbackPage;
