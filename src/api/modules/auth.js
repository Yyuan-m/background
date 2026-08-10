/**
 * 认证相关 API
 */
import { get, post } from '@/api/request';

/** 登录 */
export const loginApi = (data) => post('/api/auth/login', data, { showError: false });

/** 注册 */
export const registerApi = (data) => post('/api/auth/register', data);

/** 获取当前用户信息 */
export const getUserInfoApi = () => get('/api/auth/user/info');

/** 退出登录 */
export const logoutApi = () => post('/api/auth/logout');

/** 找回密码 - 身份验证（用户名+邮箱） */
export const forgotPasswordVerifyApi = (data) =>
  post('/api/auth/forgot-password/verify', data, { showError: false });

/** 找回密码 - 重置密码（令牌+新密码） */
export const forgotPasswordResetApi = (data) =>
  post('/api/auth/forgot-password/reset', data, { showError: false });
