/**
 * 售后投诉 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取售后工单列表 */
export const getAfterSalesListApi = (params) =>
  get('/api/after-sales/list', params);

/** 获取售后工单详情 */
export const getAfterSalesDetailApi = (id) =>
  get(`/api/after-sales/${id}`);

/** 新增售后工单 */
export const addAfterSalesApi = (data) =>
  post('/api/after-sales/add', data, { successMsg: '工单创建成功' });

/** 更新售后工单 */
export const updateAfterSalesApi = (data) =>
  put('/api/after-sales/update', data, { successMsg: '工单更新成功' });

/** 删除售后工单 */
export const deleteAfterSalesApi = (id) =>
  del(`/api/after-sales/${id}`, { successMsg: '工单已删除' });

/** 处理售后工单（状态/处理人/解决方案/满意度） */
export const handleAfterSalesApi = (id, params) =>
  put(`/api/after-sales/${id}/handle`, params, { successMsg: '工单处理完成' });

// 别名
export const getComplaintsApi = getAfterSalesListApi;
