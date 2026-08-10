/**
 * 车辆维保 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取维保记录列表（分页） */
export const getCarMaintenanceListApi = (params) =>
  get('/api/car-maintenance/list', params);

/** 获取维保记录详情 */
export const getCarMaintenanceDetailApi = (id) =>
  get(`/api/car-maintenance/${id}`);

/** 新增维保记录 */
export const addCarMaintenanceApi = (data) =>
  post('/api/car-maintenance/add', data, { successMsg: '维保记录新增成功' });

/** 更新维保记录 */
export const updateCarMaintenanceApi = (id, data) =>
  put(`/api/car-maintenance/update/${id}`, data, { successMsg: '维保记录更新成功' });

/** 删除维保记录 */
export const deleteCarMaintenanceApi = (id) =>
  del(`/api/car-maintenance/${id}`, { successMsg: '维保记录已删除' });

// 别名
export const getMaintenanceListApi = getCarMaintenanceListApi;
