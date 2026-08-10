import { useState, useEffect, useCallback } from 'react';

import {
  Card, Table, Button, Input, Select, Space, Tag, Modal, Form,
  Popconfirm, Row, Col, Spin,
} from 'antd';
import { message } from '@/utils/antdStatic';
import {
  PlusOutlined, SearchOutlined, DeleteOutlined, EditOutlined,
  ReloadOutlined, LockOutlined, StopOutlined, CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import {
  getUserListApi, addUserApi, updateUserApi, deleteUserApi,
  toggleUserStatusApi, resetPasswordApi, batchDeleteUsersApi,
  batchToggleUsersApi, getRoleListApi,
} from '@/api/modules/system';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';

const UserManagement = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleOptions, setRoleOptions] = useState([]);

  // 新增/编辑弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 重置密码弹窗
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [pwdUser, setPwdUser] = useState(null);
  const [pwdForm] = Form.useForm();
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // 批量选择
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 二次密码确认
  const [confirmPwdStatus, setConfirmPwdStatus] = useState('');

  const fetchData = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await getUserListApi({ page, pageSize, keyword, status: statusFilter, role: roleFilter });
      setDataSource(res?.list || []);
      setPagination({ current: page, pageSize, total: res?.total || 0 });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter, roleFilter]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await getRoleListApi({ pageSize: 100 });
      setRoleOptions(res?.list || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void fetchData();
    void fetchRoles();
  }, [fetchData, fetchRoles]);

  const handleSearch = () => {
    void fetchData(1);
  };

  const handleReset = () => {
    setKeyword('');
    setStatusFilter('');
    setRoleFilter('');
  };

 const handleAdd = () => {
    setEditingUser(null);
    setModalTitle('新增用户');
    form.resetFields();
    setConfirmPwdStatus('');
    setModalVisible(true);
  };

  // 实时验证二次密码
  const validateConfirmPassword = (confirmValue) => {
    const password = form.getFieldValue('password');
    if (!confirmValue) {
      setConfirmPwdStatus('');
      return;
    }
    setConfirmPwdStatus(password === confirmValue ? 'success' : 'error');
  };

  const handleConfirmPwdChange = (e) => {
    validateConfirmPassword(e.target.value);
  };

  // 密码变更时，若已输入确认密码则重新校验
  const handlePasswordChange = () => {
    const confirmValue = form.getFieldValue('confirmPassword');
    if (confirmValue) {
      validateConfirmPassword(confirmValue);
    }
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    setModalTitle('编辑用户');
    form.setFieldsValue({
      nickname: record.nickname || record.name,
      phone: record.phone,
      roles: record.roles || [],
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingUser) {
        await updateUserApi({ id: editingUser.id, ...values });
        message.success('用户更新成功');
      } else {
        await addUserApi(values);
        message.success('用户创建成功');
      }
      setModalVisible(false);
      void fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      if (e.errorFields) return;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteUserApi(record.id);
      message.success('用户删除成功');
      setSelectedRowKeys((prev) => prev.filter((k) => k !== record.id));
      void fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      /* request.js 已统一提示 */
    }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === 1 ? 0 : 1;
    try {
      await toggleUserStatusApi(record.id, newStatus);
      message.success(newStatus === 1 ? '账号已启用' : '账号已禁用');
      void fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      /* request.js 已统一提示 */
    }
  };

  // 重置密码
  const handleResetPwd = (record) => {
    setPwdUser(record);
    pwdForm.resetFields();
    setPwdModalVisible(true);
  };

  const handlePwdOk = async () => {
    try {
      const values = await pwdForm.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次密码输入不一致');
        return;
      }
      setPwdSubmitting(true);
      await resetPasswordApi(pwdUser.id, values.newPassword);
      message.success('密码重置成功，请提示用户重新登录');
      setPwdModalVisible(false);
    } catch (e) {
      if (e.errorFields) return;
    } finally {
      setPwdSubmitting(false);
    }
  };

  // 批量操作
  const isSuperAdmin = (user) => {
    return user.role === 'super_admin' || (user.roles && user.roles.includes('super_admin'));
  };

  const handleBatchEnable = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    try {
      await batchToggleUsersApi(selectedRowKeys, 1);
      message.success('批量启用成功');
      setSelectedRowKeys([]);
      void fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      /* request.js 已统一提示 */
    }
  };

  const handleBatchDisable = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    Modal.confirm({
      title: '批量禁用',
      content: `确定要禁用选中的 ${selectedRowKeys.length} 个用户吗？`,
      onOk: async () => {
        try {
          await batchToggleUsersApi(selectedRowKeys, 0);
          message.success('批量禁用成功');
          setSelectedRowKeys([]);
          void fetchData(pagination.current, pagination.pageSize);
        } catch (e) {
          /* request.js 已统一提示 */
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？此操作不可恢复。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await batchDeleteUsersApi(selectedRowKeys);
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          void fetchData(pagination.current, pagination.pageSize);
        } catch (e) {
          /* request.js 已统一提示 */
        }
      },
    });
  };

  const handleTableChange = (pag) => {
    setPagination((prev) => ({ ...prev, current: pag.current, pageSize: pag.pageSize }));
    void fetchData(pag.current, pag.pageSize);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: isSuperAdmin(record),
    }),
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username', width: 130 },
    { title: '昵称', dataIndex: 'nickname', key: 'nickname', width: 130, render: (text, record) => text || record.name },
    {
      title: '绑定角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 200,
      render: (roles) => {
        if (!roles || roles.length === 0) return <Tag>无</Tag>;
        return roles.map((roleKey) => {
          const role = roleOptions.find((r) => r.roleKey === roleKey);
          return <Tag color="blue" key={roleKey}>{role?.name || roleKey}</Tag>;
        });
      },
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'default'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginTime',
      key: 'lastLoginTime',
      width: 170,
      render: (text) => formatTime.datetime(text),
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: formatTime.render },
    {
      title: '操作',
      key: 'action',
      width: 300,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<LockOutlined />} onClick={() => handleResetPwd(record)}>
            重置密码
          </Button>
          <Popconfirm
            title={record.status === 1 ? '确定要禁用该账号吗？禁用后无法登录' : '确定要启用该账号吗？'}
            onConfirm={() => handleToggleStatus(record)}
            okText="确定"
            cancelText="取消"
            disabled={isSuperAdmin(record)}
          >
            <Button
              type="link"
              size="small"
              disabled={isSuperAdmin(record)}
              icon={record.status === 1 ? <StopOutlined /> : <CheckCircleOutlined />}
              style={{ color: isSuperAdmin(record) ? undefined : (record.status === 1 ? 'var(--warning-color)' : 'var(--success-color)') }}
            >
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定要删除该用户吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
            disabled={isSuperAdmin(record)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={isSuperAdmin(record)}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.users')}</h2>

      {/* 搜索栏 */}
      <Card className="" variant="borderless">
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Input
              placeholder="用户名/昵称/手机号"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 220 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="角色筛选"
              value={roleFilter}
              onChange={(v) => setRoleFilter(v)}
              style={{ width: 150 }}
              allowClear
            >
              <Select.Option value="">全部角色</Select.Option>
              {roleOptions.map((r) => (
                <Select.Option key={r.roleKey} value={r.roleKey}>{r.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="账号状态"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value="">全部</Select.Option>
              <Select.Option value={1}>启用</Select.Option>
              <Select.Option value={0}>禁用</Select.Option>
            </Select>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<CheckCircleOutlined />}
                onClick={handleBatchEnable}
                disabled={selectedRowKeys.length === 0}
              >
                批量启用
              </Button>
              <Button
                icon={<StopOutlined />}
                onClick={handleBatchDisable}
                disabled={selectedRowKeys.length === 0}
              >
                批量禁用
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
                disabled={selectedRowKeys.length === 0}
              >
                批量删除
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增用户
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 数据表格 */}
      <Card className="" variant="borderless">
        <Spin spinning={loading}>
          <div>
          <Table
            rowKey="id"
            rowSelection={rowSelection}
            columns={columns}
            dataSource={dataSource}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (t) => `共 ${t} 条`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            onChange={handleTableChange}
            scroll={{ x: 1300 }}
          />
          </div>
        </Spin>
      </Card>

      {/* 新增/编辑用户弹窗 */}
      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => { setModalVisible(false); setConfirmPwdStatus(''); }}
        confirmLoading={submitting}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editingUser && (
            <>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { pattern: /^[a-zA-Z][a-zA-Z0-9_]{3,15}$/, message: '4-16位字母开头，字母数字下划线' },
                ]}
              >
                <Input placeholder="登录用户名" />
              </Form.Item>
              <Form.Item
                name="password"
                label="登录密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { pattern: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{6,16}$/, message: '6-16位字母数字组合' },
                ]}
              >
                <Input.Password
                  placeholder="6-16位字母数字组合"
                  onChange={handlePasswordChange}
                />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['password']}
                validateStatus={
                  confirmPwdStatus === 'success' ? 'success'
                  : confirmPwdStatus === 'error' ? 'error'
                  : ''
                }
                help={
                  confirmPwdStatus === 'success' ? (
                    <span style={{ color: '#52c41a' }}>
                      <span style={{ display: 'inline-block', marginRight: 4 }}>
                        <CheckCircleOutlined />
                      </span>
                      密码校验成功！
                    </span>
                  ) : confirmPwdStatus === 'error' ? (
                    <span style={{ color: '#ff4d4f' }}>
                      <span style={{ display: 'inline-block', marginRight: 4 }}>
                        <CloseCircleOutlined />
                      </span>
                      两次密码不一致
                    </span>
                  ) : ''
                }
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次密码输入不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  placeholder="请再次输入密码"
                  onChange={handleConfirmPwdChange}
                />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="nickname"
            label="昵称"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input placeholder="用户昵称" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input placeholder="手机号" />
          </Form.Item>
          <Form.Item
            name="roles"
            label="绑定角色"
            rules={[{ required: true, message: '请选择角色', type: 'array' }]}
          >
            <Select mode="multiple" placeholder="选择角色（可多选）">
              {roleOptions.map((r) => (
                <Select.Option key={r.roleKey} value={r.roleKey}>{r.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          {editingUser && (
            <Form.Item name="status" label="账号状态">
              <Select>
                <Select.Option value={1}>启用</Select.Option>
                <Select.Option value={0}>禁用</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 重置密码弹窗 */}
      <Modal
        title={`重置密码 - ${pwdUser?.username || ''}`}
        open={pwdModalVisible}
        onOk={handlePwdOk}
        onCancel={() => setPwdModalVisible(false)}
        confirmLoading={pwdSubmitting}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { pattern: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{6,16}$/, message: '6-16位字母数字组合' },
            ]}
          >
            <Input.Password placeholder="6-16位字母数字组合" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次密码输入不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

UserManagement.routeConfig = { path: '/settings/users', permission: 'settings' };
export default UserManagement;
