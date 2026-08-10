import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Input, Select, Space, Tag, Modal, Form,
  Popconfirm, Tree, Row, Col, Spin,
} from 'antd';
import { message } from '@/utils/antdStatic';
import {
  PlusOutlined, SearchOutlined, DeleteOutlined, EditOutlined,
  KeyOutlined, ReloadOutlined,
} from '@ant-design/icons';
import {
  getRoleListApi, addRoleApi, updateRoleApi, deleteRoleApi,
  toggleRoleStatusApi, getMenuTreeApi, saveRolePermissionsApi,
} from '@/api/modules/system';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';

const RoleManagement = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 新增/编辑弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingRole, setEditingRole] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 权限分配弹窗
  const [permModalVisible, setPermModalVisible] = useState(false);
  const [permRole, setPermRole] = useState(null);
  const [menuTree, setMenuTree] = useState([]);
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [permSubmitting, setPermSubmitting] = useState(false);

  const fetchData = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await getRoleListApi({ page, pageSize, keyword, status: statusFilter });
      setDataSource(res?.list || []);
      setPagination({ current: page, pageSize, total: res?.total || 0 });
    } catch {
      message.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    void fetchData(1);
  };

  const handleReset = () => {
    setKeyword('');
    setStatusFilter('');
  };

  const handleAdd = () => {
    setEditingRole(null);
    setModalTitle('新增角色');
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRole(record);
    setModalTitle('编辑角色');
    form.setFieldsValue({
      name: record.name,
      roleKey: record.roleKey,
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingRole) {
        await updateRoleApi({ id: editingRole.id, ...values });
        message.success('角色更新成功');
      } else {
        await addRoleApi(values);
        message.success('角色创建成功');
      }
      setModalVisible(false);
      void fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      if (e.errorFields) return;
      message.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteRoleApi(record.id);
      message.success('角色删除成功');
      void fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      message.error(e.message || '删除失败');
    }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === 1 ? 0 : 1;
    try {
      await toggleRoleStatusApi(record.id, newStatus);
      message.success(newStatus === 1 ? '角色已启用' : '角色已禁用');
      void fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      message.error(e.message || '操作失败');
    }
  };

  // 打开权限分配弹窗
  const handleAssignPerm = async (record) => {
    setPermRole(record);
    setPermModalVisible(true);
    try {
      const tree = await getMenuTreeApi();
      setMenuTree(tree);
      // 超级管理员全选
      if (record.menuPermissions && record.menuPermissions.includes('*')) {
        const allKeys = [];
        const collectKeys = (nodes) => {
          nodes.forEach((node) => {
            allKeys.push(node.key);
            if (node.children && node.children.length > 0) collectKeys(node.children);
          });
        };
        collectKeys(tree);
        setCheckedKeys(allKeys);
      } else {
        setCheckedKeys(record.menuPermissions || []);
      }
    } catch {
      message.error('获取权限树失败');
    }
  };

  const handlePermSave = async () => {
    if (!permRole) return;
    setPermSubmitting(true);
    try {
      // 超级管理员不能取消全部权限
      if (permRole.roleKey === 'super_admin' && checkedKeys.length === 0) {
        message.warning('超级管理员必须拥有至少一项权限');
        setPermSubmitting(false);
        return;
      }
      await saveRolePermissionsApi(permRole.id, checkedKeys);
      message.success('权限保存成功，实时生效');
      setPermModalVisible(false);
      void fetchData(pagination.current, pagination.pageSize);
    } catch (e) {
      message.error(e.message || '保存失败');
    } finally {
      setPermSubmitting(false);
    }
  };

  // 权限树操作
  const handleCheck = (checked) => {
    setCheckedKeys(checked);
  };

  const handleSelectAll = () => {
    const allKeys = [];
    const collectKeys = (nodes) => {
      nodes.forEach((node) => {
        allKeys.push(node.key);
        if (node.children && node.children.length > 0) collectKeys(node.children);
      });
    };
    collectKeys(menuTree);
    setCheckedKeys(allKeys);
  };

  const handleDeselectAll = () => {
    if (permRole && permRole.roleKey === 'super_admin') {
      message.warning('超级管理员不能清空全部权限');
      return;
    }
    setCheckedKeys([]);
  };

  const handleTableChange = (pag) => {
    setPagination((prev) => ({ ...prev, current: pag.current, pageSize: pag.pageSize }));
    void fetchData(pag.current, pag.pageSize);
  };

  const columns = [
    { title: '角色名称', dataIndex: 'name', key: 'name', width: 150 },
    {
      title: '角色标识',
      dataIndex: 'roleKey',
      key: 'roleKey',
      width: 150,
      render: (text) => <code style={{ background: 'var(--table-header-bg, #fafbfc)', padding: '2px 8px', borderRadius: 4 }}>{text}</code>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'default'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180, render: formatTime.render },
    {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => handleAssignPerm(record)}>
            分配权限
          </Button>
          <Popconfirm
            title={record.status === 1 ? '确定要禁用该角色吗？' : '确定要启用该角色吗？'}
            onConfirm={() => handleToggleStatus(record)}
            okText="确定"
            cancelText="取消"
            disabled={record.roleKey === 'super_admin'}
          >
            <Button
              type="link"
              size="small"
              disabled={record.roleKey === 'super_admin'}
              style={{ color: record.roleKey === 'super_admin' ? undefined : (record.status === 1 ? 'var(--warning-color)' : 'var(--success-color)') }}
            >
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定要删除该角色吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
            disabled={record.roleKey === 'super_admin'}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={record.roleKey === 'super_admin'}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.roles')}</h2>

      {/* 搜索栏 */}
      <Card className="" variant="borderless">
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Input
              placeholder="搜索角色名称"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 200 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="角色状态"
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
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增角色
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 数据表格 */}
      <Card className="" variant="borderless">
        <Spin spinning={loading}>
          <div>
          <Table
            rowKey="id"
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
            scroll={{ x: 1000 }}
          />
          </div>
        </Spin>
      </Card>

      {/* 新增/编辑角色弹窗 */}
      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="如：超级管理员、运营专员" />
          </Form.Item>
          <Form.Item
            name="roleKey"
            label="角色标识"
            rules={[
              { required: true, message: '请输入角色标识' },
              { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '仅支持英文字母、数字和下划线' },
            ]}
          >
            <Input placeholder="如：super_admin、operation" disabled={!!editingRole} />
          </Form.Item>
          <Form.Item name="description" label="备注描述">
            <Input.TextArea rows={3} placeholder="角色描述说明" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配权限弹窗 */}
      <Modal
        title={`分配权限 - ${permRole?.name || ''}`}
        open={permModalVisible}
        onOk={handlePermSave}
        onCancel={() => setPermModalVisible(false)}
        confirmLoading={permSubmitting}
        width={560}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <Space>
            <Button size="small" onClick={handleSelectAll}>全选</Button>
            <Button size="small" onClick={handleDeselectAll}>清空</Button>
          </Space>
        </div>
        <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 6, padding: 12 }}>
          <Tree
            checkable
            defaultExpandAll
            checkedKeys={checkedKeys}
            onCheck={handleCheck}
            treeData={menuTree}
            fieldNames={{ title: 'title', key: 'key', children: 'children' }}
          />
        </div>
      </Modal>
    </div>
  );
};

RoleManagement.routeConfig = { path: '/settings/roles', permission: 'settings' };
export default RoleManagement;
