/**
 * 车辆管理 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取车辆列表 */
export const getVehiclesApi = (params) => get('/api/car/list', params);

/** 获取车辆详情 */
export const getVehicleDetailApi = (id) => get(`/api/car/detail/${id}`);

/** 添加车辆 */
export const addVehicleApi = (data) => post('/api/car/add', data);

/** 更新车辆（id 走路径，data 走请求体） */
export const updateVehicleApi = (id, data) => put(`/api/car/update/${id}`, data);

/** 删除车辆 */
export const deleteVehicleApi = (id) => del(`/api/car/delete/${id}`);

/** 切换车辆状态 */
export const toggleVehicleStatusApi = (id, status) => put(`/api/car/status/${id}`, null, { params: { status } });

// 别名导出
export const getCarListApi = getVehiclesApi;
export const getCarDetailApi = getVehicleDetailApi;
export const addCarApi = addVehicleApi;
export const updateCarApi = updateVehicleApi;
export const deleteCarApi = deleteVehicleApi;
export const updateCarStatusApi = toggleVehicleStatusApi;