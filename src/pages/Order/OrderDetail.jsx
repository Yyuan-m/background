import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Spin, Space, Row, Col, Image, Table } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, CarOutlined } from '@ant-design/icons';
import { getOrderDetailApi } from '@/api/modules/order';
import useAppStore from '@/store/useAppStore';
import { formatTime } from '@/utils/formatTime';
import { imageUrl } from '@/utils/imageUrl';

// 对齐 customer_order 表的状态
const statusMap = {
  pending: { text: '待支付', color: 'orange' },
  renting: { text: '租赁中', color: 'green' },
  completed: { text: '已完成', color: 'default' },
  cancelled: { text: '已取消', color: 'red' },
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrderDetailApi(id);
      if (!res) {
        setOrder(null);
        return;
      }
      setOrder(res);
      const label = `订单详情 - ${res.orderNo || id}`;
      useAppStore.getState().setBreadcrumb([
        { path: '/orders', label: '订单管理' },
        { path: `/orders/${id}`, label },
      ]);
      useAppStore.getState().updateTabLabel(`/orders/${id}`, label);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  if (!order) {
    return <div style={{ textAlign: 'center', padding: 100 }}>订单不存在</div>;
  }

  const statusCfg = statusMap[order.status] || { text: order.statusName || order.status || '未知', color: 'default' };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>返回列表</Button>
          <Button icon={<PrinterOutlined />}>打印订单</Button>
        </Space>
      </div>

      <Card variant="borderless" style={{  marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>订单详情 - {order.orderNo || '-'}</h2>
          <Tag color={statusCfg.color} style={{ fontSize: 14, padding: '4px 16px' }}>{statusCfg.text}</Tag>
        </div>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="订单编号">{order.orderNo || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatTime(order.createTime)}</Descriptions.Item>
          <Descriptions.Item label="订单状态"><Tag color={statusCfg.color}>{statusCfg.text}</Tag></Descriptions.Item>
          <Descriptions.Item label="会员ID">{order.memberId ?? '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="联系人信息" variant="borderless">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="联系人姓名">{order.contactName || '-'}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{order.contactPhone || '-'}</Descriptions.Item>
              <Descriptions.Item label="城市">{order.city || '-'}</Descriptions.Item>
              <Descriptions.Item label="门店">{order.store || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<span><CarOutlined style={{ marginRight: 6 }} />租期信息</span>} variant="borderless">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="租赁开始日期">{formatTime(order.startDate)}</Descriptions.Item>
              <Descriptions.Item label="租赁结束日期">{formatTime(order.endDate)}</Descriptions.Item>
              <Descriptions.Item label="租赁天数">{order.days ?? '-'} 天</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title={<span><CarOutlined style={{ marginRight: 6 }} />车辆明细（{order.items?.length || 1} 辆）</span>} variant="borderless" style={{ marginTop: 16 }}>
        {order.items && order.items.length > 0 ? (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={order.items}
            columns={[
              { title: '车辆', key: 'car', width: 240, render: (_, it) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {it.carCover ? (
                      <Image width={64} height={44} src={imageUrl(it.carCover)} style={{ objectFit: 'cover', borderRadius: 4 }} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" preview={false} />
                    ) : <div style={{ width: 64, height: 44, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>无图</div>}
                    <span>{it.carName || '-'}</span>
                  </div>
                ) },
              { title: '车辆ID', dataIndex: 'carId', key: 'carId', width: 80 },
              { title: '租期', key: 'period', width: 200, render: (_, it) => `${formatTime(it.startDate)} ~ ${formatTime(it.endDate)}（${it.days}天）` },
              { title: '日租金', key: 'dailyPrice', width: 100, render: (_, it) => `¥${it.dailyPrice?.toLocaleString() ?? '0'}` },
              { title: '租金小计', key: 'rentAmount', width: 110, render: (_, it) => `¥${it.rentAmount?.toLocaleString() ?? '0'}` },
              { title: '应付(券后)', key: 'totalAmount', width: 120, align: 'right', render: (_, it) => <span style={{ color: 'var(--amount-color, #c9a96e)', fontWeight: 600 }}>¥{it.totalAmount?.toLocaleString() ?? '0'}</span> },
            ]}
          />
        ) : (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="车辆名称">{order.carName || '-'}</Descriptions.Item>
            <Descriptions.Item label="车辆ID">{order.carId ?? '-'}</Descriptions.Item>
            {order.carCover && (
              <Descriptions.Item label="车辆封面">
                <Image width={120} height={80} src={imageUrl(order.carCover)} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" style={{ objectFit: 'cover', borderRadius: 4 }} />
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Card>

      <Card title="费用信息" variant="borderless" style={{  marginTop: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="租金总额（原价）">¥{order.rentAmount?.toLocaleString() ?? '0'}</Descriptions.Item>
          <Descriptions.Item label="优惠券折扣">¥{order.couponDiscount?.toLocaleString() ?? '0'}</Descriptions.Item>
          <Descriptions.Item label="总金额（实付）">
            <span style={{ color: 'var(--amount-color, #c9a96e)', fontSize: 16, fontWeight: 600 }}>
              ¥{order.totalAmount?.toLocaleString() ?? '0'}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

OrderDetail.routeConfig = { path: '/orders/:id', permission: 'order' };
export default OrderDetail;
