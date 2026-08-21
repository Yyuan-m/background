/**
 * 订单管理 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取订单列表 */
export const getOrdersApi = (params) => get('/api/order/list', params);

/** 按状态统计订单数量（全量，不受分页/筛选条件影响） */
export const getOrderStatusCountApi = () => get('/api/order/status-count');

/** 获取订单详情 */
export const getOrderDetailApi = (id) => get(`/api/order/detail/${id}`);

/** 添加订单 */
export const addOrderApi = (data) => post('/api/order/add', data);

/** 更新订单 */
export const updateOrderApi = (data) => put(`/api/order/update/${data.id}`, data);

/** 删除订单 */
export const deleteOrderApi = (id) => del(`/api/order/delete/${id}`);

/** 更新订单状态 */
export const updateOrderStatusApi = (id, status) => put(`/api/order/status/${id}`, null, { params: { status } });

/** 手动触发：自动完成到期订单 + 回补缺失财务流水/发票 */
export const maintainOrderFinanceApi = () => post('/api/order/finance/maintain');

// 别名导出
export const getOrderListApi = getOrdersApi;
