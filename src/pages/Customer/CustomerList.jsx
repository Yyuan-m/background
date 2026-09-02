import { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Space, Tag, Input, InputNumber, Modal, Form, Select, Popconfirm, Row, Col, Card, Progress, Statistic, Descriptions, Image, Spin } from 'antd';
import { message } from '@/utils/antdStatic';
import { SearchOutlined, ReloadOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { getCustomersApi, getCustomerDetailApi, updateCustomerApi, toggleCustomerStatusApi } from '@/api/modules/customer';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useAuthStore from '@/store/useAuthStore';
import { t } from '@/i18n';
import { customerImageUrl } from '@/utils/imageUrl';

// 会员等级颜色映射（字典不存颜色，本地维护）
const memberLevelColorMap = { normal: 'default', silver: 'blue', gold: 'gold', diamond: 'blue', black: 'black' };

// 性别显示
const genderMap = { 0: '未知', 1: '男', 2: '女' };

// 实名状态显示
const realNameStatusMap = {
  0: { text: '未认证', color: 'red' },
  1: { text: '已认证', color: 'green' },
  2: { text: '认证中', color: 'orange' },
  3: { text: '认证失败', color: 'red' },
};

const parseTags = (tags) => {
  if (!tags) return [];
  if (typeof tags === 'string') {
    try { return JSON.parse(tags); } catch { return [tags]; }
  }
  return [];
};

const CustomerList = () => {
  const { hasPermission } = useAuthStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const { map: memberLevelMap } = useDict('member_level');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCustomersApi({ page, pageSize, keyword, status: filterStatus, level: filterLevel });
      setData(res?.list || []); setTotal(res?.total || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [page, pageSize, keyword, filterStatus, filterLevel]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleSearch = () => { setPage(1); void fetchData(); };
  const handleReset = () => { setKeyword(''); setFilterStatus(''); setFilterLevel(''); setPage(1); };
  const handleEdit = (record) => { setEditingId(record.id); form.setFieldsValue(record); setModalVisible(true); };

  const handleViewDetail = async (record) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await getCustomerDetailApi(record.id);
      setDetailCustomer(res);
    } catch (e) {
      setDetailCustomer(record); // 降级使用列表数据
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      await updateCustomerApi(editingId, values);
      message.success('编辑成功');
      setModalVisible(false); void fetchData();
    } catch (e) { if (e.errorFields) return; } finally { setSubmitLoading(false); }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === 1 ? 0 : 1;
    await toggleCustomerStatusApi(record.id, newStatus); message.success('操作成功'); void fetchData();
  };

  const handlePageChange = (p, ps) => { setPage(p); setPageSize(ps); };

  const premiumCount = useMemo(() => data.filter((c) => ['black', 'diamond'].includes(c.membershipLevel)).length, [data]);
  const blacklistCount = useMemo(() => data.filter((c) => c.isBlacklist).length, [data]);
  const avgCreditScore = useMemo(() => data.length > 0 ? Math.round(data.reduce((s, c) => s + c.creditScore, 0) / data.length) : 0, [data]);

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 50 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 80 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 120 },
    { title: '会员等级', dataIndex: 'membershipName', key: 'membershipName', width: 100, render: (v, r) => {
      const cfg = memberLevelMap[r.membershipLevel];
      const color = memberLevelColorMap[r.membershipLevel] || 'default';
      return <Tag color={color}>{cfg?.label || v || r.membershipLevel}</Tag>;
    } },
    { title: '信用分', dataIndex: 'creditScore', key: 'creditScore', width: 100,
      render: (v) => <Progress percent={v} size="small" strokeColor={v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444'} format={() => v} />,
    },
    { title: '实名', dataIndex: 'realNameStatus', key: 'realNameStatus', width: 70, render: (v) => { const cfg = realNameStatusMap[v] || realNameStatusMap[0]; return <Tag color={cfg.color}>{cfg.text}</Tag>; } },
    { title: '租赁次数', dataIndex: 'totalOrders', key: 'totalOrders', width: 80 },
    { title: '累计消费', dataIndex: 'totalSpent', key: 'totalSpent', width: 110, render: (v) => <span style={{ color: 'var(--amount-color, #c9a96e)', fontWeight: 500 }}>¥{v?.toLocaleString()}</span> },
    { title: '标签', dataIndex: 'tags', key: 'tags', width: 150, render: (tags) => (Array.isArray(tags) ? tags : parseTags(tags)).map((t) => <Tag key={t} color="geekblue">{t}</Tag>) },
    { title: '黑名单', dataIndex: 'isBlacklist', key: 'isBlacklist', width: 80, render: (v) => v ? <Tag color="red">是</Tag> : <Tag color="green">否</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 70, render: (v) => v ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag> },
    {
      title: '操作', key: 'action', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          {hasPermission('customer:update') && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>}
          {hasPermission('customer:status') && (
            <Popconfirm title={`确定${record.status ? '禁用' : '启用'}？`} onConfirm={() => handleToggleStatus(record)}>
              <Button type="link" size="small" danger={!!record.status}>{record.status ? '禁用' : '启用'}</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ], [hasPermission, memberLevelMap, handleViewDetail, handleEdit, handleToggleStatus]);

  // 渲染实名状态 Tag
  const renderRealNameStatus = (v) => {
    const cfg = realNameStatusMap[v] || { text: '未知', color: 'default' };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  // 渲染图片项（小图，可预览）—— 客户证件照来自 8089 服务，使用 customerImageUrl
  const renderImage = (url) => {
    if (!url) return '-';
    return <Image src={customerImageUrl(url)} width={60} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} />;
  };

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.customers')}</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="总客户数" value={total} valueStyle={{ color: '#1a365d' }} /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="黑卡/钻石会员" value={premiumCount} valueStyle={{ color: 'var(--amount-color, #c9a96e)' }} /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="黑名单" value={blacklistCount} valueStyle={{ color: '#ef4444' }} /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="平均信用分" value={avgCreditScore} valueStyle={{ color: '#10b981' }} /></Card></Col>
      </Row>

      <Card className="" variant="borderless" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={5}><Input placeholder="搜索姓名/手机号" prefix={<SearchOutlined />} value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} allowClear /></Col>
          <Col xs={24} sm={12} md={3}><DictSelect dictType="member_level" placeholder="会员等级" value={filterLevel || undefined} onChange={setFilterLevel} allowClear style={{ width: '100%' }} /></Col>
          <Col xs={24} sm={12} md={3}><Select placeholder="账号状态" value={filterStatus || undefined} onChange={setFilterStatus} allowClear style={{ width: '100%' }}><Select.Option value="1">启用</Select.Option><Select.Option value="0">禁用</Select.Option></Select></Col>
          <Col><Space><Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button><Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button></Space></Col>
        </Row>
      </Card>

      <Card className="" variant="borderless">
        <div>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1400 }}
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

      <Modal title="编辑租客" open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} confirmLoading={submitLoading} width={500} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input placeholder="姓名" /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="手机号" rules={[{ required: true }, { pattern: /^1[3-9]\d{9}$/ }]}><Input placeholder="手机号" /></Form.Item></Col>
          </Row>
          <Form.Item name="idCard" label="身份证号"><Input placeholder="身份证号" /></Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="membershipLevel" label="会员等级" initialValue="normal"><DictSelect dictType="member_level" /></Form.Item></Col>
            <Col span={8}><Form.Item name="creditScore" label="信用分" initialValue={80}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="isBlacklist" label="黑名单" initialValue={false}><Select><Select.Option value={0}>否</Select.Option><Select.Option value={1}>是</Select.Option></Select></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="realNameStatus" label="实名认证" initialValue={0}><Select><Select.Option value={0}>未认证</Select.Option><Select.Option value={1}>已认证</Select.Option></Select></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="账号状态" initialValue={1}><Select><Select.Option value={1}>启用</Select.Option><Select.Option value={0}>禁用</Select.Option></Select></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title="客户详情" open={detailVisible} onCancel={() => { setDetailVisible(false); setDetailCustomer(null); }} footer={null} width={900}>
        <Spin spinning={detailLoading}>
          {detailCustomer && (
            <>
              <Descriptions title="基本信息" bordered column={2} size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="姓名">{detailCustomer.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="手机号">{detailCustomer.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{detailCustomer.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="性别">{genderMap[detailCustomer.gender] ?? '未知'}</Descriptions.Item>
                <Descriptions.Item label="生日">{detailCustomer.birthday || '-'}</Descriptions.Item>
                <Descriptions.Item label="头像">{detailCustomer.avatar ? <Image src={customerImageUrl(detailCustomer.avatar)} width={50} height={50} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '-'}</Descriptions.Item>
              </Descriptions>

              <Descriptions title="账户信息" bordered column={2} size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="用户名">{detailCustomer.username || '-'}</Descriptions.Item>
                <Descriptions.Item label="昵称">{detailCustomer.nickname || '-'}</Descriptions.Item>
                <Descriptions.Item label="会员等级">
                  <Tag color={memberLevelColorMap[detailCustomer.membershipLevel] || 'default'}>
                    {memberLevelMap[detailCustomer.membershipLevel]?.label || detailCustomer.membershipName || detailCustomer.membershipLevel || '-'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="信用分">{detailCustomer.creditScore ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="累计消费">¥{detailCustomer.totalSpent?.toLocaleString() ?? 0}</Descriptions.Item>
                <Descriptions.Item label="租赁次数">{detailCustomer.totalOrders ?? 0}</Descriptions.Item>
                <Descriptions.Item label="折扣">{detailCustomer.discount != null ? `${(detailCustomer.discount * 100).toFixed(0)}%` : '-'}</Descriptions.Item>
                <Descriptions.Item label="最后登录时间">{detailCustomer.lastLoginTime || '-'}</Descriptions.Item>
                <Descriptions.Item label="最后登录IP">{detailCustomer.lastLoginIp || '-'}</Descriptions.Item>
              </Descriptions>

              <Descriptions title="证件信息" bordered column={2} size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="身份证号">{detailCustomer.idCard || '-'}</Descriptions.Item>
                <Descriptions.Item label="实名状态">{renderRealNameStatus(detailCustomer.realNameStatus)}</Descriptions.Item>
                <Descriptions.Item label="驾驶证号">{detailCustomer.driverLicense || '-'}</Descriptions.Item>
                <Descriptions.Item label="驾驶证类型">{detailCustomer.driverLicenseType || '-'}</Descriptions.Item>
                <Descriptions.Item label="驾驶证有效期">{detailCustomer.driverLicenseExpire || '-'}</Descriptions.Item>
                <Descriptions.Item label="身份证正面照">{renderImage(detailCustomer.idCardFrontImg)}</Descriptions.Item>
                <Descriptions.Item label="身份证反面照">{renderImage(detailCustomer.idCardBackImg)}</Descriptions.Item>
                <Descriptions.Item label="驾驶证正面照">{renderImage(detailCustomer.driverLicenseFrontImg)}</Descriptions.Item>
                <Descriptions.Item label="驾驶证反面照">{renderImage(detailCustomer.driverLicenseBackImg)}</Descriptions.Item>
              </Descriptions>

              <Descriptions title="地址信息" bordered column={2} size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="省份">{detailCustomer.province || '-'}</Descriptions.Item>
                <Descriptions.Item label="城市">{detailCustomer.city || '-'}</Descriptions.Item>
                <Descriptions.Item label="详细地址" span={2}>{detailCustomer.address || '-'}</Descriptions.Item>
              </Descriptions>

              <Descriptions title="其他" bordered column={2} size="small">
                <Descriptions.Item label="黑名单">{detailCustomer.isBlacklist ? <Tag color="red">是</Tag> : <Tag color="green">否</Tag>}</Descriptions.Item>
                <Descriptions.Item label="状态">{detailCustomer.status ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>}</Descriptions.Item>
                <Descriptions.Item label="标签" span={2}>{(Array.isArray(detailCustomer.tags) ? detailCustomer.tags : parseTags(detailCustomer.tags)).map((t) => <Tag key={t}>{t}</Tag>)}</Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

CustomerList.routeConfig = { path: '/customers', permission: 'customer' };
export default CustomerList;
