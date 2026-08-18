import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Tag, Button, Modal, Popconfirm, Space, Select, Input,
  Row, Col, Image, Tooltip, Statistic, Segmented,
} from 'antd';
import { message } from '@/utils/antdStatic';
import {
  DeleteOutlined, ReloadOutlined, SearchOutlined, RestOutlined,
  EyeOutlined, PictureOutlined, FileOutlined, FilePdfOutlined,
  VideoCameraOutlined, CopyOutlined, UndoOutlined, DeleteFilled,
} from '@ant-design/icons';
import {
  getFileListApi,
  deleteFileApi,
  batchDeleteFileApi,
  physicalDeleteFileApi,
  batchPhysicalDeleteFileApi,
  restoreFileApi,
  batchRestoreFileApi,
} from '@/api/modules/file';
import { formatTime } from '@/utils/formatTime';
import { imageUrl } from '@/utils/imageUrl';

// 分类配置
const CATEGORY_OPTIONS = [
  { value: 'image', label: '图片' },
  { value: 'document', label: '文档' },
  { value: 'video', label: '视频' },
  { value: 'other', label: '其他' },
];

const CATEGORY_META = {
  image: { label: '图片', color: 'blue' },
  document: { label: '文档', color: 'green' },
  video: { label: '视频', color: 'purple' },
  other: { label: '其他', color: 'default' },
};

// 业务类型映射：英文 key → 中文标签 + 标签颜色
const BIZ_TYPE_META = {
  vehicle_image: { label: '车辆素材', color: 'gold' },
  vehicle_doc: { label: '车辆证件', color: 'cyan' },
  avatar: { label: '用户头像', color: 'magenta' },
  carousel_image: { label: '轮播图配置', color: 'orange' },
  document: { label: '通用文档', color: 'blue' },
  attachment: { label: '附件',     color: 'geekblue' },
  other: { label: '其他',     color: 'default' },
};

// 业务类型 → 中文（兜底：未命中的原值返回，无值返回 '-'）
const renderBizType = (v) => {
  if (!v) return '-';
  const meta = BIZ_TYPE_META[v];
  if (meta) return <Tag color={meta.color}>{meta.label}</Tag>;
  return <Tag>{v}</Tag>;
};

// 业务类型下拉选项
const BIZ_TYPE_OPTIONS = Object.entries(BIZ_TYPE_META).map(([value, m]) => ({ value, label: m.label }));

const STATUS_OPTIONS = [
  { value: 1, label: '正常' },
  { value: 0, label: '已删除' },
];

// 状态元数据：标签 + 颜色
const STATUS_META = {
  1: { label: '正常',   color: 'green' },
  0: { label: '已删除', color: 'red'   },
};

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

const isImage = (ext) => IMAGE_EXTS.includes(ext?.toLowerCase());

const getFileIcon = (ext) => {
  const e = ext?.toLowerCase();
  if (IMAGE_EXTS.includes(e)) return <PictureOutlined />;
  if (e === 'pdf') return <FilePdfOutlined />;
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(e)) return <VideoCameraOutlined />;
  return <FileOutlined />;
};

