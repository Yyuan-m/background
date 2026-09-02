import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, InputNumber, DatePicker, Popconfirm, Row, Col, Alert, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CarOutlined, InfoCircleOutlined, PieChartOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  getCostListApi, addCostApi, updateCostApi, deleteCostApi,
  getVehicleCostReferenceApi,
  getVehicleTypeBreakdownApi,
} from '@/api/modules/finance';
import { formatTime } from '@/utils/formatTime';
import dayjs from 'dayjs';
import DictSelect from '@/components/DictSelect';
import { useDict } from '@/hooks/useDict';
import useAuthStore from '@/store/useAuthStore';

const typeColorMap = { maintenance: 'orange', insurance: 'blue', operation: 'purple' };

const CostTab = () => {
  // 车辆成本参考表数据
  const [vehicleCostData, setVehicleCostData] = useState([]);
  const [vehicleCostLoading, setVehicleCostLoading] = useState(false);

  // 车型收支分析数据
  const [vehicleTypeData, setVehicleTypeData] = useState([]);
  const [vehicleTypeLoading, setVehicleTypeLoading] = useState(false);

  // 手工成本记录
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState(undefined);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const { map: costTypeMap } = useDict('cost_type');
  const { hasPermission } = useAuthStore();
  const canCostUpdate = hasPermission('finance:cost:update');
  const canCostDelete = hasPermission('finance:cost:delete');

  // 车辆成本参考数据
  const fetchVehicleCostData = useCallback(async () => {
    setVehicleCostLoading(true);
    try {
      const res = await getVehicleCostReferenceApi();
      setVehicleCostData(res || []);
    } catch (e) { console.error(e); } finally { setVehicleCostLoading(false); }
  }, []);

  // 车型收支分析数据
  const fetchVehicleTypeData = useCallback(async () => {
    setVehicleTypeLoading(true);
    try {
      const res = await getVehicleTypeBreakdownApi();
      setVehicleTypeData(res || []);
    } catch (e) { console.error(e); } finally { setVehicleTypeLoading(false); }
  }, []);

  // 手工成本记录
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCostListApi({
        page: pagination.page,
        pageSize: pagination.pageSize,
        type: filterType,
        keyword: keyword || undefined,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [pagination, filterType, keyword]);

  useEffect(() => { void fetchVehicleCostData(); }, [fetchVehicleCostData]);
  useEffect(() => { void fetchVehicleTypeData(); }, [fetchVehicleTypeData]);
  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ type: 'maintenance', amount: 0 });
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
    try { await deleteCostApi(id); void fetchData(); } catch (e) { console.error(e); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const typeName = costTypeMap[values.type]?.label || values.type;
      const payload = {
        ...values,
        typeName,
        date: values.date ? values.date.format('YYYY-MM-DD') : null,
      };
      if (editingId) {
        await updateCostApi({ id: editingId, ...payload });
      } else {
        await addCostApi(payload);
      }
      setModalVisible(false);
      void fetchData();
    } catch { /* 校验失败或请求失败 */ }
  };

  // 当前页合计（仅统计当前页数据）
  const currentPageTotal = useMemo(
    () => data.reduce((s, c) => s + Number(c.amount || 0), 0),
    [data],
  );

  // 车辆成本参考表合计
  const vehicleCostSummary = useMemo(() => {
    const totalCost = vehicleCostData.reduce((s, c) => s + Number(c.totalRentalCost || 0), 0);
    const totalDays = vehicleCostData.reduce((s, c) => s + Number(c.totalRentalDays || 0), 0);
    return { totalCost, totalDays };
  }, [vehicleCostData]);

  // 车型收支分析合计
  const vehicleTypeSummary = useMemo(() => {
    const totalRevenue = vehicleTypeData.reduce((s, c) => s + Number(c.revenue || 0), 0);
    const totalCost = vehicleTypeData.reduce((s, c) => s + Number(c.cost || 0), 0);
    const totalProfit = vehicleTypeData.reduce((s, c) => s + Number(c.profit || 0), 0);
    return { totalRevenue, totalCost, totalProfit };
  }, [vehicleTypeData]);

  // 车型收支分析列
  const vehicleTypeColumns = useMemo(() => [
    { title: '车型', dataIndex: 'type', key: 'type', width: 120 },
    { title: '营收(¥)', dataIndex: 'revenue', key: 'revenue', width: 120, render: (v) => <span style={{ color: '#10b981' }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '成本(¥)', dataIndex: 'cost', key: 'cost', width: 120, render: (v) => <span style={{ color: '#ef4444' }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '利润(¥)', dataIndex: 'profit', key: 'profit', width: 120, render: (v) => <span style={{ color: Number(v) >= 0 ? '#1a365d' : '#ef4444' }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '利润率', dataIndex: 'profitMargin', key: 'profitMargin', width: 100, render: (v) => <Tag color={Number(v) >= 46 ? 'green' : 'orange'}>{Number(v || 0).toFixed(1)}%</Tag> },
    { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 80 },
    { title: '租赁天数', dataIndex: 'rentalDays', key: 'rentalDays', width: 100 },
  ], []);

  // 车辆成本参考表列
  const vehicleCostColumns = useMemo(() => [
    { title: '车辆名称', dataIndex: 'name', key: 'name', width: 160, ellipsis: true },
    { title: '品牌', dataIndex: 'brand', key: 'brand', width: 90 },
    { title: '车牌号', dataIndex: 'plateNumber', key: 'plateNumber', width: 110 },
    { title: '日租(¥)', dataIndex: 'dailyPrice', key: 'dailyPrice', width: 100, render: (v) => <span style={{ color: 'var(--amount-color, #c9a96e)', fontWeight: 500 }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '日成本(¥)', dataIndex: 'dailyCost', key: 'dailyCost', width: 100, render: (v) => <span style={{ color: 'var(--text-secondary, #64748b)' }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '日利润(¥)', dataIndex: 'dailyProfit', key: 'dailyProfit', width: 100, render: (v) => <span style={{ color: '#10b981', fontWeight: 500 }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '利润率', dataIndex: 'profitMargin', key: 'profitMargin', width: 80, render: (v) => <Tag color={Number(v) >= 46 ? 'green' : 'orange'}>{Number(v || 0).toFixed(1)}%</Tag> },
    { title: '累计租赁天数', dataIndex: 'totalRentalDays', key: 'totalRentalDays', width: 100, sorter: (a, b) => a.totalRentalDays - b.totalRentalDays, render: (v) => v || 0 },
    { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 80, render: (v) => v || 0 },
    { title: '累计成本(¥)', dataIndex: 'totalRentalCost', key: 'totalRentalCost', width: 120, sorter: (a, b) => a.totalRentalCost - b.totalRentalCost, render: (v) => <span style={{ color: '#ef4444' }}>¥{Number(v || 0).toLocaleString()}</span> },
  ], []);

  // 手工成本记录列
  const costColumns = useMemo(() => [
    { title: '类型', dataIndex: 'typeName', key: 'typeName', width: 120, render: (v, record) => <Tag color={typeColorMap[record.type] || 'default'}>{costTypeMap[record.type]?.label || v}</Tag> },
    { title: '明细', dataIndex: 'detail', key: 'detail', ellipsis: true },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 130, render: (v) => <span style={{ color: 'var(--error-color, #ef4444)' }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: '日期', dataIndex: 'date', key: 'date', width: 120, render: formatTime.render },
    ...(canCostUpdate || canCostDelete ? [{
      title: '操作', key: 'action', width: 160, fixed: 'right',
      render: (_, record) => (
        <Space>
          {canCostUpdate && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>}
          {canCostDelete && (
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [costTypeMap, canCostUpdate, canCostDelete]);

  return (
    <div>
      {/* 车辆成本参考表 */}
      <Card
        title={<><CarOutlined /> 车辆成本参考表</>}
        variant="borderless"
        style={{ marginBottom: 16 }}
      >
        <Alert
          message="数据来源说明"
          description="本表自动从「车辆管理」的日租价格和日成本价（默认=日租×0.54）派生。累计租赁天数和累计成本从「客户订单」按车辆聚合。该数据与财务总览的成本/利润计算使用同一套算法，确保数据一致。"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
        <Spin spinning={vehicleCostLoading}>
          <Table columns={vehicleCostColumns} dataSource={vehicleCostData} rowKey="id" scroll={{ x: 1060 }} size="small"
            pagination={false}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><strong>合计</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} />
                  <Table.Summary.Cell index={2} />
                  <Table.Summary.Cell index={3} />
                  <Table.Summary.Cell index={4} />
                  <Table.Summary.Cell index={5} />
                  <Table.Summary.Cell index={6} />
                  <Table.Summary.Cell index={7}><strong>{vehicleCostSummary.totalDays} 天</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} />
                  <Table.Summary.Cell index={9}><strong style={{ color: '#ef4444' }}>¥{vehicleCostSummary.totalCost.toLocaleString()}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )} />
        </Spin>
      </Card>

      {/* 车型收支分析 */}
      <Card
        title={<><PieChartOutlined /> 车型收支分析</>}
        variant="borderless"
        style={{ marginBottom: 16 }}
      >
        <Spin spinning={vehicleTypeLoading}>
          <Row gutter={16}>
            <Col xs={24} lg={14}>
              <Table
                columns={vehicleTypeColumns}
                dataSource={vehicleTypeData}
                rowKey="type"
                scroll={{ x: 760 }}
                size="small"
                pagination={false}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}><strong>合计</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={1}><strong style={{ color: '#10b981' }}>¥{vehicleTypeSummary.totalRevenue.toLocaleString()}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={2}><strong style={{ color: '#ef4444' }}>¥{vehicleTypeSummary.totalCost.toLocaleString()}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={3}><strong style={{ color: vehicleTypeSummary.totalProfit >= 0 ? '#1a365d' : '#ef4444' }}>¥{vehicleTypeSummary.totalProfit.toLocaleString()}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={4} />
                      <Table.Summary.Cell index={5} />
                      <Table.Summary.Cell index={6} />
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </Col>
            <Col xs={24} lg={10}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={vehicleTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name="营收" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="成本" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="利润" fill="#1a365d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Col>
          </Row>
        </Spin>
      </Card>

      {/* 手工成本记录 */}
      <Card
        title="其他成本记录（维保/保险/运营）"
        variant="borderless"
        extra={hasPermission('finance:cost:add') && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增成本记录</Button>}
      >
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col><Input.Search placeholder="明细关键字" allowClear value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={() => setPagination({ ...pagination, page: 1 })} style={{ width: 200 }} /></Col>
          <Col>
            <DictSelect dictType="cost_type" placeholder="类型筛选" allowClear value={filterType} onChange={(v) => { setFilterType(v); setPagination({ ...pagination, page: 1 }); }} style={{ width: 140 }} />
          </Col>
        </Row>
        <Table columns={costColumns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 700 }}
          pagination={{
            current: pagination.page, pageSize: pagination.pageSize, total,
            showSizeChanger: true, showQuickJumper: true, showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, pageSize) => setPagination({ page, pageSize }),
          }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><strong>当前页合计</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2}><strong style={{ color: 'var(--error-color, #ef4444)' }}>¥{currentPageTotal.toLocaleString()}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3} />
                <Table.Summary.Cell index={4} />
              </Table.Summary.Row>
            </Table.Summary>
          )} />
      </Card>

      <Modal title={editingId ? '编辑成本记录' : '新增成本记录'} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} destroyOnClose width={560}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="type" label="成本类型" rules={[{ required: true, message: '请选择类型' }]}><DictSelect dictType="cost_type" /></Form.Item></Col>
            <Col span={12}><Form.Item name="amount" label="金额" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} addonAfter="元" /></Form.Item></Col>
            <Col span={12}><Form.Item name="date" label="发生日期" rules={[{ required: true, message: '请选择日期' }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={24}><Form.Item name="detail" label="明细" rules={[{ required: true, message: '请输入明细' }]}><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default CostTab;
