import { create } from 'zustand';
import storage from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants';

const PERMISSION_STORAGE_KEY = STORAGE_KEYS.PERMISSIONS;

const loadPermissions = () => {
  try {
    return storage.get(PERMISSION_STORAGE_KEY, null);
  } catch {
    return null;
  }
};

const savePermissions = (data) => {
  try {
    storage.set(PERMISSION_STORAGE_KEY, data);
  } catch { /* ignore */ }
};

const usePermissionStore = create((set, get) => ({
  // 当前用户菜单权限列表
  menuPermissions: [],

  // 权限树数据（用于分配权限弹窗）
  permissionTree: [],

  // 权限缓存
  permissionCache: loadPermissions(),

  // 设置菜单权限
  setMenuPermissions: (permissions) => {
    const data = { permissions, timestamp: Date.now() };
    savePermissions(data);
    set({ menuPermissions: permissions, permissionCache: data });
  },

  // 设置权限树
  setPermissionTree: (tree) => set({ permissionTree: tree }),

  // 检查是否有某菜单权限
  hasMenuPermission: (permissionKey) => {
    const { menuPermissions } = get();
    if (menuPermissions.includes('*')) return true;
    return menuPermissions.includes(permissionKey);
  },

  // 刷新权限（从缓存恢复）
  refreshPermissions: () => {
    const cached = loadPermissions();
    if (cached) {
      set({ menuPermissions: cached.permissions || [], permissionCache: cached });
    }
  },

  // 清除权限
  clearPermissions: () => {
    storage.remove(PERMISSION_STORAGE_KEY);
    set({ menuPermissions: [], permissionCache: null });
  },
}));

export default usePermissionStore;
