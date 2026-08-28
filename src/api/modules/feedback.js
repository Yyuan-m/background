/**
 * 预约咨询/留言反馈 API
 */
import { get, post, put, del } from '@/api/request';

/**
 * 记录列表
 * @param {Object} params { page, pageSize, type: appointment|feedback, status: pending|handled, keyword, startDate, endDate }
 */
export const getFeedbackListApi = (params) => get('/api/feedback/list', params);

/** 统计概览（total/pending/handled/today/upcoming/appointment/feedbackCount） */
export const getFeedbackStatsApi = () => get('/api/feedback/stats');

/** 记录详情（含关联会员信息） */
export const getFeedbackDetailApi = (id) => get(`/api/feedback/detail/${id}`);

/** 标记已处理（remark: 处理备注/沟通结果，必填） */
export const processFeedbackApi = (id, data) => post(`/api/feedback/process/${id}`, data);

/** 修改处理备注（仅已处理记录） */
export const updateFeedbackRemarkApi = (id, data) => put(`/api/feedback/remark/${id}`, data);

/** 删除记录 */
export const deleteFeedbackApi = (id) => del(`/api/feedback/delete/${id}`);
