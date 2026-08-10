/**
 * 菜单管理 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取菜单树 */
export const getMenuTreeApi = () => get('/api/system/menu/tree');

/** 获取菜单列表（扁平） */
export const getMenuListApi = () => get('/api/system/menu/list');

/** 获取菜单详情 */
export const getMenuDetailApi = (id) => get(`/api/system/menu/detail/${id}`);

/** 添加菜单 */
export const addMenuApi = (data) => post('/api/system/menu/add', data);

/** 更新菜单 */
export const updateMenuApi = (data) => put('/api/system/menu/update', data);

/** 删除菜单 */
export const deleteMenuApi = (id) => del(`/api/system/menu/delete/${id}`);

/** 切换菜单状态 */
export const toggleMenuStatusApi = (id, _status) => put(`/api/system/menu/status/${id}`);

/** 获取权限树（用于角色权限分配） */
export const getPermissionTreeApi = () => get('/api/system/menu/permission-tree');

/** 获取角色权限 */
export const getRolePermissionsApi = (roleId) => get(`/api/system/role/permissions/${roleId}`);

/** 保存角色权限 */
export const saveRolePermissionsApi = (roleId, permissions) => put(`/api/system/role/permissions/${roleId}`, permissions);