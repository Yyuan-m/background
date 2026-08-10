/**
 * 管理员管理 API（复用系统用户接口）
 */
import { get, post, put, del } from '@/api/request';

/** 获取管理员列表 */
export const getAdminsApi = (params) => get('/api/system/user/list', params);

/** 获取管理员详情 */
export const getAdminDetailApi = (id) => get(`/api/system/user/detail/${id}`);

/** 添加管理员 */
export const addAdminApi = (data) => post('/api/system/user/add', data);

/** 更新管理员（URL 无 id，将 id 写入 body） */
export const updateAdminApi = (id, data) => put('/api/system/user/update', { id, ...data });

/** 删除管理员 */
export const deleteAdminApi = (id) => del(`/api/system/user/delete/${id}`);

/** 切换管理员状态（后端仅toggle，忽略status参数） */
export const toggleAdminStatusApi = (id, _status) => put(`/api/system/user/status/${id}`);

// 别名导出
export const getAdminListApi = getAdminsApi;
export const updateAdminStatusApi = toggleAdminStatusApi;