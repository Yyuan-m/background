/**
 * 数据字典 API
 */
import { get, post, put, del } from '@/api/request';

// ==================== 字典类型 ====================

/** 获取字典类型列表（分页，支持筛选） */
export const getDictTypesApi = (params) =>
  get('/api/dict/types', params);

/** 获取全部字典类型（不分页，用于下拉选择） */
export const getAllDictTypesApi = () =>
  get('/api/dict/types/all');

/** 根据 type 查询字典类型 */
export const getDictTypeByTypeApi = (type) =>
  get(`/api/dict/types/${type}`);

/** 统计某 type 编码下的字典数据条数（删除前校验用） */
export const countDictDataByTypeApi = (type) =>
  get(`/api/dict/type/count-data/${type}`);

/** 新增字典类型 */
export const addDictTypeApi = (data) =>
  post('/api/dict/type', data, { successMsg: '字典类型新增成功' });

/** 更新字典类型 */
export const updateDictTypeApi = (data) =>
  put('/api/dict/type', data, { successMsg: '字典类型更新成功' });

/** 删除字典类型 */
export const deleteDictTypeApi = (id) =>
  del(`/api/dict/type/${id}`, { successMsg: '字典类型已删除' });

/** 批量删除字典类型 */
export const batchDeleteDictTypeApi = (ids) =>
  post('/api/dict/type/batch', { ids }, { successMsg: `已批量删除 ${ids.length} 项` });

// ==================== 字典数据 ====================

/** 分页查询字典数据（支持筛选） */
export const getDictDataPageApi = (params) =>
  get('/api/dict/data', params);

/** 根据 type 查询启用的字典数据列表（不分页，用于下拉）
 *  关闭请求去重：DictSelect 与 useDict 会各自发起该请求，
 *  去重会导致先发起的请求被 abort 并缓存空结果，使下拉框无数据。
 */
export const getDictDataByTypeApi = (type) =>
  get(`/api/dict/data/${type}`, {}, { deduplicate: false });

/** 新增字典数据 */
export const addDictDataApi = (data) =>
  post('/api/dict/data', data, { successMsg: '字典数据新增成功' });

/** 更新字典数据 */
export const updateDictDataApi = (data) =>
  put('/api/dict/data', data, { successMsg: '字典数据更新成功' });

/** 删除字典数据 */
export const deleteDictDataApi = (id) =>
  del(`/api/dict/data/${id}`, { successMsg: '字典数据已删除' });

/** 批量删除字典数据 */
export const batchDeleteDictDataApi = (ids) =>
  post('/api/dict/data/batch', { ids }, { successMsg: `已批量删除 ${ids.length} 项` });

// 别名
export const getDictTypesListApi = getDictTypesApi;
