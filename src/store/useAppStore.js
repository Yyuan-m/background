import { create } from 'zustand';
import { getMenuListApi } from '@/api/modules/menu';
import { STORAGE_KEYS } from '@/constants';

const TABS_STORAGE_KEY = STORAGE_KEYS.TABS;
const SIDEBAR_STORAGE_KEY = STORAGE_KEYS.SIDEBAR_COLLAPSED;

// 从 localStorage 恢复标签页
const loadTabs = () => {
  try {
    const stored = localStorage.getItem(TABS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// 保存标签页到 localStorage
const saveTabs = (tabs) => {
  try {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
  } catch { /* ignore */ }
};

// 从 localStorage 恢复侧边栏状态
const loadSidebarCollapsed = () => {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const savedTabs = loadTabs();

// 将扁平菜单列表转换为侧边栏 Menu 组件格式
const buildSidebarMenu = (list) => {
  if (!list || list.length === 0) return [];
  const topLevel = list.filter((m) => !m.parentId && m.status === 1);
  const sorted = topLevel.sort((a, b) => a.sort - b.sort);
  return sorted.map((item) => {
    const children = list.filter(
      (m) => m.parentId === item.id && m.status === 1,
    ).sort((a, b) => a.sort - b.sort);
    const result = {
      key: item.path,
      icon: item.icon,
      label: item.name,
      permission: item.permission,
    };
    if (children.length > 0) {
      result.children = children.map((child) => ({
        key: child.path,
        label: child.name,
        permission: child.permission,
      }));
    }
    return result;
  });
};

const useAppStore = create((set, get) => ({
  sidebarCollapsed: loadSidebarCollapsed(),
  toggleSidebar: () => set((state) => {
    const next = !state.sidebarCollapsed;
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    return { sidebarCollapsed: next };
  }),
  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },

  // 多标签页管理
  tabs: savedTabs,
  activeTab: null,

  addTab: (tab) => {
    const { tabs } = get();
    const exists = tabs.find((t) => t.key === tab.key);
    let newTabs;
    if (!exists) {
      newTabs = [...tabs, tab];
      saveTabs(newTabs);
      set({ tabs: newTabs, activeTab: tab.key });
    } else {
      set({ activeTab: tab.key });
    }
  },

  removeTab: (key) => {
    const { tabs, activeTab } = get();
    const newTabs = tabs.filter((t) => t.key !== key);
    saveTabs(newTabs);
    if (activeTab === key && newTabs.length > 0) {
      set({ tabs: newTabs, activeTab: newTabs[newTabs.length - 1].key });
    } else {
      set({ tabs: newTabs });
    }
  },

  setActiveTab: (key) => set({ activeTab: key }),

  // 更新已有标签页的标题
  updateTabLabel: (key, label) => {
    const { tabs } = get();
    const newTabs = tabs.map((t) => (t.key === key ? { ...t, label } : t));
    saveTabs(newTabs);
    set({ tabs: newTabs });
  },

  breadcrumb: [],
  setBreadcrumb: (breadcrumb) => set({ breadcrumb }),

  // 动态菜单树（侧边栏渲染数据源）
  menuTree: [],
  menuLoading: false,

  // 从后端加载菜单树
  loadMenuTree: async () => {
    set({ menuLoading: true });
    try {
      const data = await getMenuListApi();
      const tree = buildSidebarMenu(data);
      set({ menuTree: tree });
    } catch {
      // 菜单加载失败时保持空菜单
    } finally {
      set({ menuLoading: false });
    }
  },

  // 刷新菜单树
  refreshMenuTree: async () => {
    set({ menuLoading: true });
    try {
      const data = await getMenuListApi();
      const tree = buildSidebarMenu(data);
      set({ menuTree: tree });
    } catch { /* ignore */ } finally {
      set({ menuLoading: false });
    }
  },

  // 使用已有扁平菜单列表直接更新侧边栏菜单树（避免重复请求被去重机制取消）
  setMenuTreeFromList: (list) => {
    const tree = buildSidebarMenu(list);
    set({ menuTree: tree });
  },
}));

export default useAppStore;