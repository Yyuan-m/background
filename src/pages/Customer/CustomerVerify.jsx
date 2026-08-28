/**
 * 会员实名认证审核页面（数据来自 car_rental_customer.member_verify_record）
 *
 * 功能：
 * - 状态 tab（待审核/已通过/已驳回/全部）+ 关键字搜索
 * - 列表展示：会员信息、认证资料摘要、提交时间、状态、审核信息
 * - 详情抽屉：完整认证资料 + 4 张证件照（点击可预览大图）
 * - 审核操作：通过 / 驳回（驳回必填原因）
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Space, Tag, Input, Modal, Form, Radio, InputNumber,
  Drawer, Descriptions, Image, Empty, Tooltip, Badge, Statistic, Row, Col, Card,
} from 'antd';
import { message } from '@/utils/antdStatic';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, CheckOutlined, CloseOutlined,
  SafetyCertificateOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { getVerifyListApi, getVerifyDetailApi, reviewVerifyApi, getVerifyStatsApi } from '@/api/modules/customer';
import { customerImageUrl } from '@/utils/imageUrl';
import './CustomerVerify.scss';

// 记录状态展示
const statusMap = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
};

// 会员当前认证状态（member.verify_status）
const memberStatusMap = {
  unverified: { text: '未认证', color: 'default' },
  pending: { text: '审核中', color: 'orange' },
  verified: { text: '已认证', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
};

// 性别显示
const genderMap = { 0: '未知', 1: '男', 2: '女' };

const formatTime = (v) => (v && v !== '-' ? String(v).replace('T', ' ').slice(0, 19) : '-');

// 身份证号脱敏（保留前 3 后 4）
const maskIdCard = (v) => (v && v.length >= 8 ? `${v.slice(0, 3)}***********${v.slice(-4)}` : v || '-');

// 证件照配置（身份证/驾驶证各正反面）
const imageItems = [
  { label: '身份证正面（人像面）', field: 'idCardFrontImg', group: 'idCard' },
  { label: '身份证背面（国徽面）', field: 'idCardBackImg', group: 'idCard' },
  { label: '驾驶证正面（主页）', field: 'driverLicenseFrontImg', group: 'license' },
  { label: '驾驶证背面（副页）', field: 'driverLicenseBackImg', group: 'license' },
];

const CustomerVerify = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState('pending');
  const [keyword, setKeyword] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, today: 0 });

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 审核弹窗
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewRecord, setReviewRecord] = useState(null);
  const [reviewApproved, setReviewApproved] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchStats = useCallback(async () => {
    try {
      const res = await getVerifyStatsApi();
      if (res) {
        setStats({
          total: Number(res.total) || 0,
          pending: Number(res.pending) || 0,
          approved: Number(res.approved) || 0,
          rejected: Number(res.rejected) || 0,
          today: Number(res.today) || 0,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVerifyListApi({
        page, pageSize,
        status: status || undefined,
        keyword: keyword || undefined,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, keyword]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => { void fetchStats(); }, [fetchStats]);

  const handleSearch = () => { setPage(1); void fetchData(); };
  const handleReset = () => { setKeyword(''); setStatus('pending'); setPage(1); };
  const handlePageChange = (p, ps) => { setPage(p); setPageSize(ps); };

  const openDetail = async (record) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await getVerifyDetailApi(record.id);
      setDetail(res);
    } catch (e) {
      setDetail(record); // 降级使用列表数据
    } finally {
      setDetailLoading(false);
    }
  };

  const openReview = (record) => {
    setReviewRecord(record);
    setReviewApproved(true);
    form.resetFields();
    setReviewVisible(true);
  };

  const handleReview = async () => {
    let rejectReason;
    if (!reviewApproved) {
      try {
        const values = await form.validateFields();
        rejectReason = values.rejectReason;
      } catch {
        return; // 校验失败
      }
    }
    setReviewSubmitting(true);
    try {
      await reviewVerifyApi(reviewRecord.id, { approved: reviewApproved, rejectReason });
      message.success(reviewApproved ? '已通过认证' : '已驳回认证');
      setReviewVisible(false);
      void fetchData();
      void fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const statusTag = (s) => {
    const cfg = statusMap[s] || { text: s, color: 'default' };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: '会员', key: 'member', width: 200,
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{r.nickname || r.username || '-'}</span>
          <span style={{ color: '#999', fontSize: 12 }}>{r.phone || ''}</span>
        </div>
      ),
    },
    { title: '真实姓名', dataIndex: 'realName', key: 'realName', width: 90 },
    { title: '身份证号', dataIndex: 'idCard', key: 'idCard', width: 170, render: maskIdCard },
    { title: '驾驶证号', dataIndex: 'driverLicenseNo', key: 'driverLicenseNo', width: 160, ellipsis: true },
    {
      title: '证件照片', key: 'images', width: 220,
      render: (_, r) => (
        <Image.PreviewGroup>
          <div style={{ display: 'flex', gap: 6 }}>
            {imageItems.map(({ label, field }) => (
              r[field] ? (
                <Tooltip key={field} title={label}>
                  <Image
                    src={customerImageUrl(r[field])}
                    alt={label}
                    width={44}
                    height={44}
                    style={{ objectFit: 'cover', borderRadius: 6, background: '#f5f5f5' }}
                    preview={{ mask: false }}
                  />
                </Tooltip>
              ) : (
                <Tooltip key={field} title={`${label}（未上传）`}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 6, background: '#f5f5f5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#bbb', fontSize: 16, border: '1px dashed #e0e0e0',
                  }}>无</div>
                </Tooltip>
              )
            ))}
          </div>
        </Image.PreviewGroup>
      ),
    },
    { title: '提交时间', dataIndex: 'createTime', key: 'createTime', width: 160, render: formatTime },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: statusTag,
    },
    {
      title: '审核信息', key: 'review', width: 180, ellipsis: true,
      render: (_, r) => r.status === 'pending'
        ? <span style={{ color: '#999' }}>—</span>
        : (
          <Tooltip title={r.rejectReason ? `驳回原因：${r.rejectReason}` : null}>
            <span style={{ fontSize: 12 }}>
              {r.reviewer || '-'} · {formatTime(r.reviewTime)}
            </span>
          </Tooltip>
        ),
    },
    {
      title: '操作', key: 'action', width: 170, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>详情</Button>
          {r.status === 'pending' && (
            <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => openReview(r)}>审核</Button>
          )}
        </Space>
      ),
    },
  ], []);

  // 统计卡片配置
  const statCards = [
    { title: '待审核', value: stats.pending, icon: <ClockCircleOutlined />, color: '#faad14' },
    { title: '已通过', value: stats.approved, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: '已驳回', value: stats.rejected, icon: <CloseCircleOutlined />, color: '#ff4d4f' },
    { title: '今日提交', value: stats.today, icon: <CalendarOutlined />, color: '#1677ff' },
    { title: '累计记录', value: stats.total, icon: <SafetyCertificateOutlined />, color: '#722ed1' },
  ];

  return (
    <div style={{ padding: 24, background: 'var(--bg-container, #fff)', borderRadius: 8 }}>
      {/* 统计概览卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {statCards.map(({ title, value, icon, color }) => (
          <Col xs={12} sm={8} md={4} key={title}>
            <Card size="small" hoverable onClick={() => {
              const target = { 待审核: 'pending', 已通过: 'approved', 已驳回: 'rejected', 累计记录: '', 今日提交: status }[title];
              if (target !== undefined) { setStatus(target); setPage(1); }
            }}>
              <Statistic
                title={<span style={{ fontSize: 13 }}>{title}</span>}
                value={value}
                prefix={<span style={{ color, marginRight: 4 }}>{icon}</span>}
                valueStyle={{ color, fontSize: 22, fontWeight: 600 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 筛选区 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Radio.Group value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} buttonStyle="solid">
          <Radio.Button value="pending">
            待审核{stats.pending > 0 ? ` (${stats.pending})` : ''}
          </Radio.Button>
          <Radio.Button value="approved">已通过</Radio.Button>
          <Radio.Button value="rejected">已驳回</Radio.Button>
          <Radio.Button value="">全部</Radio.Button>
        </Radio.Group>
        <Input
          placeholder="搜索姓名 / 身份证号 / 手机号 / 昵称"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 280 }}
          allowClear
        />
        <Button icon={<SearchOutlined />} type="primary" onClick={handleSearch}>搜索</Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1420 }}
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
        title={detail ? `认证详情 #${detail.id}` : '认证详情'}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={560}
        destroyOnClose
      >
        {detailLoading || !detail ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : (
          <>
            <Descriptions title="会员信息" column={2} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="昵称">{detail.nickname || detail.username || '-'}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detail.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="当前认证状态" span={2}>
                {(() => {
                  const cfg = memberStatusMap[detail.memberVerifyStatus] || { text: detail.memberVerifyStatus || '-', color: 'default' };
                  return <Tag color={cfg.color}>{cfg.text}</Tag>;
                })()}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="认证资料" column={2} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="真实姓名">{detail.realName || '-'}</Descriptions.Item>
              <Descriptions.Item label="出生日期">{detail.birthDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="身份证号" span={2}>{detail.idCard || '-'}</Descriptions.Item>
              <Descriptions.Item label="驾驶证号">{detail.driverLicenseNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="准驾车型">{detail.driverLicenseType || '-'}</Descriptions.Item>
              <Descriptions.Item label="驾驶证有效期至" span={2}>{detail.driverLicenseExpireDate || '-'}</Descriptions.Item>
            </Descriptions>

            {/* 证件照片：分组卡片式布局，点击查看大图 */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12 }}>证件照片（点击查看大图）</h4>
              <Image.PreviewGroup>
                {[
                  { group: 'idCard', title: '身份证', items: imageItems.filter((i) => i.group === 'idCard') },
                  { group: 'license', title: '驾驶证', items: imageItems.filter((i) => i.group === 'license') },
                ].map(({ group: groupKey, title, items }) => (
                  <div
                    key={groupKey}
                    style={{
                      marginBottom: 12, padding: 12, borderRadius: 8,
                      background: 'var(--bg-page, #fafafa)', border: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary, #333)' }}>
                      {title}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {items.map(({ label, field }) => (
                        <div
                          key={field}
                          style={{
                            border: '1px solid #f0f0f0', borderRadius: 6, padding: 6,
                            background: '#fff', transition: 'box-shadow .2s',
                          }}
                          className="verify-img-card"
                        >
                          <Image
                            src={customerImageUrl(detail[field])}
                            alt={label}
                            height={150}
                            style={{ objectFit: 'cover', width: '100%', borderRadius: 4, background: '#f5f5f5' }}
                            fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6ZW/5aWX5qih5Z6LLazmoraPC90ZXh0Pjwvc3ZnPg=="
                          />
                          <div style={{ fontSize: 12, color: '#666', marginTop: 6, textAlign: 'center' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </Image.PreviewGroup>
            </div>

            <Descriptions title="审核信息" column={1} size="small" bordered>
              <Descriptions.Item label="提交时间">{formatTime(detail.createTime)}</Descriptions.Item>
              <Descriptions.Item label="记录状态">{statusTag(detail.status)}</Descriptions.Item>
              <Descriptions.Item label="审核人">{detail.reviewer || '-'}</Descriptions.Item>
              <Descriptions.Item label="审核时间">{formatTime(detail.reviewTime)}</Descriptions.Item>
              <Descriptions.Item label="驳回原因">
                {detail.rejectReason ? <span style={{ color: '#ff4d4f' }}>{detail.rejectReason}</span> : '—'}
              </Descriptions.Item>
            </Descriptions>

            {detail.status === 'pending' && (
              <Button type="primary" block style={{ marginTop: 20 }} onClick={() => { setDetailVisible(false); openReview(detail); }}>
                去审核
              </Button>
            )}
          </>
        )}
      </Drawer>

      {/* 审核弹窗 */}
      <Modal
        title={reviewRecord ? `审核认证 #${reviewRecord.id} — ${reviewRecord.realName || ''}` : '审核认证'}
        open={reviewVisible}
        onCancel={() => setReviewVisible(false)}
        onOk={handleReview}
        confirmLoading={reviewSubmitting}
        okText={reviewApproved ? '确认通过' : '确认驳回'}
        okButtonProps={{ danger: !reviewApproved }}
        destroyOnClose
      >
        <Radio.Group
          value={reviewApproved}
          onChange={(e) => setReviewApproved(e.target.value)}
          style={{ marginBottom: 16, display: 'flex', gap: 16 }}
        >
          <Radio value><span style={{ color: '#52c41a', fontWeight: 600 }}>通过认证</span></Radio>
          <Radio value={false}><span style={{ color: '#ff4d4f', fontWeight: 600 }}>驳回认证</span></Radio>
        </Radio.Group>
        {reviewRecord && (
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="会员">{reviewRecord.nickname || reviewRecord.username || '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{reviewRecord.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="真实姓名">{reviewRecord.realName || '-'}</Descriptions.Item>
            <Descriptions.Item label="身份证号">{maskIdCard(reviewRecord.idCard)}</Descriptions.Item>
          </Descriptions>
        )}
        {!reviewApproved && (
          <Form form={form} layout="vertical">
            <Form.Item
              name="rejectReason"
              label="驳回原因（会员端会展示该原因）"
              rules={[{ required: true, message: '请填写驳回原因' }]}
            >
              <Input.TextArea rows={3} maxLength={200} showCount placeholder="例如：身份证照片模糊，请重新上传清晰照片" />
            </Form.Item>
          </Form>
        )}
        {reviewApproved && (
          <div style={{ color: '#999' }}>通过后该会员将获得实名认证资格，可直接下单租车。</div>
        )}
      </Modal>
    </div>
  );
};

CustomerVerify.routeConfig = { path: '/customers/verify', permission: 'customer' };
export default CustomerVerify;
