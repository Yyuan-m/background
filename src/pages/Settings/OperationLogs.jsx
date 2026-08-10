import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Tag, Input, Select, Row, Col, Button, Space, Dropdown } from 'antd';
import { message } from '@/utils/antdStatic';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileMarkdownOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { getOperationLogsApi, exportOperationLogsApi } from '@/api/modules/operation-log';
import useAuthStore from '@/store/useAuthStore';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';

const MODULE_OPTIONS = ['认证', '车辆管理', '订单管理', '财务管理', '售后工单', '权限管理', '系统设置', '营销活动', '租客管理', '文件上传'];

// 历史英文 module → 中文映射（兼容 AOP 改造前写入的英文数据）
const MODULE_MAP = {
  auth: '认证',
  car: '车辆管理', car_info: '车辆管理', car_maintenance: '车辆管理',
  car_document: '车辆管理', car_violation: '车辆管理', gps_track: '车辆管理',
  order: '订单管理', rental_order: '订单管理',
  customer: '租客管理',
  finance: '财务管理', statistics: '财务管理',
  after_sales_complaint: '售后工单', after_sales: '售后工单',
  coupon: '营销活动',
  user: '权限管理', role: '权限管理', menu: '权限管理',
  operation_log: '系统设置', dict: '系统设置', carousel: '系统设置',
  announcement: '系统设置', sys_config: '系统设置', theme: '系统设置', upload: '系统设置',
};

// 历史英文 action → 中文映射（兼容 AOP 改造前写入的英文数据）
const normalizeAction = (action) => {
  if (!action) return action;
  if (/[\u4e00-\u9fa5]/.test(action)) return action;
  const lower = action.toLowerCase();
  if (lower.includes('login') || lower.includes('logout')) return lower.includes('logout') ? '登出' : '登录';
  if (lower.includes('register')) return '注册';
  if (lower.includes('add') || lower.includes('create') || lower.includes('insert') || lower.includes('save')) return '新增';
  if (lower.includes('update') || lower.includes('edit') || lower.includes('modify') || lower.includes('change')) return '编辑';
  if (lower.includes('delete') || lower.includes('remove') || lower.includes('del')) return '删除';
  if (lower.includes('toggle') || lower.includes('disable') || lower.includes('enable')) return '切换状态';
  if (lower.includes('handle')) return '处理';
  if (lower.includes('reset')) return '重置';
  if (lower.includes('batch')) return '批量操作';
  if (lower.includes('import')) return '导入';
  if (lower.includes('export')) return '导出';
  if (lower.includes('upload')) return '上传';
  return action;
};

const normalizeModule = (mod) => {
  if (!mod) return mod;
  if (/[\u4e00-\u9fa5]/.test(mod)) return mod;
  return MODULE_MAP[mod.toLowerCase()] || mod;
};

// 历史英文权限码 → 中文描述兜底（兼容 AOP 改造前 description 存的是 "customer:list" 等权限码）
const normalizeDescription = (desc, module, action) => {
  if (!desc) return desc;
  if (/[\u4e00-\u9fa5]/.test(desc)) return desc;
  if (/^[a-z_]+(:[a-z_-]+)+$/i.test(desc)) {
    const parts = desc.split(':');
    const actionPart = parts[parts.length - 1];
    const modulePart = parts[0];
    const cnAction = normalizeAction(actionPart);
    const cnModule = normalizeModule(modulePart);
    return `${cnAction}${cnModule}`;
  }
  return desc;
};

// 导出格式下拉菜单选项
const FORMAT_OPTIONS = [
  { key: 'excel', label: 'Excel', icon: <FileExcelOutlined /> },
  { key: 'pdf', label: 'PDF', icon: <FilePdfOutlined /> },
  { key: 'markdown', label: 'Markdown', icon: <FileMarkdownOutlined /> },
];

