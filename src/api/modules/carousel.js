/**
 * 轮播图管理 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取轮播图列表 */
export const getCarouselListApi = (params) =>
  get('/api/carousel/list', params);

/** 获取启用的轮播图（前台） */
export const getActiveCarouselApi = () =>
  get('/api/carousel/active');

/** 获取轮播图详情 */
export const getCarouselDetailApi = (id) =>
  get(`/api/carousel/${id}`);

/** 新增轮播图 */
export const addCarouselApi = (data) =>
  post('/api/carousel/add', data, { successMsg: '新增成功' });

/** 更新轮播图 */
export const updateCarouselApi = (data) =>
  put('/api/carousel/update', data, { successMsg: '编辑成功' });

/** 删除轮播图 */
export const deleteCarouselApi = (id) =>
  del(`/api/carousel/${id}`, { successMsg: '删除成功' });

/** 切换轮播图状态 */
export const toggleCarouselStatusApi = (id, status) =>
  put(`/api/carousel/${id}/status`, { status }, { successMsg: '状态切换成功' });

// 别名
export const getCarouselsApi = getCarouselListApi;
