import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Space, Tag, Input, Modal, Form, Select, Popconfirm, Row, Col, Card,
} from 'antd';
import { message } from '@/utils/antdStatic';
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAdminsApi, addAdminApi, updateAdminApi, deleteAdminApi, toggleAdminStatusApi } from '@/api/modules/admin';
import { getRoleListApi } from '@/api/modules/system';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';

const { Option } = Select;

// 角色颜色映射（仅按 role code 决定颜色，展示文本统一使用后端返回的 roleName）
const roleColorMap = {
  super_admin: 'red',
  operator: 'blue',
  finance_admin: 'gold',
  after_sales: 'purple',
  service: 'green',
};

const AdminList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [roleOptions, setRoleOptions] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增管理员');
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminsApi({ page, pageSize, keyword });
      setData(res?.list || []); setTotal(res?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword]);

  // 拉取角色列表（用于 Form 下拉选项）
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await getRoleListApi({ pageSize: 100 });
        setRoleOptions(res?.list || []);
      } catch (e) {
        console.error('获取角色列表失败:', e);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSearch = () => { setPage(1); void fetchData(); };
  const handleReset = () => { setKeyword(''); setPage(1); };
  const handlePageChange = (p, ps) => { setPage(p); setPageSize(ps); };

  const handleAdd = () => {
    setEditingId(null);
    setModalTitle('新增管理员');
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setModalTitle('编辑管理员');
    form.setFieldsValue({ ...record, nickname: record.nickname || record.name, password: '' });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      // 同步 roleName：根据所选 role code 查找对应的角色名称
      const matchedRole = roleOptions.find((r) => r.key === values.role || r.id === values.role);
      const submitData = {
        ...values,
        roleName: matchedRole?.name || values.roleName || '',
      };
      if (editingId) {
        if (!submitData.password) delete submitData.password;
        await updateAdminApi(editingId, submitData);
        message.success('编辑成功');
      } else {
        await addAdminApi(submitData);
        message.success('新增成功');
      }
      setModalVisible(false);
      void fetchData();
    } catch (e) {
      if (e.errorFields) return;
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminApi(id);
      message.success('删除成功');
      void fetchData();
    } catch (e) {
      /* request.js 已统一提示 */
    }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === 1 ? 0 : 1;
    try {
      await toggleAdminStatusApi(record.id, newStatus);
      message.success('操作成功');
      void fetchData();
    } catch (e) {
      /* request.js 已统一提示 */
    }
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
    { title: '姓名', dataIndex: 'nickname', key: 'nickname', width: 120 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
    {
      title: '角色',
      dataIndex: 'roleName',
      key: 'roleName',
      width: 120,
      render: (roleName, record) => {
        const color = roleColorMap[record.role] || 'default';
        return <Tag color={color}>{roleName || record.role || '-'}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v) => v ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: formatTime.render },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm
            title={`确定${record.status ? '禁用' : '启用'}该管理员？`}
            onConfirm={() => handleToggleStatus(record)}
          >
            <Button type="link" size="small" danger={!!record.status}>
              {record.status ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
          <Popconfirm title="确定删除该管理员？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [handleEdit, handleToggleStatus, handleDelete]);

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.admin')}</h2>

      <Card className="" variant="borderless">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索用户名/姓名"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className="" variant="borderless">
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增管理员</Button>
        </div>
        <div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: handlePageChange,
          }}
        />
        </div>
      </Card>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitLoading}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '至少3个字符' }]}>
                <Input placeholder="用户名" disabled={!!editingId} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nickname" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="姓名" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="password"
            label="密码"
            rules={editingId ? [] : [{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6个字符' }]}
          >
            <Input.Password placeholder={editingId ? '不修改请留空' : '请输入密码'} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email' }]}>
                <Input placeholder="邮箱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]}>
                <Input placeholder="手机号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
                <Select placeholder="请选择角色">
                  {roleOptions.map((r) => (
                    <Option key={r.key || r.id} value={r.key || r.id}>{r.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" initialValue={1}>
                <Select>
                  <Option value={1}>启用</Option>
                  <Option value={0}>禁用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

AdminList.routeConfig = { path: '/admins', permission: 'settings' };
export default AdminList;