const OperationLogs = () => {
  const { hasButtonPermission } = useAuthStore();
  const [keyword, setKeyword] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [exporting, setExporting] = useState(false);

  // 拉取数据：依赖 pagination 变化触发；筛选条件由「查询/重置」按钮通过重置页码触发
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getOperationLogsApi({
          page: pagination.page,
          pageSize: pagination.pageSize,
          operator: keyword || undefined,
          module: filterModule || undefined,
        });
        setData(res?.list || []);
        setTotal(res?.total || 0);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination]);

  // 重置到第一页以触发 useEffect 拉取（始终产生新对象引用以保证触发）
  const handleSearch = () => {
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleReset = () => {
    setKeyword('');
    setFilterModule('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleTableChange = (pag) => {
    setPagination({ page: pag.current, pageSize: pag.pageSize });
  };

  // 导出：scope = 'all' 导出全部（按当前筛选条件），scope = 'selected' 导出选中行
  const handleExport = async (format, scope) => {
    if (scope === 'selected' && selectedRowKeys.length === 0) {
      message.warning('请先勾选要导出的日志');
      return;
    }
    setExporting(true);
    try {
      await exportOperationLogsApi({
        format,
        // 导出选中：传 ids；导出全部：不传 ids，后端按筛选条件导出
        ...(scope === 'selected' ? { ids: selectedRowKeys.join(',') } : {}),
        ...(scope === 'all' ? {
          module: filterModule || undefined,
          operator: keyword || undefined,
        } : {}),
      });
    } finally {
      setExporting(false);
    }
  };

  // 构造下拉菜单项
  const buildExportMenu = (scope) => ({
    items: FORMAT_OPTIONS.map((opt) => ({
      key: opt.key,
      label: (
        <span>
          {opt.icon} {opt.label}
        </span>
      ),
      onClick: () => handleExport(opt.key, scope),
    })),
  });

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '操作人', dataIndex: 'operatorName', key: 'operatorName', width: 100, render: (v) => v || '-' },
    { title: '模块', dataIndex: 'module', key: 'module', width: 100, render: (v) => <Tag>{normalizeModule(v)}</Tag> },
    { title: '操作', dataIndex: 'action', key: 'action', width: 120, render: (v) => <Tag color="blue">{normalizeAction(v)}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true, render: (v, r) => normalizeDescription(v, r.module, r.action) },
    { title: 'IP', dataIndex: 'ip', key: 'ip', width: 130 },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180, render: formatTime.renderDatetime },
  ], []);

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    preserveSelectedRowKeys: true, // 翻页时保留选中状态
  };

  const hasSelected = selectedRowKeys.length > 0;

  // 清空选中的快捷操作（供「重置」按钮联动）
  const handleResetWithSelection = () => {
    setSelectedRowKeys([]);
    handleReset();
  };

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.operationLogs')}</h2>
      <Card className="" variant="borderless">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="搜索操作人"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="模块"
              value={filterModule || undefined}
              onChange={setFilterModule}
              allowClear
              style={{ width: '100%' }}
            >
              {MODULE_OPTIONS.map((m) => (
                <Select.Option key={m} value={m}>{m}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Space wrap>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={handleResetWithSelection}>重置</Button>
              {hasButtonPermission('settings', 'export') && (
                <>
                  <Dropdown.Button
                    type="default"
                    icon={<DownOutlined />}
                    menu={buildExportMenu('all')}
                    loading={exporting}
                    disabled={exporting}
                  >
                    <ExportOutlined /> 导出全部
                  </Dropdown.Button>
                  <Dropdown.Button
                    type="default"
                    icon={<DownOutlined />}
                    menu={buildExportMenu('selected')}
                    loading={exporting}
                    disabled={exporting || !hasSelected}
                  >
                    <ExportOutlined /> 导出选中{hasSelected ? `(${selectedRowKeys.length})` : ''}
                  </Dropdown.Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>
      <Card className="" variant="borderless">
        <div>
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            onChange={handleTableChange}
            rowSelection={rowSelection}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (t) => `共 ${t} 条`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
          />
        </div>
      </Card>
    </div>
  );
};

OperationLogs.routeConfig = { path: '/settings/logs', permission: 'settings' };
export default OperationLogs;
