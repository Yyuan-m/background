/**
 * 系统设置相关 API
 */
import { get, post, put, del } from '@/api/request';

// ==================== 角色管理 ====================

/** 获取角色列表 */
export const getRoleListApi = (params) => get('/api/system/role/list', params);

/** 获取角色详情 */
export const getRoleDetailApi = (id) => get(`/api/system/role/detail/${id}`);

/** 添加角色 */
export const addRoleApi = (data) => post('/api/system/role/add', data);

/** 更新角色 */
export const updateRoleApi = (data) => put('/api/system/role/update', data);

/** 删除角色 */
export const deleteRoleApi = (id) => del(`/api/system/role/delete/${id}`);

/** 切换角色状态（后端仅toggle，忽略status参数） */
export const toggleRoleStatusApi = (id, _status) => put(`/api/system/role/status/${id}`);

/** 获取角色权限 */
export const getRolePermissionsApi = (id) => get(`/api/system/role/permissions/${id}`);

/** 保存角色权限 */
export const saveRolePermissionsApi = (id, permissions) => put(`/api/system/role/permissions/${id}`, permissions);

// 别名
export const getRolesApi = getRoleListApi;

// ==================== 用户管理 ====================

/** 获取用户列表 */
export const getUserListApi = (params) => get('/api/system/user/list', params);

/** 获取用户详情 */
export const getUserDetailApi = (id) => get(`/api/system/user/detail/${id}`);

/** 添加用户 */
export const addUserApi = (data) => post('/api/system/user/add', data);

/** 更新用户 */
export const updateUserApi = (data) => put('/api/system/user/update', data);

/** 删除用户 */
export const deleteUserApi = (id) => del(`/api/system/user/delete/${id}`);

/** 切换用户状态（后端仅toggle，忽略status参数） */
export const toggleUserStatusApi = (id, _status) => put(`/api/system/user/status/${id}`);

/** 重置用户密码（可选传入新密码，未传则后端默认 123456） */
export const resetPasswordApi = (id, password) =>
  put(`/api/system/user/reset-password/${id}`, password != null ? { password } : {});

/** 批量删除用户 */
export const batchDeleteUsersApi = (ids) => post('/api/system/user/batch-delete', { ids });

/** 批量切换用户状态 */
export const batchToggleUsersApi = (ids, status) => post('/api/system/user/batch-status', { ids, status });

// 别名
export const getUsersApi = getUserListApi;
export const updateUserStatusApi = toggleUserStatusApi;

// ==================== 系统配置 ====================

/** 获取系统配置 */
export const getSystemSettingsApi = () => get('/api/system/config');

/** 更新系统配置 */
export const updateSystemSettingsApi = (data) => put('/api/system/config', data);

// ==================== 公告管理 ====================

/** 获取公告列表 */
export const getAnnouncementsApi = (params) => get('/api/system/announcement/list', params);

/** 获取公告详情 */
export const getAnnouncementDetailApi = (id) => get(`/api/system/announcement/${id}`);

/** 添加公告 */
export const addAnnouncementApi = (data) => post('/api/system/announcement/add', data);

/** 更新公告 */
export const updateAnnouncementApi = (data) => put('/api/system/announcement/update', data);

/** 删除公告 */
export const deleteAnnouncementApi = (id) => del(`/api/system/announcement/${id}/delete`);

// 别名
export const getAnnouncementListApi = getAnnouncementsApi;

// ==================== 密码修改 ====================

/** 修改密码 */
export const changePasswordApi = (data) => put('/api/system/user/change-password', data);

// ==================== 从 menu 模块转发 ====================
export { getMenuTreeApi, getPermissionTreeApi } from './menu';