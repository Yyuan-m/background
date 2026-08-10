import storage from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants';

const TOKEN_KEY = STORAGE_KEYS.TOKEN;
const REFRESH_TOKEN_KEY = STORAGE_KEYS.REFRESH_TOKEN;
const USER_KEY = STORAGE_KEYS.USER;
const REMEMBER_KEY = STORAGE_KEYS.REMEMBER;

/**
 * 认证工具类
 */
const auth = {
  /**
   * 获取 access token
   */
  getToken() {
    return storage.get(TOKEN_KEY, '');
  },

  /**
   * 设置 access token
   */
  setToken(token) {
    storage.set(TOKEN_KEY, token);
  },

  /**
   * 移除 access token
   */
  removeToken() {
    storage.remove(TOKEN_KEY);
  },

  /**
   * 获取 refresh token（用于无感刷新）
   */
  getRefreshToken() {
    return storage.get(REFRESH_TOKEN_KEY, '');
  },

  /**
   * 设置 refresh token
   */
  setRefreshToken(token) {
    storage.set(REFRESH_TOKEN_KEY, token);
  },

  /**
   * 移除 refresh token
   */
  removeRefreshToken() {
    storage.remove(REFRESH_TOKEN_KEY);
  },

  /**
   * 获取当前用户信息
   */
  getUser() {
    return storage.get(USER_KEY, null);
  },

  /**
   * 设置用户信息
   */
  setUser(user) {
    storage.set(USER_KEY, user);
  },

  /**
   * 移除用户信息
   */
  removeUser() {
    storage.remove(USER_KEY);
  },

  /**
   * 是否已登录
   */
  isLoggedIn() {
    return !!this.getToken();
  },

  /**
   * 记住密码相关
   */
  getRemember() {
    return storage.get(REMEMBER_KEY, null);
  },

  setRemember(data) {
    storage.set(REMEMBER_KEY, data);
  },

  removeRemember() {
    storage.remove(REMEMBER_KEY);
  },

  /**
   * 退出登录 - 清除所有认证信息和本地状态
   */
  logout() {
    this.clearAll();
  },

  /**
   * 清除所有本地用户信息（token、用户信息、标签页、侧边栏状态等）
   * 用于错误页面跳转登录前彻底清理，保护用户隐私
   * 注意：不清除“记住密码”数据，这是用户的持久偏好，
   * 仅在登录时取消勾选“记住密码”才会清除（见 Login/index.jsx 的 onFinish）
   */
  clearAll() {
    // 清除所有 localStorage 中的用户相关数据
    this.removeToken();
    this.removeRefreshToken();
    this.removeUser();
    // 清除应用状态（标签页、侧边栏折叠状态等）
    storage.remove(STORAGE_KEYS.TABS);
    storage.remove(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    storage.remove(STORAGE_KEYS.THEME_CONFIG);
    storage.remove(STORAGE_KEYS.PERMISSIONS);
    storage.remove(STORAGE_KEYS.LOCALE);
    // 清除 sessionStorage 中可能存在的敏感数据
    try {
      sessionStorage.clear();
    } catch { /* ignore */ }
    // 清除 window.__APP_CONFIG__ 中的用户数据
    try {
      if (window.__APP_CONFIG__) {
        window.__APP_CONFIG__.user = null;
      }
    } catch { /* ignore */ }
  },
};

export default auth;
