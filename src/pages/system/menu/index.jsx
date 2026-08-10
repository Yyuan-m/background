import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, InputNumber,
  Switch, Popconfirm, Spin, Tooltip, TreeSelect, Row, Col, Radio,
} from 'antd';
import { message } from '@/utils/antdStatic';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  ExpandAltOutlined, ShrinkOutlined, FolderOutlined, FileOutlined,
  EyeOutlined, EyeInvisibleOutlined,
} from '@ant-design/icons';

import {
  getMenuListApi, addMenuApi, updateMenuApi, deleteMenuApi, toggleMenuStatusApi,
} from '@/api/modules/menu';
import useAppStore from '@/store/useAppStore';
import IconPicker, { renderIcon } from '@/components/IconPicker';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';

const buildMenuTree = (list) => {
  if (!Array.isArray(list)) return [];
  const map = {};
  const tree = [];
  list.forEach((item) => { map[item.id] = { ...item, children: [] }; });
  list.forEach((item) => {
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(map[item.id]);
    } else {
      tree.push(map[item.id]);
    }
  });
  const cleanAndSort = (nodes) => {
    nodes.sort((a, b) => a.sort - b.sort);
    nodes.forEach((node) => {
      if (node.children.length === 0) delete node.children;
      else cleanAndSort(node.children);
    });
  };
  cleanAndSort(tree);
  return tree;
};

// 菜单类型常量
const MenuType = { DIRECTORY: 'directory', MENU: 'menu', BUTTON: 'button' };
const menuTypeOptions = [
  { label: '目录', value: MenuType.DIRECTORY },
  { label: '菜单', value: MenuType.MENU },
  { label: '按钮', value: MenuType.BUTTON },
];

// 把扁平菜单数据转换为 TreeSelect 需要的树结构
const buildTreeSelectData = (list, excludeId = null) => {
  if (!Array.isArray(list)) return [];
  const tree = buildMenuTree(list);
  const map = (nodes) => nodes
    .filter((n) => n.id !== excludeId && n.type !== MenuType.BUTTON)
    .map((n) => ({
      value: n.id,
      title: n.name,
      selectable: n.type !== MenuType.BUTTON,
      children: n.children ? map(n.children) : undefined,
    }));
  return map(tree);
};

