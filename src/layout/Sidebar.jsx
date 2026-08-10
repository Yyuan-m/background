import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Spin } from 'antd';
import {
  DashboardOutlined, CarOutlined, ShoppingCartOutlined, TeamOutlined,
  UserOutlined, DollarOutlined, SettingOutlined, GiftOutlined,
  ToolOutlined, AuditOutlined,
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
  const selectedKeys = useMemo(() => {
    const path = location.pathname;
    const matchedItem = filteredItems.find((item) => {
      if (item.children) return item.children.some((child) => path.startsWith(child.key));
      return path.startsWith(item.key);
    });
    if (matchedItem?.children) {
      const child = matchedItem.children.find((c) => path.startsWith(c.key));
      return child ? [child.key] : [path];
    }
    return [path];
  }, [location.pathname, filteredItems]);

  // 受控的展开菜单项
  const [openKeys, setOpenKeys] = useState(() =>
    getAncestorKeys(menuTree, location.pathname),
  );

  // 路径变化时自动展开对应父级
  useEffect(() => {
    const ancestors = getAncestorKeys(menuTree, location.pathname);
    setOpenKeys((prev) => {
      const merged = [...new Set([...prev, ...ancestors])];
      return merged;
    });
  }, [location.pathname]);

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleOpenChange = (keys) => {
    setOpenKeys(keys);
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
