/**
 * 系统文件管理 API
 */
import { get, post, del } from '@/api/request';

/** 分页查询文件列表（支持筛选） */
export const getFileListApi = (params) =>
  get('/api/file/list', params);

/** 获取文件详情 */
export const getFileDetailApi = (id) =>
  get(`/api/file/${id}`);

/** 逻辑删除（移入回收站） */
export const deleteFileApi = (id) =>
  del(`/api/file/${id}`, { successMsg: '已移入回收站' });

/** 批量逻辑删除（移入回收站） */
export const batchDeleteFileApi = (ids) =>
  post('/api/file/batch', { ids }, { successMsg: `已移入回收站 ${ids.length} 个文件` });

/** 物理删除（同时删除磁盘文件，不可恢复） */
export const physicalDeleteFileApi = (id) =>
  del(`/api/file/physical/${id}`, { successMsg: '文件已彻底删除' });

/** 批量物理删除（同时删除磁盘文件，不可恢复） */
export const batchPhysicalDeleteFileApi = (ids) =>
  post('/api/file/batch-physical', { ids }, { successMsg: `已彻底删除 ${ids.length} 个文件` });

/** 恢复文件（从回收站恢复） */
export const restoreFileApi = (id) =>
  post(`/api/file/restore/${id}`, null, { successMsg: '文件已恢复' });

/** 批量恢复文件 */
export const batchRestoreFileApi = (ids) =>
  post('/api/file/batch-restore', { ids }, { successMsg: `已恢复 ${ids.length} 个文件` });
