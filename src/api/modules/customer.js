/**
 * 客户管理 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取客户列表 */
export const getCustomersApi = (params) => get('/api/customer/list', params);

/** 获取客户详情 */
export const getCustomerDetailApi = (id) => get(`/api/customer/detail/${id}`);

/** 更新客户（id 走路径，data 走请求体） */
export const updateCustomerApi = (id, data) => put(`/api/customer/update/${id}`, data);

/** 删除客户 */
export const deleteCustomerApi = (id) => del(`/api/customer/delete/${id}`);

/** 切换客户状态 */
export const toggleCustomerStatusApi = (id, status) => put(`/api/customer/status/${id}`, null, { params: { status } });

/** 获取客户订单 */
export const getCustomerOrdersApi = (id) => get(`/api/customer/orders/${id}`);

// 别名导出
export const getCustomerListApi = getCustomersApi;
export const updateCustomerStatusApi = toggleCustomerStatusApi;