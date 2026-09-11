import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Input, Select, Space, Tag, Modal, Form,
  Popconfirm, Tree, Row, Col, Spin, Empty,
} from 'antd';
import { message } from '@/utils/antdStatic';
import {
  PlusOutlined, SearchOutlined, DeleteOutlined, EditOutlined,
  KeyOutlined, ReloadOutlined, SwapOutlined, ExpandOutlined, ShrinkOutlined,
} from '@ant-design/icons';
import {
  getRoleListApi, addRoleApi, updateRoleApi, deleteRoleApi,
  toggleRoleStatusApi, getPermissionTreeApi, saveRolePermissionsApi,
} from '@/api/modules/system';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';
import useAuthStore from '@/store/useAuthStore';

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
  // 权限树搜索 / 展开控制
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedKeys, setExpandedKeys] = useState([]);

  const { hasPermission } = useAuthStore();
  const canRoleUpdate = hasPermission('settings:role:update');
  const canRolePermission = hasPermission('settings:role:permission');
  const canRoleStatus = hasPermission('settings:role:status');
  const canRoleDelete = hasPermission('settings:role:delete');

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
      // request.js 已统一弹出错误提示，这里不再重复弹
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

  // 收集树中所有节点 key（全选/反选/展开/统计共用）
  const allMenuKeys = useMemo(() => {
    const keys = [];
    const collect = (nodes) => {
      nodes.forEach((node) => {
        keys.push(node.key);
        if (node.children && node.children.length > 0) collect(node.children);
      });
    };
    collect(menuTree);
    return keys;
  }, [menuTree]);

  // 已选数量
  const checkedCount = checkedKeys.length;

  // 按关键字过滤菜单树：仅影响展示，不影响勾选的 key
  const displayTree = useMemo(() => {
    const kw = searchKeyword.trim();
    if (!kw) return menuTree;
    const filter = (nodes) => {
      const result = [];
      nodes.forEach((node) => {
        const children = node.children ? filter(node.children) : [];
        const matched = node.title && node.title.indexOf(kw) > -1;
        if (matched || children.length > 0) {
          result.push({
            ...node,
            title: matched ? (
              <>
                {node.title.slice(0, node.title.indexOf(kw))}
                <span style={{ color: '#1677ff', fontWeight: 600 }}>{kw}</span>
                {node.title.slice(node.title.indexOf(kw) + kw.length)}
              </>
            ) : node.title,
            children,
          });
        }
      });
      return result;
    };
    return filter(menuTree);
  }, [searchKeyword, menuTree]);

  // 打开权限分配弹窗
  const handleAssignPerm = async (record) => {
    setPermRole(record);
    setPermModalVisible(true);
    setSearchKeyword('');
    try {
      const tree = await getPermissionTreeApi();
      setMenuTree(tree);
      // 展开全部节点
      const keys = [];
      const collect = (nodes) => {
        nodes.forEach((node) => {
          keys.push(node.key);
          if (node.children && node.children.length > 0) collect(node.children);
        });
      };
      collect(tree);
      setExpandedKeys(keys);
      // 超级管理员全选
      if (record.menuPermissions && record.menuPermissions.includes('*')) {
        setCheckedKeys(keys);
      } else {
        // 按层级展开：角色拥有父级权限（如 vehicle）时，antd Tree 级联显示其子节点为选中，
        // 但 checkedKeys 数组中并不含子节点 key，直接保存会丢失子按钮权限。
        // 这里在初始化时就把子节点 key 展开进勾选集合，保证「所见即所得」。
        const owned = new Set(record.menuPermissions || []);
        const expandKeys = (nodes) => {
          nodes.forEach((node) => {
            if (owned.has(node.key)) {
              // 勾选父节点时级联勾选全部子孙
              const collectDescendants = (n) => {
                owned.add(n.key);
                (n.children || []).forEach(collectDescendants);
              };
              collectDescendants(node);
            }
            if (node.children && node.children.length > 0) expandKeys(node.children);
          });
        };
        expandKeys(tree);
        setCheckedKeys(Array.from(owned));
      }
    } catch {
      message.error('获取权限树失败');
    }
  };

  // 搜索时自动展开所有匹配节点（含祖先）；清空搜索时恢复全部展开
  useEffect(() => {
    if (!permModalVisible) return;
    if (searchKeyword.trim()) {
      const keys = [];
      const collect = (nodes) => {
        nodes.forEach((node) => {
          keys.push(node.key);
          if (node.children && node.children.length > 0) collect(node.children);
        });
      };
      collect(displayTree);
      setExpandedKeys(keys);
    } else {
      setExpandedKeys(allMenuKeys);
    }
  }, [searchKeyword, displayTree, allMenuKeys, permModalVisible]);

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
      // 保存时补全「部分勾选」的父级菜单：
      // 勾选菜单会级联勾选其下按钮权限；取消某个按钮后菜单变为半选，
      // 半选父菜单的 key 不在 checkedKeys 中，必须补回，否则会丢失整个菜单权限
      const checkedSet = new Set(checkedKeys);
      const saveSet = new Set(checkedKeys);
      const walk = (nodes) => {
        let any = false;
        (nodes || []).forEach((n) => {
          const childAny = n.children && n.children.length > 0 ? walk(n.children) : false;
          if (childAny || checkedSet.has(n.key)) {
            saveSet.add(n.key);
            any = true;
          }
        });
        return any;
      };
      walk(menuTree);
      await saveRolePermissionsApi(permRole.id, Array.from(saveSet));
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

  // 全选
  const handleSelectAll = () => {
    setCheckedKeys(allMenuKeys);
  };

  // 清空
  const handleDeselectAll = () => {
    if (permRole && permRole.roleKey === 'super_admin') {
      message.warning('超级管理员不能清空全部权限');
      return;
    }
    setCheckedKeys([]);
  };

  // 反选：已选与未选互换
  // 【坑】Tree 是级联模式：勾选父节点会级联勾选其全部子孙，且「半勾选」的父节点并不在 checkedKeys 里。
  // 若直接对 checkedKeys 取补集，半勾选的父节点会被算进反选集合，勾选后级联重新勾回其全部子孙，
  // 表现为「原本选中的选项反选后依然处于选中状态」。
  // 正确做法：以「实际勾选集合（checkedKeys + 级联子孙）」为基准取反，
  // 且只对「整个子树都未勾选」的节点执行勾选，避免级联误勾。
  const handleInvert = () => {
    if (!menuTree.length) return;
    // 1. 计算实际勾选集合：checkedKeys + 勾选节点级联勾选出的子孙
    const effective = new Set(checkedKeys);
    const expandDescendants = (nodes) => {
      nodes.forEach((node) => {
        if (effective.has(node.key) && node.children) {
          const collect = (list) => {
            list.forEach((child) => {
              effective.add(child.key);
              if (child.children) collect(child.children);
            });
          };
          collect(node.children);
        }
        if (node.children) expandDescendants(node.children);
      });
    };
    expandDescendants(menuTree);

    // 2. 对「整个子树都未勾选」的节点执行勾选，并补全其全部子孙
    //（与打开弹窗时的展开规则一致，保证保存时不会丢按钮权限）
    const newChecked = [];
    const subtreeAllUnchecked = (node) => {
      if (effective.has(node.key)) return false;
      return (node.children || []).every(subtreeAllUnchecked);
    };
    const collect = (nodes) => {
      nodes.forEach((node) => {
        if (subtreeAllUnchecked(node)) {
          const addSubtree = (list) => {
            list.forEach((child) => {
              newChecked.push(child.key);
              if (child.children) addSubtree(child.children);
            });
          };
          newChecked.push(node.key);
          if (node.children) addSubtree(node.children);
        } else if (node.children) {
          collect(node.children);
        }
      });
    };
    collect(menuTree);

    if (permRole && permRole.roleKey === 'super_admin' && newChecked.length === 0) {
      message.warning('超级管理员不能清空全部权限');
      return;
    }
    setCheckedKeys(newChecked);
  };

  // 展开/收起全部
  const handleExpandAll = () => setExpandedKeys(allMenuKeys);
  const handleCollapseAll = () => setExpandedKeys([]);

  const handleTableChange = (pag) => {
    setPagination((prev) => ({ ...prev, current: pag.current, pageSize: pag.pageSize }));
    void fetchData(pag.current, pag.pageSize);
  };

  const columns = useMemo(() => [
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
    ...(canRoleUpdate || canRolePermission || canRoleStatus || canRoleDelete ? [{
      title: '操作',
      key: 'action',
      width: 320,
      render: (_, record) => (
        <Space size="small">
          {canRoleUpdate && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
          )}
          {canRolePermission && (
            <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => handleAssignPerm(record)}>
              分配权限
            </Button>
          )}
          {canRoleStatus && (
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
          )}
          {canRoleDelete && (
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
          )}
        </Space>
      ),
    }] : []),
  ], [handleEdit, handleAssignPerm, handleToggleStatus, handleDelete, canRoleUpdate, canRolePermission, canRoleStatus, canRoleDelete]);

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
            {hasPermission('settings:role:add') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增角色
              </Button>
            )}
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
        width={620}
        destroyOnClose
      >
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索菜单名称"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            style={{ width: 190 }}
          />
          <span style={{ flex: 1 }} />
          <Space>
            <Button size="small" icon={<ExpandOutlined />} onClick={handleExpandAll}>展开</Button>
            <Button size="small" icon={<ShrinkOutlined />} onClick={handleCollapseAll}>收起</Button>
            <Button size="small" onClick={handleSelectAll}>全选</Button>
            <Button size="small" icon={<SwapOutlined />} onClick={handleInvert}>反选</Button>
            <Button size="small" onClick={handleDeselectAll}>清空</Button>
          </Space>
        </div>
        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-secondary, #8c8c8c)' }}>
          已选 {checkedCount} 项；搜索仅筛选菜单展示，不影响勾选结果。
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 6, padding: 12 }}>
          {displayTree.length > 0 ? (
            <Tree
              checkable
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              checkedKeys={checkedKeys}
              onCheck={handleCheck}
              treeData={displayTree}
              fieldNames={{ title: 'title', key: 'key', children: 'children' }}
              titleRender={(node) => (
                <span>
                  {node.title}
                  {node.type === 'button' && (
                    <Tag color="orange" style={{ marginLeft: 8, marginRight: 0, fontSize: 11, lineHeight: '16px', padding: '0 4px' }}>[按钮]</Tag>
                  )}
                </span>
              )}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到匹配的菜单" />
          )}
        </div>
      </Modal>
    </div>
  );
};

RoleManagement.routeConfig = { path: '/settings/roles', permission: 'settings' };
export default RoleManagement;