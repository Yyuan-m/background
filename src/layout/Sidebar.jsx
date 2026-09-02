import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Spin } from 'antd';
import {
  DashboardOutlined, CarOutlined, ShoppingCartOutlined, TeamOutlined,
  UserOutlined, DollarOutlined, SettingOutlined, GiftOutlined,
  ToolOutlined, AuditOutlined, ShopOutlined, SafetyCertificateOutlined,
  ScheduleOutlined, NotificationOutlined,
} from '@ant-design/icons';
import useAppStore from '@/store/useAppStore';
import useAuthStore from '@/store/useAuthStore';
import useThemeStore from '@/store/useThemeStore';
import { t } from '@/i18n';
import '@/layout/Sidebar.scss';

const { Sider } = Layout;

const iconMap = {
  DashboardOutlined: <DashboardOutlined />,
  CarOutlined: <CarOutlined />,
  ShoppingCartOutlined: <ShoppingCartOutlined />,
  TeamOutlined: <TeamOutlined />,
  UserOutlined: <UserOutlined />,
  DollarOutlined: <DollarOutlined />,
  GiftOutlined: <GiftOutlined />,
  ToolOutlined: <ToolOutlined />,
  SettingOutlined: <SettingOutlined />,
  AuditOutlined: <AuditOutlined />,
  ShopOutlined: <ShopOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  ScheduleOutlined: <ScheduleOutlined />,
  NotificationOutlined: <NotificationOutlined />,
};

// 递归查找路径的所有祖先 key
const getAncestorKeys = (items, targetPath) => {
  for (const item of items) {
    if (item.children) {
      for (const child of item.children) {
        if (targetPath.startsWith(child.key)) {
          // 递归检查子项是否还有子项
          const deeper = child.children ? getAncestorKeys([child], targetPath) : [];
          return [item.key, ...deeper];
        }
      }
    }
    if (item.key === targetPath || targetPath.startsWith(`${item.key  }/`)) {
      if (item.children) {
        return [item.key, ...getAncestorKeys(item.children, targetPath)];
      }
      return [];
    }
  }
  return [];
};

const Sidebar = ({ horizontal = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, menuTree, menuLoading } = useAppStore();
  const { hasPermission } = useAuthStore();
  const { sidebarWidth: sidebarWidthKey } = useThemeStore();

  // 侧边栏宽度 → 像素值
  const sidebarWidthMap = { compact: 200, default: 240, wide: 280 };
  const sidebarWidth = sidebarWidthMap[sidebarWidthKey] || 240;

  const filteredItems = useMemo(() =>
    menuTree
      .filter((item) => hasPermission(item.permission))
      .map((item) => {
        if (item.children) {
          return {
            ...item,
            icon: item.icon ? iconMap[item.icon] : null,
            children: item.children.filter((child) => hasPermission(child.permission)),
          };
        }
        return { ...item, icon: item.icon ? iconMap[item.icon] : null };
      }),
    [menuTree, hasPermission],
  );

  // 当前路径选中的菜单项 key
  // 采用「最长前缀匹配」：/vehicles/maintenance 应命中维保记录而非车辆列表(/vehicles)
  const selectedKeys = useMemo(() => {
    const path = location.pathname;
    // 收集所有可命中的菜单 key（顶级 + 子菜单），取 path 的最长前缀作为选中项
    const allKeys = [];
    filteredItems.forEach((item) => {
      allKeys.push({ key: item.key, len: item.key.length });
      if (item.children) {
        item.children.forEach((child) => allKeys.push({ key: child.key, len: child.key.length }));
      }
    });
    const matched = allKeys
      .filter(({ key }) => path === key || path.startsWith(key.endsWith('/') ? key : `${key}/`))
      .sort((a, b) => b.len - a.len);
    return matched.length > 0 ? [matched[0].key] : [path];
  }, [location.pathname, filteredItems]);

  // 受控的展开菜单项（手风琴：每次只展开一个有子菜单的父级）
  const [openKeys, setOpenKeys] = useState(() =>
    getAncestorKeys(menuTree, location.pathname),
  );

  // 路径变化时展开当前路径所在父级，并收起其它父级（手风琴）
  useEffect(() => {
    const ancestors = getAncestorKeys(menuTree, location.pathname);
    // 取最深一层父级：只展开一个
    const next = ancestors.length > 0 ? [ancestors[ancestors.length - 1]] : [];
    setOpenKeys(next);
  }, [location.pathname]);

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleOpenChange = (keys) => {
    // 手风琴：每次只展开一个父级。受控模式下 onOpenChange 返回最新展开集合，
    // antd inline 菜单最近操作（展开）的父级位于数组末尾，因此只保留它就是想要的唯一展开项。
    // 触发收起（keys 为空或减少）时直接跟随，允许完全收起。
    if (keys.length > 1) {
      setOpenKeys([keys[keys.length - 1]]);
    } else {
      setOpenKeys(keys);
    }
  };

  if (horizontal) {
    return (
      <div className="sidebar-horizontal">
        <div className="sidebar-horizontal-logo" onClick={() => navigate('/dashboard')}>
          <CarOutlined style={{ fontSize: 24, color: 'var(--accent-color, #c9a96e)' }} />
          <div className="sidebar-horizontal-logo-text">
            <span className="logo-title">{t('login.brandName')}</span>
            <span className="logo-subtitle">{t('login.brandSubtitle')}</span>
          </div>
        </div>
        {menuLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'flex-end', paddingRight: 24 }}>
            <Spin size="small" />
          </div>
        ) : (
          <Menu
            mode="horizontal"
            selectedKeys={selectedKeys}
            items={filteredItems}
            onClick={handleMenuClick}
            className="sidebar-horizontal-menu"
            style={{ flex: 1, borderBottom: 'none', background: 'transparent', justifyContent: 'flex-end' }}
          />
        )}
      </div>
    );
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={sidebarCollapsed}
      collapsedWidth={80}
      width={sidebarWidth}
      className="sidebar"
    >
      <div className="sidebar-logo">
        <CarOutlined style={{ fontSize: sidebarCollapsed ? 24 : 28, color: 'var(--accent-color, #c9a96e)' }} />
        {!sidebarCollapsed && (
          <div className="sidebar-logo-text">
            <span className="logo-title">{t('login.brandName')}</span>
            <span className="logo-subtitle">{t('login.brandSubtitle')}</span>
          </div>
        )}
      </div>
      {menuLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={sidebarCollapsed ? [] : openKeys}
          onOpenChange={handleOpenChange}
          items={filteredItems}
          onClick={handleMenuClick}
          className="sidebar-menu"
          style={{ background: 'transparent', borderRight: 'none' }}
        />
      )}
    </Sider>
  );
};

export default Sidebar;
