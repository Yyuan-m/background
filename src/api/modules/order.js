/**
 * 订单管理 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取订单列表 */
export const getOrdersApi = (params) => get('/api/order/list', params);

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

// 别名导出
export const getOrderListApi = getOrdersApi;