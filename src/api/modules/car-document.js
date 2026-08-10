/**
 * 车辆证件 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取证件列表（分页） */
export const getCarDocumentListApi = (params) =>
  get('/api/car-document/list', params);

/** 获取证件详情 */
export const getCarDocumentDetailApi = (id) =>
  get(`/api/car-document/${id}`);

/** 按车辆 ID 查询证件列表 */
export const getCarDocumentsByVehicleApi = (vehicleId) =>
  get(`/api/car-document/vehicle/${vehicleId}`);

/** 新增证件 */
export const addCarDocumentApi = (data) =>
  post('/api/car-document/add', data, { successMsg: '证件新增成功' });

/** 更新证件 */
export const updateCarDocumentApi = (data) =>
  put('/api/car-document/update', data, { successMsg: '证件更新成功' });

/** 删除证件 */
export const deleteCarDocumentApi = (id) =>
  del(`/api/car-document/${id}`, { successMsg: '证件已删除' });

// 别名
export const getDocumentListApi = getCarDocumentListApi;
