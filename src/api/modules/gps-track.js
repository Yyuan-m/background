/**
 * GPS 轨迹 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取 GPS 轨迹列表（分页） */
export const getGpsTrackListApi = (params) =>
  get('/api/gps-track/list', params);

/** 按车辆 ID 查询 GPS 轨迹列表 */
export const getGpsTracksByVehicleApi = (vehicleId) =>
  get(`/api/gps-track/vehicle/${vehicleId}`);

/** 获取车辆最新 GPS 位置 */
export const getLatestGpsByVehicleApi = (vehicleId) =>
  get(`/api/gps-track/latest/${vehicleId}`);

/** 上报 GPS 轨迹 */
export const addGpsTrackApi = (data) =>
  post('/api/gps-track/add', data, { successMsg: '新增成功' });

/** 更新 GPS 轨迹 */
export const updateGpsTrackApi = (data) =>
  put('/api/gps-track/update', data, { successMsg: '编辑成功' });

/** 删除 GPS 轨迹 */
export const deleteGpsTrackApi = (id) =>
  del(`/api/gps-track/${id}`, { successMsg: '删除成功' });

// 别名
export const getGpsListApi = getGpsTrackListApi;
