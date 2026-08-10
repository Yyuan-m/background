/**
 * 车辆违章 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取违章列表（分页） */
export const getCarViolationListApi = (params) =>
  get('/api/car-violation/list', params);

/** 获取违章详情 */
export const getCarViolationDetailApi = (id) =>
  get(`/api/car-violation/${id}`);

/** 新增违章 */
export const addCarViolationApi = (data) =>
  post('/api/car-violation/add', data, { successMsg: '违章记录新增成功' });

/** 更新违章 */
export const updateCarViolationApi = (data) =>
  put('/api/car-violation/update', data, { successMsg: '违章记录更新成功' });

/** 处理违章（状态/处理人） */
export const handleCarViolationApi = (id, params) =>
  put(`/api/car-violation/${id}/handle`, params, { successMsg: '违章处理成功' });

/** 删除违章 */
export const deleteCarViolationApi = (id) =>
  del(`/api/car-violation/${id}`, { successMsg: '违章记录已删除' });

// 别名
export const getViolationListApi = getCarViolationListApi;
