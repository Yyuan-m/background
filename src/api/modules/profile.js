/**
 * 个人中心 API
 */
import { get, post, put } from '@/api/request';

/** 获取当前用户信息 */
export const getProfileInfoApi = () => get('/api/profile/info');

/** 更新个人资料（nickname/email/phone） */
export const updateProfileApi = (data) =>
  put('/api/profile/update', data, { successMsg: '资料更新成功' });

/** 更新头像（传入上传后的图片 URL） */
export const updateAvatarApi = (avatar) =>
  post('/api/profile/avatar', { avatar }, { successMsg: '头像更新成功' });

/** 修改密码（从当前登录态取 userId，杜绝越权） */
export const changeProfilePasswordApi = (data) =>
  put('/api/profile/change-password', data, { successMsg: '密码修改成功' });
