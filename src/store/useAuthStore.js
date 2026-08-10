import { create } from 'zustand';
import auth from '@/utils/auth';
import { loginApi, registerApi } from '@/api/modules/auth';
import { getProfileInfoApi } from '@/api/modules/profile';
import {
  resetLoginExpiredFlag,
  stopTokenAutoRefresh,
} from '@/utils/tokenRefresh';

// 从已存储的用户信息中恢复权限
const getInitialPermissions = () => {
  const user = auth.getUser();
  if (!user) return [];
  return user.permissions || [];
};

const useAuthStore = create((set, get) => ({
  token: auth.getToken() || '',
  user: auth.getUser() || null,
  isLoggedIn: auth.isLoggedIn(),
  permissions: getInitialPermissions(),

  // 登录
  login: async (credentials) => {
    try {
      const result = await loginApi(credentials);
      if (result && result.token) {
        auth.setToken(result.token);
        // 存储 refresh token，供无感刷新使用
        if (result.refreshToken) auth.setRefreshToken(result.refreshToken);
        auth.setUser(result.user);
        const perms = result.user?.permissions || [];
        set({ token: result.token, user: result.user, isLoggedIn: true, permissions: perms });
        // 新会话建立：重置“登录已过期”去重标记
        resetLoginExpiredFlag();
        return { success: true };
      }
      return { success: false, error: '登录失败，用户名或密码错误' };
    } catch (err) {
      return { success: false, error: err?.message || '网络错误，请稍后重试' };
    }
  },

  register: async (data) => {
    const result = await registerApi(data);
    return result;
  },

  logout: () => {
    // 停止主动刷新定时器，清空等待队列
    stopTokenAutoRefresh();
    auth.logout();
    set({ token: '', user: null, isLoggedIn: false, permissions: [] });
  },

  // 无感刷新成功后同步 store 中的 token（user/permissions 不变）
  setToken: (token) => {
    set({ token });
  },

  setUser: (user) => {
    auth.setUser(user);
    set({ user });
  },

  // 刷新当前用户信息（从后端 /api/profile/info 拉取并同步到本地）
  refreshUser: async () => {
    try {
      const user = await getProfileInfoApi();
      if (user) {
        auth.setUser(user);
        set({ user, permissions: user.permissions || [] });
      }
      return user;
    } catch (e) {
      return null;
    }
  },

  hasPermission: (permission) => {
    const { permissions } = get();
    if (permissions.includes('*')) return true;
    // 支持层级权限：拥有 settings 则自动拥有 settings:xxx
    if (permissions.includes(permission)) return true;
    const colonIndex = permission.indexOf(':');
    if (colonIndex > 0) {
      const parent = permission.substring(0, colonIndex);
      if (permissions.includes(parent)) return true;
    }
    return false;
  },

  // 按钮级权限：检查模块权限 + 操作权限
  hasButtonPermission: (module, action) => {
    const { permissions } = get();
    if (permissions.includes('*')) return true;
    // 拥有模块权限即可进行基本操作，delete/export 需要 settings 权限
    if (action === 'delete' || action === 'export') {
      return permissions.includes(module) && permissions.includes('settings');
    }
    return permissions.includes(module);
  },
}));

export default useAuthStore;
