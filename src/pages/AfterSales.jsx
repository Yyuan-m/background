import { useState, useMemo, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Row, Col, Statistic, Image, Descriptions } from 'antd';
import { ToolOutlined, CheckCircleOutlined, CloseCircleOutlined, PlayCircleFilled, FileTextOutlined, CarOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAfterSalesListApi, handleAfterSalesApi, getAfterSalesVehicleApi, startProcessingAfterSalesApi, updateAfterSalesPriorityApi } from '@/api/modules/after-sales';
import { t } from '@/i18n';
import { formatTime } from '@/utils/formatTime';
import { getChartColor } from '@/utils/chartColors';
import { customerImageUrl, imageUrl } from '@/utils/imageUrl';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useAuthStore from '@/store/useAuthStore';

const statusColorMap = { pending: 'default', processing: 'processing', resolved: 'success', rejected: 'error' };
const typeColorMap = { service: 'orange', vehicle: 'red', billing: 'gold', damage: 'volcano', other: 'blue' };
const priorityColorMap = { urgent: 'red', high: 'orange', normal: 'blue', low: 'default' };

/** 支持的媒体扩展名（与后端上传白名单保持一致） */
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const VIDEO_EXTS = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];

/** 解析投诉凭证（JSON数组字符串，兼容逗号分隔脏数据） */
function parseImages(images) {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return images.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

/** 根据 URL 扩展名判断媒体类型：image / video / file */
function getMediaType(url) {
  const clean = (url || '').split('?')[0].toLowerCase();
  const ext = clean.includes('.') ? clean.split('.').pop() : '';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  return 'file';
}

/** 从 URL 提取文件名（用于文件/视频的展示名） */
function getFileName(url) {
  const name = (url || '').split('/').pop() || '';
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/** 饼图角度 → 弧度 */
const RADIAN = Math.PI / 180;

/** 饼图扇区中心百分比标签：名称走图例，重量太小不渲染，避免文字与扇区/顶部底部互相遮挡 */
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) {
  if (!value || !percent || percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text className="recharts-text" x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

const AfterSales = () => {
  const { hasPermission } = useAuthStore();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [mode, setMode] = useState('handle'); // 'handle' | 'view'
  const [currentComplaint, setCurrentComplaint] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null); // { url, type }
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleTicketNo, setVehicleTicketNo] = useState('');
  const [form] = Form.useForm();

  const { options: complaintTypeOptions, map: complaintTypeMap } = useDict('complaint_type');
  const { map: complaintStatusMap } = useDict('complaint_status');
  const { map: priorityMap } = useDict('complaint_priority');

  // 拉取后端数据（pageSize=1000 拉全部，前端 Table 客户端分页）
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAfterSalesListApi({ page: 1, pageSize: 1000, status: filterStatus || undefined, priority: filterPriority || undefined });
      setData(res?.list || []);
    } catch (e) {
      console.error('获取售后工单列表失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus, filterPriority]);

  // 预计算统计数据，避免 render 中重复 filter
  const stats = useMemo(() => {
    const pending = data.filter((c) => c.status === 'pending').length;
    const processing = data.filter((c) => c.status === 'processing').length;
    const resolved = data.filter((c) => c.status === 'resolved').length;
    const rated = data.filter((c) => c.satisfaction > 0);
    const avgSatisfaction = rated.length > 0
      ? (rated.reduce((s, c) => s + c.satisfaction, 0) / rated.length).toFixed(1)
      : '-';
    return { pending, processing, resolved, avgSatisfaction };
  }, [data]);

  // 满意度统计
  const satisfactionData = useMemo(() => [
    { name: '5星', value: data.filter((c) => c.satisfaction === 5).length, color: '#10b981' },
    { name: '4星', value: data.filter((c) => c.satisfaction === 4).length, color: '#c9a96e' },
    { name: '3星', value: data.filter((c) => c.satisfaction === 3).length, color: '#f59e0b' },
    { name: '2星', value: data.filter((c) => c.satisfaction === 2).length, color: '#ef4444' },
    { name: '1星', value: data.filter((c) => c.satisfaction === 1).length, color: '#dc2626' },
    { name: '未评分', value: data.filter((c) => c.satisfaction === 0).length, color: '#94a3b8' },
  ].filter((d) => d.value > 0), [data]);

  // 投诉类型统计
  const typeData = useMemo(() =>
    complaintTypeOptions.map((t) => ({
      name: t.label,
      value: data.filter((c) => c.type === t.value).length,
      color: typeColorMap[t.value] || 'default',
    })).filter((d) => d.value > 0),
  [data, complaintTypeOptions]);

  // 打开详情/处理弹窗：已解决/已驳回的工单只读展示详情，其余进入处理模式
  // 进入处理前先把「待处理」置为「处理中」，让客户端感知工单在处理
  const openDetail = async (record) => {
    form.setFieldsValue({ solution: record.solution || '' });
    const done = record.status === 'resolved' || record.status === 'rejected';
    if (!done && record.status !== 'processing') {
      try {
        await startProcessingAfterSalesApi(record.id);
        fetchData(); // 列表同步显示为“处理中”
      } catch (e) {
        console.error('开始处理失败:', e);
      }
    }
    setCurrentComplaint({ ...record, status: done ? record.status : 'processing' });
    setMode(done ? 'view' : 'handle');
    setDetailVisible(true);
  };

  const closeDetail = () => {
    setDetailVisible(false);
    form.resetFields();
  };

  const handleResolve = async () => {
    if (!currentComplaint) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      // handleAfterSalesApi 已封装 successMsg='工单处理完成'；处理人由后端记录当前登录操作人
      await handleAfterSalesApi(currentComplaint.id, {
        status: 'resolved',
        solution: values.solution || '',
      });
      closeDetail();
      fetchData();
    } catch (e) {
      console.error('工单处理失败:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentComplaint) return;
    try {
      const values = await form.validateFields().catch(() => ({}));
      setSubmitting(true);
      // 处理人由后端记录当前登录操作人
      await handleAfterSalesApi(currentComplaint.id, {
        status: 'rejected',
        solution: values?.solution || '',
      });
      closeDetail();
      fetchData();
    } catch (e) {
      console.error('工单驳回失败:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // 快捷修改优先级
  const handlePriorityChange = async (record, value) => {
    if (!value || value === record.priority) return;
    try {
      await updateAfterSalesPriorityApi(record.id, value);
      fetchData();
    } catch (e) {
      console.error('修改优先级失败:', e);
    }
  };

  // 打开关联车辆详情弹窗
  const openVehicle = async (record) => {
    setVehicleOpen(true);
    setVehicleTicketNo(record.ticketNo || '');
    setVehicleInfo(null);
    setVehicleLoading(true);
    try {
      const res = await getAfterSalesVehicleApi(record.id);
      setVehicleInfo(res || null);
    } catch (e) {
      console.error('获取关联车辆详情失败:', e);
      setVehicleInfo(null);
    } finally {
      setVehicleLoading(false);
    }
  };

  // 表格单元格中的凭证缩略图（图片用 antd 预览，视频/文件点击打开预览弹窗）
  const renderMediaCell = (imgs) => {
    const items = parseImages(imgs);
    if (!items.length) return '-';
    const imageItems = items.filter((u) => getMediaType(u) === 'image');
    const otherItems = items.filter((u) => getMediaType(u) !== 'image').slice(0, 2);
    const total = items.length;
    return (
      <Space size={4} wrap>
        {imageItems.length > 0 && (
          <Image.PreviewGroup>
            <Space size={4} wrap>
              {imageItems.slice(0, 4).map((url, i) => (
                <Image key={i} src={customerImageUrl(url)} width={28} height={28}
                  style={{ borderRadius: 4, objectFit: 'cover' }} preview={{ src: customerImageUrl(url) }} />
              ))}
            </Space>
          </Image.PreviewGroup>
        )}
        {otherItems.map((url, i) => {
          const type = getMediaType(url);
          return (
            <span key={i} onClick={() => setMediaPreview({ url, type })} title={getFileName(url)}
              style={{ width: 28, height: 28, borderRadius: 4, cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', background: type === 'video' ? '#0b0f19' : '#f0f2f5' }}>
              {type === 'video'
                ? <PlayCircleFilled style={{ fontSize: 16, color: '#fff' }} />
                : <FileTextOutlined style={{ fontSize: 14, color: '#555' }} />}
            </span>
          );
        })}
        {total > 4 && <span style={{ fontSize: 12, color: '#999' }}>+{total - imageItems.slice(0, 4).length}</span>}
      </Space>
    );
  };

  const columns = useMemo(() => [
    { title: '工单号', dataIndex: 'ticketNo', key: 'ticketNo', width: 150 },
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 120 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 90 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (v) => <Tag color={typeColorMap[v] || 'default'}>{complaintTypeMap[v]?.label || v}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 120,
      render: (v, record) => hasPermission('after_sales:complaint:update') ? (
        <DictSelect dictType="complaint_priority" value={v} onChange={(val) => handlePriorityChange(record, val)}
          size="small" allowClear={false} showSearch={false} style={{ minWidth: 96, width: 96 }} />
      ) : <Tag color={priorityColorMap[v] || 'default'}>{priorityMap[v]?.label || v}</Tag>,
    },
    { title: '关联车辆', dataIndex: 'vehicleName', key: 'vehicleName', width: 160,
      render: (v, record) => {
        if (!v && !record.plateNumber) return '-';
        return (
          <Space size={6}>
            {record.vehicleCover ? (
              <Image src={imageUrl(record.vehicleCover)} width={36} height={28}
                style={{ objectFit: 'cover', borderRadius: 4 }} preview={false} />
            ) : <CarOutlined style={{ fontSize: 16, color: '#999', width: 36, textAlign: 'center' }} />}
            <span>
              <div style={{ lineHeight: 1.3 }}>{v || '未知车型'}</div>
              {record.plateNumber && <div style={{ fontSize: 12, color: '#888' }}>{record.plateNumber}</div>}
            </span>
          </Space>
        );
      },
    },
    { title: '处理人', dataIndex: 'assignee', key: 'assignee', width: 100,
      render: (v) => v || '-' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (s) => <Tag color={statusColorMap[s] || 'default'}>{complaintStatusMap[s]?.label || s}</Tag> },
    { title: '满意度', dataIndex: 'satisfaction', key: 'satisfaction', width: 95, render: (v) => v > 0 ? `${'★'.repeat(v)}${'☆'.repeat(5 - v)}` : '-' },
    { title: '凭证', dataIndex: 'images', key: 'images', width: 140, render: (v) => renderMediaCell(v) },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: (v) => formatTime.renderFull(v) },
    { title: '处理时间', dataIndex: 'resolvedAt', key: 'resolvedAt', width: 150, render: (v) => (v ? formatTime.renderFull(v) : '-') },
    ...(hasPermission('after_sales:complaint:handle') ? [{
      title: '操作', key: 'action', width: 140, fixed: 'right', render: (_, record) => {
        const done = record.status === 'resolved' || record.status === 'rejected';
        return (
          <Space size={0}>
            <Button type="link" size="small" onClick={() => openDetail(record)}>{done ? '详情' : '处理'}</Button>
            <Button type="link" size="small" icon={<CarOutlined />} onClick={() => openVehicle(record)}>关联车辆</Button>
          </Space>
        );
      },
    }] : []),
  ], [complaintTypeMap, complaintStatusMap, priorityMap, hasPermission, renderMediaCell]);

  const mediaItems = currentComplaint ? parseImages(currentComplaint.images) : [];

  return (
    <div className="page-container">
      <h2 className="page-title">{t('pageTitle.afterSales')}</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="待处理" value={stats.pending} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="处理中" value={stats.processing} valueStyle={{ color: '#3b82f6' }} /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="已解决" value={stats.resolved} valueStyle={{ color: '#10b981' }} /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless"><Statistic title="平均满意度" value={stats.avgSatisfaction} suffix="分" valueStyle={{ color: '#c9a96e' }} /></Card></Col>
      </Row>

      {/* 满意度与投诉类型统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title="满意度分布" variant="borderless">
            {satisfactionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={satisfactionData} cx="50%" cy="50%" innerRadius={52} outerRadius={92} paddingAngle={2} dataKey="value" nameKey="name" label={renderPieLabel} labelLine={false}>
                    {satisfactionData.map((d, i) => <Cell key={i} fill={getChartColor(i, d.color)} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted, #999)' }}>暂无评分数据</div>}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="投诉类型分布" variant="borderless">
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={52} outerRadius={92} paddingAngle={2} dataKey="value" nameKey="name" label={renderPieLabel} labelLine={false}>
                    {typeData.map((d, i) => <Cell key={i} fill={getChartColor(i, d.color)} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted, #999)' }}>暂无数据</div>}
          </Card>
        </Col>
      </Row>

      <Card variant="borderless"
        extra={<Space wrap>
          <DictSelect dictType="complaint_status" placeholder="筛选状态" value={filterStatus || undefined} onChange={setFilterStatus} allowClear style={{ width: 140 }} />
          <DictSelect dictType="complaint_priority" placeholder="筛选优先级" value={filterPriority || undefined} onChange={setFilterPriority} allowClear style={{ width: 140 }} />
        </Space>}>
        <div>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 10,
          }} />
        </div>
      </Card>

      {/* 工单处理 / 详情 弹窗 */}
      <Modal
        title={<span><ToolOutlined /> {mode === 'handle' ? '工单处理' : '工单详情'}</span>}
        open={detailVisible}
        onCancel={closeDetail}
        width={680}
        footer={mode === 'handle' ? [
          <Button key="reject" danger icon={<CloseCircleOutlined />} onClick={handleReject} loading={submitting}>驳回</Button>,
          <Button key="resolve" type="primary" icon={<CheckCircleOutlined />} onClick={handleResolve} loading={submitting}>标记已解决</Button>,
        ] : null}>
        {currentComplaint && (
          <div>
            <div style={{ marginBottom: 4 }}>
              <Space>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{currentComplaint.ticketNo}</span>
                <Tag color={statusColorMap[currentComplaint.status] || 'default'}>{complaintStatusMap[currentComplaint.status]?.label || currentComplaint.status}</Tag>
              </Space>
            </div>
            <Descriptions size="small" bordered column={2} style={{ marginTop: 12 }}>
              <Descriptions.Item label="类型">
                <Tag color={typeColorMap[currentComplaint.type] || 'default'}>{complaintTypeMap[currentComplaint.type]?.label || currentComplaint.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={priorityColorMap[currentComplaint.priority] || 'default'}>{priorityMap[currentComplaint.priority]?.label || currentComplaint.priority}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="客户">{currentComplaint.customerName || '-'}</Descriptions.Item>
              <Descriptions.Item label="订单号">{currentComplaint.orderNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="处理人">{currentComplaint.assignee || '-'}</Descriptions.Item>
              <Descriptions.Item label="处理时间">{currentComplaint.resolvedAt ? formatTime.renderFull(currentComplaint.resolvedAt) : '-'}</Descriptions.Item>
              <Descriptions.Item label="满意度" span={2}>
                {currentComplaint.satisfaction > 0
                  ? `${'★'.repeat(currentComplaint.satisfaction)}${'☆'.repeat(5 - currentComplaint.satisfaction)}（${currentComplaint.satisfaction}分）`
                  : '未评分'}
              </Descriptions.Item>
              <Descriptions.Item label="投诉描述" span={2}>{currentComplaint.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="处理方案" span={2}>{mode === 'view' ? (currentComplaint.solution || '-') : '（处理完成后填写）'}</Descriptions.Item>
            </Descriptions>

            {mediaItems.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600 }}>投诉凭证（{mediaItems.length}）</div>
                <Space size={10} wrap>
                  {mediaItems.map((url, i) => {
                    const type = getMediaType(url);
                    const src = customerImageUrl(url);
                    if (type === 'image') {
                      return <Image key={i} src={src} width={88} height={88} style={{ borderRadius: 8, objectFit: 'cover' }} preview={{ src }} />;
                    }
                    if (type === 'video') {
                      return (
                        <div key={i} onClick={() => setMediaPreview({ url, type })} title="点击播放视频"
                          style={{ width: 150, height: 88, borderRadius: 8, background: '#0b0f19', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <PlayCircleFilled style={{ fontSize: 30, color: '#fff' }} />
                          <span style={{ color: '#fff', fontSize: 12, marginLeft: 6 }}>{getFileName(url)}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={i} onClick={() => setMediaPreview({ url, type })} title={`点击查看/下载 ${getFileName(url)}`}
                        style={{ width: 150, height: 88, borderRadius: 8, background: '#f0f2f5', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <FileTextOutlined style={{ fontSize: 26, color: '#555' }} />
                        <span style={{ fontSize: 12, color: '#333', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getFileName(url)}</span>
                      </div>
                    );
                  })}
                </Space>
              </div>
            )}

            {mode === 'handle' && (
              <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                <Form.Item name="solution" label="处理方案">
                  <Input.TextArea rows={3} placeholder="请输入处理方案，完成后提交" />
                </Form.Item>
              </Form>
            )}
          </div>
        )}
      </Modal>

      {/* 视频 / 文件 预览弹窗 */}
      <Modal
        open={!!mediaPreview}
        footer={null}
        onCancel={() => setMediaPreview(null)}
        width={720}
        title={mediaPreview?.type === 'video' ? '视频预览' : '文件预览'}>
        {mediaPreview?.type === 'video' && (
          <video controls autoPlay style={{ width: '100%', maxHeight: 480, borderRadius: 8 }} src={customerImageUrl(mediaPreview.url)} />
        )}
        {mediaPreview?.type === 'file' && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <FileTextOutlined style={{ fontSize: 52, color: '#999' }} />
            <p style={{ marginTop: 12, fontSize: 14, color: '#333', wordBreak: 'break-all' }}>{getFileName(mediaPreview.url)}</p>
            <a href={customerImageUrl(mediaPreview.url)} target="_blank" rel="noreferrer">
              <Button type="primary" icon={<FileTextOutlined />}>下载 / 打开</Button>
            </a>
          </div>
        )}
      </Modal>

      {/* 关联车辆详情弹窗 */}
      <Modal
        title={<span><CarOutlined /> 关联车辆信息</span>}
        open={vehicleOpen}
        onCancel={() => setVehicleOpen(false)}
        footer={null}
        width={680}
        loading={vehicleLoading}>
        {vehicleLoading ? <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中...</div> : (
          vehicleInfo ? (
            <div>
              <Space size={12} style={{ marginBottom: 16 }}>
                {vehicleInfo.images ? (
                  <Image src={imageUrl(parseImages(vehicleInfo.images)[0] || '')} width={120} height={88}
                    style={{ objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 120, height: 88, borderRadius: 8, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CarOutlined style={{ fontSize: 32, color: '#bbb' }} />
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 17 }}>{vehicleInfo.name || '-'}</div>
                  <div style={{ color: '#666', marginTop: 4 }}>车牌号：
                    <Tag color="blue">{vehicleInfo.plateNumber || '-'}</Tag>
                  </div>
                  <div style={{ color: '#888', marginTop: 2 }}>所属工单：{vehicleTicketNo || '-'}</div>
                </div>
              </Space>

              <Descriptions size="small" bordered column={2}>
                <Descriptions.Item label="品牌">{vehicleInfo.brand || '-'}</Descriptions.Item>
                <Descriptions.Item label="车系">{vehicleInfo.series || '-'}</Descriptions.Item>
                <Descriptions.Item label="车型">{vehicleInfo.type || '-'}</Descriptions.Item>
                <Descriptions.Item label="车身颜色">{vehicleInfo.color || '-'}</Descriptions.Item>
                <Descriptions.Item label="座位数">{vehicleInfo.seats ? `${vehicleInfo.seats}座` : '-'}</Descriptions.Item>
                <Descriptions.Item label="排量">{vehicleInfo.displacement || '-'}</Descriptions.Item>
                <Descriptions.Item label="当前里程">{vehicleInfo.mileage ? `${vehicleInfo.mileage} km` : '-'}</Descriptions.Item>
                <Descriptions.Item label="日租金">￥{vehicleInfo.dailyPrice ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="车架号（VIN）" span={2}>{vehicleInfo.vin || '-'}</Descriptions.Item>
                {vehicleInfo.images && (
                  <Descriptions.Item label="车辆图片" span={2}>
                    <Image.PreviewGroup>
                      <Space size={8} wrap>
                        {parseImages(vehicleInfo.images).map((u, i) => (
                          <Image key={i} src={imageUrl(u)} width={72} height={56} style={{ objectFit: 'cover', borderRadius: 6 }} />
                        ))}
                      </Space>
                    </Image.PreviewGroup>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          ) : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>该工单暂无关联车辆信息</div>
        )}
      </Modal>
    </div>
  );
};

AfterSales.routeConfig = { path: '/after-sales', permission: 'after_sales' };
export default AfterSales;