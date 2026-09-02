import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, InputNumber, DatePicker, Popconfirm, Row, Col, Alert, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined, InfoCircleOutlined } from '@ant-design/icons';
import {
  getReconciliationAggregateApi,
  getReconciliationListApi, addReconciliationApi, updateReconciliationApi, deleteReconciliationApi, toggleReconciliationStatusApi,
} from '@/api/modules/finance';
import { formatTime } from '@/utils/formatTime';
import dayjs from 'dayjs';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useAuthStore from '@/store/useAuthStore';

const statusColorMap = { checked: 'green', pending: 'orange' };

const ReconciliationTab = () => {
  // 聚合数据（从 finance_record 自动派生）
  const [aggData, setAggData] = useState([]);
  const [aggLoading, setAggLoading] = useState(false);
  const [months, setMonths] = useState(6);

  // 手工调账记录（reconciliation 表）
  const [manualData, setManualData] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const { map: reconciliationStatusMap } = useDict('reconciliation_status');
  const { hasPermission } = useAuthStore();
  const canRecAdd = hasPermission('finance:reconciliation:add');
  const canRecUpdate = hasPermission('finance:reconciliation:update');
  const canRecStatus = hasPermission('finance:reconciliation:status');
  const canRecDelete = hasPermission('finance:reconciliation:delete');

  // 聚合数据：从 finance_record 按月自动汇总
  const fetchAggData = useCallback(async () => {
    setAggLoading(true);
    try {
      const res = await getReconciliationAggregateApi(months);
      setAggData(res || []);
    } catch (e) { console.error(e); } finally { setAggLoading(false); }
  }, [months]);

  // 手工调账记录
  const fetchManualData = useCallback(async () => {
    setManualLoading(true);
    try {
      const res = await getReconciliationListApi({ page: 1, pageSize: 100 });
      setManualData(res?.list || []);
    } catch (e) { console.error(e); } finally { setManualLoading(false); }
  }, []);

  useEffect(() => { void fetchAggData(); }, [fetchAggData]);
  useEffect(() => { void fetchManualData(); }, [fetchManualData]);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ status: 'pending', rentalIncome: 0, fees: 0 });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      date: record.date ? dayjs(record.date) : null,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try { await deleteReconciliationApi(id); void fetchManualData(); void fetchAggData(); } catch (e) { console.error(e); }
  };

  const handleToggleStatus = async (id, status) => {
    try { await toggleReconciliationStatusApi(id, status); void fetchManualData(); void fetchAggData(); } catch (e) { console.error(e); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        date: values.date ? values.date.format('YYYY-MM-DD') : null,
      };
      if (editingId) {
        await updateReconciliationApi({ id: editingId, ...payload });
      } else {
        await addReconciliationApi(payload);
      }
      setModalVisible(false);
      void fetchManualData();
      void fetchAggData();
    } catch (e) { /* 校验失败或请求失败 */ }
  };

  // 聚合表列：从 finance_record 自动汇总
  const aggColumns = useMemo(() => [
    { title: '账期', dataIndex: 'month', key: 'month', width: 100, render: (v) => <strong>{v}</strong> },
    { title: '租金收入', dataIndex: 'rentalIncome', key: 'rentalIncome', width: 130, render: (v) => <span style={{ color: '#10b981' }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '其他费用', dataIndex: 'fees', key: 'fees', width: 130, render: (v) => <span style={{ color: '#ef4444' }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '净收入', dataIndex: 'netIncome', key: 'netIncome', width: 140, render: (v) => <span style={{ color: 'var(--amount-color, #c9a96e)', fontWeight: 600 }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (v) => <Tag color={statusColorMap[v] || 'default'}>{reconciliationStatusMap[v]?.label || (v === 'checked' ? '已对账' : '待对账')}</Tag> },
    { title: '对账人', dataIndex: 'checkedBy', key: 'checkedBy', width: 100, render: (v) => v || '-' },
    ...(canRecStatus || canRecAdd ? [{
      title: '操作', key: 'action', width: 120, fixed: 'right',
      render: (_, record) => (
        record.reconciliationId ? (
          <Space>
            {canRecStatus && record.status === 'pending' && <Button type="link" size="small" onClick={() => handleToggleStatus(record.reconciliationId, 'checked')}>确认对账</Button>}
            {canRecStatus && record.status === 'checked' && <Button type="link" size="small" onClick={() => handleToggleStatus(record.reconciliationId, 'pending')}>撤销</Button>}
          </Space>
        ) : canRecAdd && <Button type="link" size="small" onClick={() => handleAdd()}>调账</Button>
      ),
    }] : []),
  ], [reconciliationStatusMap, canRecAdd, canRecStatus]);

  const manualColumns = useMemo(() => [
    { title: '对账日期', dataIndex: 'date', key: 'date', width: 110, render: formatTime.render },
    { title: '租金收入', dataIndex: 'rentalIncome', key: 'rentalIncome', width: 120, render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '其他费用', dataIndex: 'fees', key: 'fees', width: 110, render: (v) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '净收入', dataIndex: 'netIncome', key: 'netIncome', width: 130, render: (v) => <span style={{ color: 'var(--amount-color, #c9a96e)', fontWeight: 600 }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (v) => <Tag color={statusColorMap[v] || 'default'}>{reconciliationStatusMap[v]?.label || v}</Tag> },
    ...(canRecUpdate || canRecStatus || canRecDelete ? [{
      title: '操作', key: 'action', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space>
          {canRecUpdate && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>}
          {canRecStatus && record.status === 'pending' && <Button type="link" size="small" onClick={() => handleToggleStatus(record.id, 'checked')}>对账</Button>}
          {canRecStatus && record.status === 'checked' && <Button type="link" size="small" onClick={() => handleToggleStatus(record.id, 'pending')}>撤销</Button>}
          {canRecDelete && (
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ], [reconciliationStatusMap, canRecUpdate, canRecStatus, canRecDelete]);

  return (
    <div>
      {/* 自动对账聚合表 */}
      <Card
        title={<><SyncOutlined /> 自动对账（从资金流水聚合）</>}
        variant="borderless"
        style={{ marginBottom: 16 }}
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                style={{
                  padding: '2px 10px',
                  borderRadius: 4,
                  border: `1px solid ${months === m ? 'var(--primary-color, #3b82f6)' : 'var(--border-color, #e2e8f0)'}`,
                  background: months === m ? 'var(--primary-color, #3b82f6)' : 'transparent',
                  color: months === m ? '#fff' : 'var(--text-secondary, #64748b)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                近{m}月
              </button>
            ))}
            <Button size="small" icon={<SyncOutlined />} onClick={() => fetchAggData()} style={{ marginLeft: 8 }}>刷新</Button>
          </div>
        }
      >
        <Alert
          message="数据来源说明"
          description="本表数据由系统按月从「资金流水(finance_record)」自动聚合生成，无需手工录入。租金收入=type=rental求和；其他费用=逾期罚金+违章费用+服务费。点击「确认对账」可标记该月已核对。"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
        <Spin spinning={aggLoading}>
          <Table columns={aggColumns} dataSource={aggData} rowKey="month" scroll={{ x: 1100 }} pagination={false} size="small" />
        </Spin>
      </Card>

      {/* 手工调账记录 */}
      <Card
        title="手工调账记录"
        variant="borderless"
        extra={hasPermission('finance:reconciliation:add') && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增调账</Button>}
      >
        <Alert
          message="调账用于补录系统未自动捕获的账目（如线下收据、历史数据迁移等）。日常对账请以上方自动聚合表为准。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table columns={manualColumns} dataSource={manualData} rowKey="id" loading={manualLoading} scroll={{ x: 1100 }}
          pagination={{
            showSizeChanger: true, showQuickJumper: true, showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }} size="small" />
      </Card>

      <Modal title={editingId ? '编辑调账记录' : '新增调账记录'} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} destroyOnClose width={640}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="date" label="对账日期" rules={[{ required: true, message: '请选择对账日期' }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="状态" rules={[{ required: true }]}><DictSelect dictType="reconciliation_status" /></Form.Item></Col>
            <Col span={12}><Form.Item name="rentalIncome" label="租金收入" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} addonAfter="元" /></Form.Item></Col>
            <Col span={12}><Form.Item name="fees" label="其他费用" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} addonAfter="元" /></Form.Item></Col>
            <Col span={12}><Form.Item name="checkedBy" label="对账人"><Input /></Form.Item></Col>
          </Row>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>净收入由后端自动计算：租金收入 - 其他费用</div>
        </Form>
      </Modal>
    </div>
  );
};

export default ReconciliationTab;
