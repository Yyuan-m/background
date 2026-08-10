/**
 * 车辆素材管理 API
 */
import { get, post, del } from '@/api/request';

/** 获取素材列表（分页） */
export const getCarImageListApi = (params) => get('/api/car/image/list', params);

/** 新增素材 */
export const addCarImageApi = (data) => post('/api/car/image/add', data);

/** 删除素材 */
export const deleteCarImageApi = (id) => del(`/api/car/image/delete/${id}`);