const MenuManagement = () => {
  const [loading, setLoading] = useState(false);
  const [menuData, setMenuData] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingMenu, setEditingMenu] = useState(null);
  const [parentMenuId, setParentMenuId] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMenuListApi();
      const safeList = Array.isArray(list) ? list : [];
      setMenuData(safeList);
      // 用已获取的数据直接更新侧边栏，避免再发重复请求被去重机制取消
      useAppStore.getState().setMenuTreeFromList(safeList);
    } catch {
      /* request.js 已统一提示 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const treeData = useMemo(() => buildMenuTree(menuData), [menuData]);

  const handleExpandAll = () => setExpandedRowKeys(menuData.map((m) => m.id));
  const handleCollapseAll = () => setExpandedRowKeys([]);

  const handleRefresh = () => {
    void fetchData();
  };

  const handleAdd = (parentId = null) => {
    setEditingMenu(null);
    setParentMenuId(parentId);
    const parent = parentId ? menuData.find((m) => m.id === parentId) : null;
    setModalTitle(parent ? `新增子菜单 - ${parent.name}` : '新增顶级菜单');
    form.resetFields();
    form.setFieldsValue({
      parentId: parentId || null,
      type: MenuType.MENU,
      name: '',
      icon: '',
      path: '',
      component: '',
      permission: '',
      redirect: '',
      sort: 1,
      status: 1,
      visible: 1,
      isFrame: 0,
      keepAlive: 1,
      affix: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingMenu(record);
    setParentMenuId(null);
    setModalTitle('编辑菜单');
    form.setFieldsValue({
      parentId: record.parentId || null,
      type: record.type || MenuType.MENU,
      name: record.name,
      icon: record.icon || '',
      path: record.path || '',
      component: record.component || '',
      permission: record.permission || '',
      redirect: record.redirect || '',
      sort: record.sort ?? 1,
      status: record.status ?? 1,
      visible: record.visible ?? 1,
      isFrame: record.isFrame ?? 0,
      keepAlive: record.keepAlive ?? 1,
      affix: record.affix ?? 0,
    });
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingMenu) {
        await updateMenuApi({ id: editingMenu.id, ...values });
        message.success('菜单更新成功');
      } else {
        await addMenuApi(values);
        message.success('菜单创建成功');
      }
      setModalVisible(false);
      void fetchData();
    } catch (e) {
      if (e.errorFields) return;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteMenuApi(record.id);
      message.success('菜单删除成功');
      void fetchData();
    } catch (e) {
      void fetchData();
    }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === 1 ? 0 : 1;
    try {
      await toggleMenuStatusApi(record.id, newStatus);
      message.success(newStatus === 1 ? '菜单已启用' : '菜单已禁用');
      void fetchData();
    } catch (e) {
      /* request.js 已统一提示 */
    }
  };

  // 类型 → 颜色/标签/图标 映射
  const typeMeta = {
    [MenuType.DIRECTORY]: { color: 'blue', label: '目录', icon: <FolderOutlined /> },
    [MenuType.MENU]: { color: 'cyan', label: '菜单', icon: <FileOutlined /> },
    [MenuType.BUTTON]: { color: 'orange', label: '按钮', icon: <FileOutlined /> },
  };

  const columns = [
    {
      title: '菜单名称', dataIndex: 'name', key: 'name', width: 220,
      render: (text, record) => (
        <Space>
          {renderIcon(record.icon, { style: { fontSize: 16, color: 'var(--primary-color, #3b82f6)' } })
            || (typeMeta[record.type]?.icon || <FileOutlined />)}
          <span style={{ fontWeight: record.parentId ? 400 : 600 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '图标', dataIndex: 'icon', key: 'icon', width: 70, align: 'center',
      render: (icon) => icon
        ? <Tooltip title={icon}>{renderIcon(icon, { style: { fontSize: 18, color: 'var(--primary-color, #3b82f6)' } })}</Tooltip>
        : <span style={{ color: 'var(--text-secondary, #64748b)' }}>-</span>,
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 90, align: 'center',
      render: (type) => {
        const meta = typeMeta[type] || typeMeta[MenuType.MENU];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: '路由地址', dataIndex: 'path', key: 'path', width: 180, ellipsis: true },
    {
      title: '组件路径', dataIndex: 'component', key: 'component', width: 180, ellipsis: true,
      render: (text) => text
        ? <code style={{ background: 'var(--table-header-bg, #fafbfc)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{text}</code>
        : <span style={{ color: 'var(--text-secondary, #64748b)' }}>-</span>,
    },
    {
      title: '权限标识', dataIndex: 'permission', key: 'permission', width: 160,
      render: (text) => text
        ? <code style={{ background: 'var(--table-header-bg, #fafbfc)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{text}</code>
        : '-',
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 70, align: 'center' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80, align: 'center',
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'default'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '显示', dataIndex: 'visible', key: 'visible', width: 80, align: 'center',
      render: (visible) => visible === 1
        ? <Tooltip title="侧边栏显示"><EyeOutlined style={{ color: 'var(--success-color, #10b981)' }} /></Tooltip>
        : <Tooltip title="侧边栏隐藏"><EyeInvisibleOutlined style={{ color: 'var(--text-secondary, #64748b)' }} /></Tooltip>,
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: formatTime.render },
    {
      title: '操作', key: 'action', width: 260, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<PlusOutlined />}
            onClick={() => handleAdd(record.id)}
            disabled={record.type === MenuType.BUTTON}>
            新增子菜单
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title={record.status === 1 ? '确定要禁用该菜单吗？' : '确定要启用该菜单吗？'}
            onConfirm={() => handleToggleStatus(record)}
            okText="确定" cancelText="取消" disabled={record.isCore}
          >
            <Button type="link" size="small" disabled={record.isCore}
              style={{ color: record.isCore ? undefined : (record.status === 1 ? 'var(--warning-color)' : 'var(--success-color)') }}>
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定要删除该菜单吗？"
            description={record.isCore ? '核心菜单不可删除' : '删除后不可恢复'}
            onConfirm={() => handleDelete(record)}
            okText="确定" cancelText="取消" disabled={record.isCore}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={record.isCore}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 上级菜单 TreeSelect 数据：编辑时排除自身避免循环引用
  const treeSelectData = useMemo(
    () => buildTreeSelectData(menuData, editingMenu?.id),
    [menuData, editingMenu],
  );

  // 监听表单字段实现联动
  const watchType = Form.useWatch('type', form);
  const watchIsFrame = Form.useWatch('isFrame', form);
  const isButton = watchType === MenuType.BUTTON;
  const isDirectory = watchType === MenuType.DIRECTORY;
  const isFrame = watchIsFrame === 1;

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.menus')}</h2>

      <Card className="" variant="borderless">
        <Space>
          <Button className="btn-refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
          <Button icon={<ExpandAltOutlined />} onClick={handleExpandAll}>
            展开全部
          </Button>
          <Button icon={<ShrinkOutlined />} onClick={handleCollapseAll}>
            收起全部
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(null)}>
            新增顶级菜单
          </Button>
        </Space>
      </Card>

      <Card className="" variant="borderless">
        <Spin spinning={loading}>
          <div>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={treeData}
              pagination={false}
              expandable={{
                expandedRowKeys,
                onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
                defaultExpandAllRows: true,
              }}
              scroll={{ x: 1700 }}
              size="middle"
            />
          </div>
        </Spin>
      </Card>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        width={760}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="parentId" label="上级菜单">
                <TreeSelect
                  placeholder="留空为顶级菜单"
                  allowClear
                  treeData={treeSelectData}
                  treeDefaultExpandAll
                  disabled={!!parentMenuId}
                  showSearch
                  treeNodeFilterProp="title"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="菜单类型" rules={[{ required: true, message: '请选择菜单类型' }]}>
                <Radio.Group options={menuTypeOptions} optionType="button" buttonStyle="solid" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="菜单名称"
                rules={[{ required: true, message: '请输入菜单名称' }]}>
                <Input placeholder={isButton ? '如：新增车辆按钮' : '如：数据仪表盘、车辆管理'} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sort" label="排序序号"
                tooltip="数字越小越靠前">
                <InputNumber min={0} max={9999} style={{ width: '100%' }} placeholder="数字越小越靠前" />
              </Form.Item>
            </Col>
          </Row>

          {!isButton && (
            <Form.Item name="icon" label="菜单图标"
              tooltip="点击右侧框打开图标选择面板，支持搜索">
              <IconPicker placeholder="请选择菜单图标" />
            </Form.Item>
          )}

          {!isButton && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="path" label={isFrame ? '外链地址' : '路由地址'}
                  rules={[
                    { required: true, message: isFrame ? '请输入外链地址' : '请输入路由地址' },
                    ...(isFrame
                      ? [{ pattern: /^https?:\/\//, message: '外链必须以 http:// 或 https:// 开头' }]
                      : [{ pattern: /^\//, message: '路由地址必须以 / 开头' }]
                    ),
                  ]}>
                  <Input placeholder={isFrame ? '如：https://ant.design' : '如：/vehicles、/settings/menus'} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="component" label="组件路径"
                  tooltip="pages 目录下的相对路径，仅菜单类型需要">
                  <Input placeholder="如：Vehicle/VehicleList" disabled={isDirectory} />
                </Form.Item>
              </Col>
            </Row>
          )}

          {!isButton && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="redirect" label="重定向地址"
                  tooltip="目录类型访问时自动跳转的子菜单路径">
                  <Input placeholder="如：/dashboard/index" disabled={!isDirectory} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="permission" label="权限标识"
                  rules={[{ pattern: /^[a-zA-Z_][a-zA-Z0-9_:]*$/, message: '仅支持英文、数字、下划线和冒号' }]}>
                  <Input placeholder="如：vehicle、settings:menus" />
                </Form.Item>
              </Col>
            </Row>
          )}

          {isButton && (
            <Form.Item name="permission" label="权限标识"
              rules={[
                { required: true, message: '按钮类型必须填写权限标识' },
                { pattern: /^[a-zA-Z_][a-zA-Z0-9_:]*$/, message: '仅支持英文、数字、下划线和冒号' },
              ]}>
              <Input placeholder="如：vehicle:add、vehicle:delete" />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="status" label="状态" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
            {!isButton && (
              <Col span={6}>
                <Form.Item name="visible" label="侧边栏显示" valuePropName="checked"
                  tooltip="关闭后菜单不在侧边栏显示，但仍可通过路由访问">
                  <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
                </Form.Item>
              </Col>
            )}
            {!isButton && (
              <Col span={6}>
                <Form.Item name="isFrame" label="是否外链" valuePropName="checked">
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>
              </Col>
            )}
            {watchType === MenuType.MENU && (
              <Col span={6}>
                <Form.Item name="keepAlive" label="缓存页面" valuePropName="checked"
                  tooltip="开启后切换菜单时保留页面状态">
                  <Switch checkedChildren="缓存" unCheckedChildren="不缓存" />
                </Form.Item>
              </Col>
            )}
          </Row>

          {watchType === MenuType.MENU && (
            <Form.Item name="affix" label="固定标签页" valuePropName="checked"
              tooltip="开启后该菜单的标签页会被固定，不可关闭">
              <Switch checkedChildren="固定" unCheckedChildren="不固定" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

MenuManagement.routeConfig = { path: '/settings/menus', permission: 'settings' };
export default MenuManagement;