// 格式化文件大小
const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const FileManagement = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 12 });
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 筛选
  const [filters, setFilters] = useState({ originalName: '', category: undefined, bizType: '', status: 1 });
  const [filtersInput, setFiltersInput] = useState({ originalName: '', category: undefined, bizType: '', status: 1 });

  // 预览
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewName, setPreviewName] = useState('');

  // 统计
  const [stats, setStats] = useState({ image: 0, document: 0, video: 0, other: 0, total: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFileListApi({
        page: pagination.page,
        pageSize: pagination.pageSize,
        originalName: filters.originalName || undefined,
        category: filters.category,
        bizType: filters.bizType || undefined,
        status: filters.status,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (e) {
      message.error(e?.message || '获取文件列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  // 单独拉取各分类统计（并行请求 4 个分类 + 总数）
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const baseParams = { page: 1, pageSize: 1, status: 1 };
      const [img, doc, vid, oth] = await Promise.all([
        getFileListApi({ ...baseParams, category: 'image' }),
        getFileListApi({ ...baseParams, category: 'document' }),
        getFileListApi({ ...baseParams, category: 'video' }),
        getFileListApi({ ...baseParams, category: 'other' }),
      ]);
      setStats({
        image: img?.total || 0,
        document: doc?.total || 0,
        video: vid?.total || 0,
        other: oth?.total || 0,
        total: (img?.total || 0) + (doc?.total || 0) + (vid?.total || 0) + (oth?.total || 0),
      });
    } catch {
      /* 静默 */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => { void fetchStats(); }, [fetchStats]);

  const handleSearch = () => {
    setFilters(filtersInput);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleReset = () => {
    setFiltersInput({ originalName: '', category: undefined, bizType: '', status: 1 });
    setFilters({ originalName: '', category: undefined, bizType: '', status: 1 });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleRefresh = () => {
    setSelectedRowKeys([]);
    void fetchData();
    void fetchStats();
  };

  const handleTableChange = (pag) => {
    setPagination({ page: pag.current, pageSize: pag.pageSize });
  };

  // 列表删完最后一页时自动回退到上一页
  const gotoPrevPageIfNeed = (removedCount) => {
    if (data.length === removedCount && pagination.page > 1) {
      setPagination((p) => ({ ...p, page: p.page - 1 }));
    } else {
      void fetchData();
    }
  };

  /**
   * 单个删除：根据文件当前状态自动选择策略
   *  - 正常文件(status=1)：移入回收站（逻辑删除）
   *  - 回收站文件(status=0)：彻底删除（物理删除，不可恢复）
   */
  const handleDelete = async (record) => {
    try {
      if (record.status === 0) {
        await physicalDeleteFileApi(record.id);
      } else {
        await deleteFileApi(record.id);
      }
      gotoPrevPageIfNeed(1);
      void fetchStats();
    } catch (e) {
      message.error(e?.message || '删除失败');
    }
  };

  // 恢复文件（仅回收站可用）
  const handleRestore = async (id) => {
    try {
      await restoreFileApi(id);
      gotoPrevPageIfNeed(1);
      void fetchStats();
    } catch (e) {
      message.error(e?.message || '恢复失败');
    }
  };

  /**
   * 批量删除：按选中记录的 status 分组，分别调用对应接口
   *  - 正常文件(status=1) → 移入回收站（逻辑删除）
   *  - 回收站文件(status=0) → 彻底删除（物理删除，不可恢复）
   * 这样无论在哪个视图下批量选择都不会错调接口
   */
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    const selected = data.filter((r) => selectedRowKeys.includes(r.id));
    const normalIds = selected.filter((r) => r.status === 1).map((r) => r.id);
    const deletedIds = selected.filter((r) => r.status === 0).map((r) => r.id);
    try {
      const tasks = [];
      if (normalIds.length) tasks.push(batchDeleteFileApi(normalIds));
      if (deletedIds.length) tasks.push(batchPhysicalDeleteFileApi(deletedIds));
      await Promise.all(tasks);
      setSelectedRowKeys([]);
      // 若当前页记录全部被处理且不是第一页，回退一页；否则刷新当前页
      if (selected.length === data.length && pagination.page > 1) {
        setPagination((p) => ({ ...p, page: p.page - 1 }));
      } else {
        void fetchData();
      }
      void fetchStats();
    } catch (e) {
      message.error(e?.message || '批量删除失败');
    }
  };

  // 批量恢复
  const handleBatchRestore = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await batchRestoreFileApi(selectedRowKeys);
      setSelectedRowKeys([]);
      gotoPrevPageIfNeed(selectedRowKeys.length);
      void fetchStats();
    } catch (e) {
      message.error(e?.message || '批量恢复失败');
    }
  };

  // 预览
  const handlePreview = (record) => {
    if (isImage(record.extension)) {
      setPreviewUrl(record.url);
      setPreviewName(record.originalName);
      setPreviewOpen(true);
    } else {
      window.open(imageUrl(record.url), '_blank');
    }
  };

  // 复制链接：确保复制的是完整可访问地址（协议+IP+端口+路径）
  const handleCopyUrl = (url) => {
    let fullUrl = imageUrl(url);
    // 开发环境下 assetBaseUrl 可能为空，导致 imageUrl 返回相对路径，
    // 此时拼接当前页面 origin 兜底，保证复制出的是完整 URL
    if (fullUrl && !/^(https?:)?\/\//i.test(fullUrl) && !/^data:/i.test(fullUrl)) {
      fullUrl = window.location.origin + fullUrl;
    }
    const textarea = document.createElement('textarea');
    textarea.value = fullUrl;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      message.success('链接已复制');
    } catch {
      message.error('复制失败');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  // 快速分类筛选
  const handleCategoryStatClick = (category) => {
    const newFilters = { ...filtersInput, category };
    setFiltersInput(newFilters);
    setFilters(newFilters);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const columns = useMemo(() => [
    {
      title: '预览', dataIndex: 'url', key: 'preview', width: 72,
      render: (url, record) => (
        isImage(record.extension)
          ? <Image src={imageUrl(url)} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} />
          : <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--table-header-bg, #fafbfc)', borderRadius: 4, fontSize: 20 }}>{getFileIcon(record.extension)}</div>
      ),
    },
    {
      title: '文件名', dataIndex: 'originalName', key: 'originalName', ellipsis: true,
      render: (text, record) => (
        <Tooltip title={text}>
          <Space size={4}>
            {getFileIcon(record.extension)}
            <span style={{ cursor: 'pointer', color: 'var(--primary-color)' }} onClick={() => handlePreview(record)}>
              {text}
            </span>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '分类', dataIndex: 'category', key: 'category', width: 76,
      render: (cat) => {
        const meta = CATEGORY_META[cat] || CATEGORY_META.other;
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: '业务类型', dataIndex: 'bizType', key: 'bizType', width: 96, render: renderBizType },
    { title: '大小', dataIndex: 'size', key: 'size', width: 86, render: formatSize, align: 'right' },
    { title: '扩展名', dataIndex: 'extension', key: 'extension', width: 80, render: (ext) => ext ? <Tag>{ext.toUpperCase()}</Tag> : '-' },
    {
      title: '上传人', dataIndex: 'uploadedByName', key: 'uploadedByName', width: 90, ellipsis: true,
      render: (v) => v ? <Tooltip title={v}>{v}</Tooltip> : '-',
    },
    {
      title: '上传时间', dataIndex: 'createdAt', key: 'createdAt', width: 160,
      render: (v) => formatTime(v, 'YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 72,
      render: (status) => {
        const meta = STATUS_META[status] || { label: '-', color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 280, fixed: 'right',
      render: (_, record) => {
        const isDeleted = record.status === 0;
        return (
          <Space size={0} wrap={false}>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>预览</Button>
            <Tooltip title="复制链接">
              <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopyUrl(record.url)} />
            </Tooltip>
            {isDeleted && (
              <Popconfirm title="确认恢复此文件？" onConfirm={() => handleRestore(record.id)} okText="确认" cancelText="取消">
                <Button type="link" size="small" icon={<UndoOutlined />}>恢复</Button>
              </Popconfirm>
            )}
            <Popconfirm
              title={isDeleted ? '彻底删除？此操作不可恢复！' : '移入回收站？'}
              okText="确认" cancelText="取消"
              okButtonProps={isDeleted ? { danger: true } : undefined}
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger icon={isDeleted ? <DeleteFilled /> : <DeleteOutlined />}>
                {isDeleted ? '彻底删除' : '删除'}
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ], [data, pagination]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    preserveSelectedRowKeys: true,
  };

  const hasSelection = selectedRowKeys.length > 0;

  return (
    <div className="page-container">
      <h2 className="page-title">文件管理</h2>

      {/* 统计卡片区 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" hoverable onClick={() => handleCategoryStatClick(undefined)} loading={statsLoading}>
            <Statistic title="全部文件" value={stats.total} valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" hoverable onClick={() => handleCategoryStatClick('image')} loading={statsLoading}>
            <Statistic title="图片" value={stats.image} prefix={<PictureOutlined style={{ color: '#1677ff' }} />} valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" hoverable onClick={() => handleCategoryStatClick('document')} loading={statsLoading}>
            <Statistic title="文档" value={stats.document} prefix={<FileOutlined style={{ color: '#52c41a' }} />} valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" hoverable onClick={() => handleCategoryStatClick('video')} loading={statsLoading}>
            <Statistic title="视频" value={stats.video} prefix={<VideoCameraOutlined style={{ color: '#722ed1' }} />} valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" hoverable onClick={() => handleCategoryStatClick('other')} loading={statsLoading}>
            <Statistic title="其他" value={stats.other} prefix={<FileOutlined style={{ color: '#8c8c8c' }} />} valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
      </Row>

      {/* 筛选区 */}
      <Card variant="borderless" style={{ marginBottom: 12 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="文件名（模糊查询）"
              value={filtersInput.originalName}
              onChange={(e) => setFiltersInput({ ...filtersInput, originalName: e.target.value })}
              onPressEnter={handleSearch}
              allowClear
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="文件分类"
              value={filtersInput.category}
              onChange={(v) => setFiltersInput({ ...filtersInput, category: v })}
              allowClear
              options={CATEGORY_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="业务类型"
              value={filtersInput.bizType || undefined}
              onChange={(v) => setFiltersInput({ ...filtersInput, bizType: v })}
              allowClear
              options={BIZ_TYPE_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="状态"
              value={filtersInput.status}
              onChange={(v) => setFiltersInput({ ...filtersInput, status: v })}
              allowClear
              options={STATUS_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={24} md={4}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
              <Button icon={<RestOutlined />} onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 列表区 */}
      <Card variant="borderless">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>刷新</Button>
            {hasSelection && filters.status === 1 && (
              <Popconfirm
                title={`确认将选中的 ${selectedRowKeys.length} 个文件移入回收站？`}
                onConfirm={handleBatchDelete}
                okText="确认" cancelText="取消"
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量删除 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}
            {hasSelection && filters.status === 0 && (
              <>
                <Popconfirm
                  title={`确认恢复选中的 ${selectedRowKeys.length} 个文件？`}
                  onConfirm={handleBatchRestore}
                  okText="确认" cancelText="取消"
                >
                  <Button type="primary" icon={<UndoOutlined />}>
                    批量恢复 ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title={`确认彻底删除选中的 ${selectedRowKeys.length} 个文件？此操作不可恢复！`}
                  onConfirm={handleBatchDelete}
                  okText="确认" cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteFilled />}>
                    批量彻底删除 ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
          {hasSelection && (
            <span style={{ color: 'var(--primary-color)' }}>已选中 {selectedRowKeys.length} 项</span>
          )}
        </div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (count) => `共 ${count} 个文件`,
            pageSizeOptions: ['12', '20', '50', '100'],
          }}
        />
      </Card>

      {/* 图片预览弹窗 */}
      <Modal
        title={previewName}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <div style={{ textAlign: 'center' }}>
          <Image src={imageUrl(previewUrl)} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
        </div>
      </Modal>
    </div>
  );
};

FileManagement.routeConfig = { path: '/settings/files', permission: 'system:file' };
export default FileManagement;
