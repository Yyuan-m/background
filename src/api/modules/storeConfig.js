/**
 * 门店配置 API（城市 + 门店 CRUD）
 */
import { get, post, put, del } from '@/api/request';

// ==================== 城市 ====================

/** 获取城市列表 */
export const getCityListApi = () =>
  get('/api/store-config/city/list');

/** 新增城市 */
export const addCityApi = (data) =>
  post('/api/store-config/city/add', data, { successMsg: '城市新增成功' });

/** 更新城市 */
export const updateCityApi = (id, data) =>
  put(`/api/store-config/city/update/${id}`, data, { successMsg: '城市更新成功' });

/** 删除城市（同时删除其下所有门店） */
export const deleteCityApi = (id) =>
  del(`/api/store-config/city/delete/${id}`, { successMsg: '城市已删除' });

/** 切换城市状态 */
export const toggleCityStatusApi = (id, status) =>
  put(`/api/store-config/city/status/${id}`, { status }, { successMsg: '状态已更新' });

// ==================== 门店 ====================

/** 获取门店列表（可按城市ID筛选） */
export const getStoreListApi = (cityId) =>
  get('/api/store-config/store/list', { cityId });

/** 新增门店 */
export const addStoreApi = (data) =>
  post('/api/store-config/store/add', data, { successMsg: '门店新增成功' });

/** 更新门店 */
export const updateStoreApi = (id, data) =>
  put(`/api/store-config/store/update/${id}`, data, { successMsg: '门店更新成功' });

/** 删除门店 */
export const deleteStoreApi = (id) =>
  del(`/api/store-config/store/delete/${id}`, { successMsg: '门店已删除' });

/** 切换门店状态 */
export const toggleStoreStatusApi = (id, status) =>
  put(`/api/store-config/store/status/${id}`, { status }, { successMsg: '状态已更新' });
