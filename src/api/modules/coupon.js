/**
 * 优惠券管理 API
 */
import { get, post, put, del } from '@/api/request';

/** 获取优惠券列表 */
export const getCouponListApi = (params) =>
  get('/api/coupon/list', params);

/** 获取优惠券详情（含关联车辆） */
export const getCouponDetailApi = (id) =>
  get(`/api/coupon/${id}`);

/** 新增优惠券（默认草稿态，需确认投放后C端才可见） */
export const addCouponApi = (data) =>
  post('/api/coupon/add', data, { successMsg: '优惠券新增成功（草稿态，需确认投放后C端可见）' });

/** 更新优惠券 */
export const updateCouponApi = (data) =>
  put('/api/coupon/update', data, { successMsg: '优惠券更新成功' });

/** 删除优惠券 */
export const deleteCouponApi = (id) =>
  del(`/api/coupon/${id}`, { successMsg: '优惠券已删除' });

/** 确认投放（草稿/下线 → 已投放，二次确认防止误发） */
export const publishCouponApi = (id) =>
  put(`/api/coupon/${id}/publish`, null, { successMsg: '已确认投放，C端可见可领' });

/** 下线（已投放 → 已下线） */
export const offlineCouponApi = (id) =>
  put(`/api/coupon/${id}/offline`, null, { successMsg: '已下线' });

/** 兼容旧状态切换 */
export const toggleCouponStatusApi = (id, status) =>
  put(`/api/coupon/${id}/status`, { status }, { successMsg: '状态切换成功' });

/** 设置关联车辆（一对多） */
export const saveCouponCarsApi = (id, carIds) =>
  put(`/api/coupon/${id}/cars`, { carIds });

/** 查询关联车辆ID列表 */
export const listCouponCarsApi = (id) =>
  get(`/api/coupon/${id}/cars`);

/** 领取记录 */
export const listReceiveRecordsApi = (id) =>
  get(`/api/coupon/${id}/receive-records`);

// 别名
export const getCouponsApi = getCouponListApi;
