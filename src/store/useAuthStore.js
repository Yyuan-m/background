import { create } from 'zustand';
import auth from '@/utils/auth';
import { loginApi, registerApi } from '@/api/modules/auth';
import { getProfileInfoApi } from '@/api/modules/profile';
import useAppStore from '@/store/useAppStore';
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

// 按钮级权限动作词（权限标识末段为这些词的，均为按钮/操作权限，必须精确拥有）
// 与后端 sys_menu type='button' 的权限标识命名约定一致
const ACTION_WORDS = new Set([
  'add', 'update', 'delete', 'status', 'handle', 'process',
  'restore', 'reset-password', 'export', 'import',
]);

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
        // 新登录：清除上一个账号残留的标签页/菜单树/面包屑（切换账号场景）
        useAppStore.getState().resetUserState();
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
    // 清除标签页/菜单树等用户态，避免切换账号时残留
    useAppStore.getState().resetUserState();
  },

  // 无感刷新成功后同步 store 中的 token（user/permissions 不变）
  setToken: (token) => {
    set({ token });
  },

  setUser: (user) => {
    auth.setUser(user);
    set({ user });
  },

  // 刷新当前用户信息（从后端 /api/profile/info 拉取并同步到本地）。
  // 权限集合内容无变化时保留原数组引用，避免轮询触发整站无意义的重渲染
  refreshUser: async () => {
    try {
      const user = await getProfileInfoApi();
      if (user) {
        auth.setUser(user);
        const nextPerms = user.permissions || [];
        const { permissions: prevPerms } = get();
        const samePerms = prevPerms.length === nextPerms.length
          && prevPerms.every((p) => nextPerms.includes(p));
        set({ user, permissions: samePerms ? prevPerms : nextPerms });
      }
      return user;
    } catch (e) {
      return null;
    }
  },

  hasPermission: (permission) => {
    // 无权限标识的菜单/路由对所有登录用户开放
    if (!permission) return true;
    const { permissions } = get();
    if (permissions.includes('*')) return true;
    // 精确匹配
    if (permissions.includes(permission)) return true;
    // 按钮级权限必须精确拥有，不走层级匹配（与后端 PermissionAspect 规则一致）：
    // 1) 权限标识 ≥3 段（如 vehicle:maintenance:add、settings:user:reset-password）
    // 2) 末段为动作词（如 vehicle:add、order:delete、feedback:process）
    const parts = permission.split(':');
    if (parts.length >= 3 || ACTION_WORDS.has(parts[parts.length - 1])) {
      return false;
    }
    // 菜单级权限支持层级匹配：拥有 settings 则自动拥有 settings:xxx
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
