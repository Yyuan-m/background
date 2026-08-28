import React, { useEffect, useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Breadcrumb, Tabs, Modal, Dropdown } from 'antd';
import { HomeOutlined, CloseOutlined, EllipsisOutlined, CloseCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined, ClearOutlined, DashboardOutlined, CarOutlined, ShoppingCartOutlined, TeamOutlined, DollarOutlined, SettingOutlined, GiftOutlined, ToolOutlined, AuditOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, ShopOutlined, NotificationOutlined } from '@ant-design/icons';
import Sidebar from '@/layout/Sidebar';
import Header from '@/layout/Header';
import ThemeConfig from '@/components/ThemeConfig/ThemeConfig';
import { getSystemSettingsApi } from '@/api/modules/system';

// 联系信息默认值（接口未返回时兜底使用）
const DEFAULT_CONTACT_INFO = {
  contactPhone: '400-888-8888',
  contactEmail: 'service@luxurycar.com',
  address: '中国·上海',
};

import useAppStore from '@/store/useAppStore';
import useThemeStore from '@/store/useThemeStore';
import { startTokenAutoRefresh, stopTokenAutoRefresh } from '@/utils/tokenRefresh';
import { t } from '@/i18n';
import '@/layout/MainLayout.scss';

const { Content } = Layout;

const breadcrumbMap = {
  '/dashboard': t('breadcrumb.dashboard'),
  '/vehicles': t('breadcrumb.vehicles'),
  '/orders': t('breadcrumb.orders'),
  '/customers': t('breadcrumb.customers'),
  '/finance': t('breadcrumb.finance'),
  '/marketing': t('breadcrumb.marketing'),
  '/after-sales': t('breadcrumb.afterSales'),
  '/feedback': t('breadcrumb.feedback'),
  '/settings': t('breadcrumb.settings'),
  '/settings/system': t('breadcrumb.system'),
  '/announcements': t('breadcrumb.announcements'),
  '/settings/profile': t('breadcrumb.profile'),
  '/settings/carousel': t('breadcrumb.carousel'),
  '/settings/dictionary': t('breadcrumb.dictionary'),
  '/settings/users': t('breadcrumb.users'),
  '/settings/roles': t('breadcrumb.roles'),
  '/settings/menus': t('breadcrumb.menus'),
  '/settings/files': '文件管理',
  '/settings/logs': t('breadcrumb.logs'),
  '/settings/store': '门店配置',
};

const dynamicDetailMap = {
  '/orders': t('breadcrumb.orderDetail'),
  '/vehicles': t('breadcrumb.vehicleDetail'),
  '/customers': t('breadcrumb.customerDetail'),
};

const tabLabelMap = breadcrumbMap;

// 路由 → 图标映射（按优先级排序，具体路径优先）
const routeIconMap = [
  { path: '/dashboard', icon: <DashboardOutlined /> },
  { path: '/vehicles', icon: <CarOutlined /> },
  { path: '/orders', icon: <ShoppingCartOutlined /> },
  { path: '/customers', icon: <TeamOutlined /> },
  { path: '/finance', icon: <DollarOutlined /> },
  { path: '/marketing', icon: <GiftOutlined /> },
  { path: '/after-sales', icon: <ToolOutlined /> },
  { path: '/announcements', icon: <NotificationOutlined /> },
  { path: '/settings/logs', icon: <AuditOutlined /> },
  { path: '/settings/store', icon: <ShopOutlined /> },
  { path: '/settings', icon: <SettingOutlined /> },
];

const getTabIcon = (path) => {
  for (const entry of routeIconMap) {
    if (path === entry.path || path.startsWith(entry.path)) {
      return entry.icon;
    }
  }
  return null;
};

// 纯函数：根据路由路径推导标签页名称（仅依赖模块级常量，移至组件外部避免每次渲染重建）
const getTabLabel = (path) => {
  if (tabLabelMap[path]) return tabLabelMap[path];
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 2) {
    const parentPath = `/${segments[0]}`;
    const detailName = dynamicDetailMap[parentPath];
    if (detailName) return detailName;
  }
  return path;
};

// 侧边栏宽度映射（常量，移至组件外部）
const sidebarWidthMap = { compact: 200, default: 240, wide: 280 };
const collapsedWidth = 80;

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, tabs, activeTab, addTab, removeTab, loadMenuTree } = useAppStore();
  const { layout, showTabs, tabStyle, showTabIcons, sidebarWidth: sidebarWidthKey, fixedHeader } = useThemeStore();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingRemoveKey, setPendingRemoveKey] = useState(null);
  const [contactInfo, setContactInfo] = useState({
    contactPhone: DEFAULT_CONTACT_INFO.contactPhone,
    contactEmail: DEFAULT_CONTACT_INFO.contactEmail,
    address: DEFAULT_CONTACT_INFO.address,
  });

  const isHorizontal = layout === 'horizontal';

  // 拉取系统设置中的联系信息
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getSystemSettingsApi();
        if (mounted && res) {
          setContactInfo({
            contactPhone: res.contactPhone || DEFAULT_CONTACT_INFO.contactPhone,
            contactEmail: res.contactEmail || DEFAULT_CONTACT_INFO.contactEmail,
            address: res.address || DEFAULT_CONTACT_INFO.address,
          });
        }
      } catch {
        // 使用默认值
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 自动添加标签页
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/login' || path === '/register') return;

    const { breadcrumb: storeBreadcrumb } = useAppStore.getState();
    const dynamicLabel = storeBreadcrumb.find((b) => b.path === path)?.label;
    const label = dynamicLabel || getTabLabel(path);
    addTab({ key: path, label, closable: path !== '/dashboard' });
  }, [location.pathname]);

  // 加载菜单树
  useEffect(() => {
    loadMenuTree();
  }, []);

  // 启动 token 无感刷新（主动定时刷新 + 多标签页同步）；卸载时停止
  useEffect(() => {
    startTokenAutoRefresh();
    return () => stopTokenAutoRefresh();
  }, []);

  // 侧边栏宽度映射
  const sidebarWidthPx = sidebarWidthMap[sidebarWidthKey] || 240;

  const handleTabChange = (key) => {
    navigate(key);
  };

  const handleRemoveTab = (targetKey) => {
    const currentTabs = useAppStore.getState().tabs;
    const closableTabs = currentTabs.filter((t) => t.closable !== false);
    const isLastClosable =
      closableTabs.length <= 1 &&
      currentTabs.find((t) => t.key === targetKey)?.closable !== false;

    if (isLastClosable) {
      setPendingRemoveKey(targetKey);
      setConfirmVisible(true);
      return;
    }

    removeTab(targetKey);
    const currentIndex = currentTabs.findIndex((t) => t.key === targetKey);
    if (targetKey === activeTab) {
      const nextTab = currentTabs[currentIndex - 1] || currentTabs[currentIndex + 1];
      if (nextTab) navigate(nextTab.key);
    }
  };

  const handleConfirmClose = () => {
    if (pendingRemoveKey) {
      removeTab(pendingRemoveKey);
    }
    navigate('/dashboard');
    setConfirmVisible(false);
    setPendingRemoveKey(null);
  };

  const handleCancelClose = () => {
    setConfirmVisible(false);
    setPendingRemoveKey(null);
  };

  const closeCurrent = () => {
    const currentTabs = useAppStore.getState().tabs;
    const currentTab = currentTabs.find((t) => t.key === activeTab);
    if (!currentTab || currentTab.closable === false) return;
    handleRemoveTab(activeTab);
  };

  const closeLeft = () => {
    const currentTabs = useAppStore.getState().tabs;
    const currentIndex = currentTabs.findIndex((t) => t.key === activeTab);
    if (currentIndex <= 0) return;
    const leftTabs = currentTabs.slice(0, currentIndex);
    leftTabs.forEach((tab) => {
      if (tab.closable !== false) removeTab(tab.key);
    });
  };

  const closeRight = () => {
    const currentTabs = useAppStore.getState().tabs;
    const currentIndex = currentTabs.findIndex((t) => t.key === activeTab);
    if (currentIndex < 0 || currentIndex >= currentTabs.length - 1) return;
    const rightTabs = currentTabs.slice(currentIndex + 1);
    rightTabs.forEach((tab) => {
      if (tab.closable !== false) removeTab(tab.key);
    });
  };

  const closeAll = () => {
    const currentTabs = useAppStore.getState().tabs;
    const closableTabs = currentTabs.filter((t) => t.closable !== false);
    if (closableTabs.length === 0) return;
    closableTabs.forEach((tab) => removeTab(tab.key));
    navigate('/dashboard');
  };

  const breadcrumbMenuItems = useMemo(() => {
    const currentIndex = tabs.findIndex((t) => t.key === activeTab);
    const currentTab = tabs[currentIndex];
    const closableTabs = tabs.filter((t) => t.closable !== false);

    return [
      {
        key: 'close-current',
        icon: <CloseCircleOutlined />,
        label: t('common.closeCurrent'),
        disabled: !currentTab || currentTab.closable === false,
        onClick: closeCurrent,
      },
      {
        key: 'close-left',
        icon: <ArrowLeftOutlined />,
        label: t('common.closeLeft'),
        disabled: currentIndex <= 0,
        onClick: closeLeft,
      },
      {
        key: 'close-right',
        icon: <ArrowRightOutlined />,
        label: t('common.closeRight'),
        disabled: currentIndex < 0 || currentIndex >= tabs.length - 1,
        onClick: closeRight,
      },
      { type: 'divider' },
      {
        key: 'close-all',
        icon: <ClearOutlined />,
        label: t('common.closeAll'),
        disabled: closableTabs.length === 0,
        danger: true,
        onClick: closeAll,
      },
    ];
  }, [activeTab, tabs]);

  const breadcrumbItems = useMemo(() => {
    const pathSnippets = location.pathname.split('/').filter((i) => i);
    const items = [{ title: <><HomeOutlined style={{ marginRight: 4 }} />{t('breadcrumb.home')}</>, path: '/dashboard' }];
    let url = '';
    pathSnippets.forEach((snippet, index) => {
      url += `/${snippet}`;
      const name = breadcrumbMap[url];
      if (name) {
        items.push({ title: name, path: url });
      } else if (index === pathSnippets.length - 1) {
        const { breadcrumb: storeBreadcrumb } = useAppStore.getState();
        const dynamicLabel = storeBreadcrumb.find((b) => b.path === location.pathname)?.label;
        if (dynamicLabel) {
          items.push({ title: dynamicLabel, path: location.pathname });
        }
      }
    });
    return items;
  }, [location.pathname]);

  // 内层布局的 marginLeft，与 Sidebar 的 width 使用相同的过渡曲线
  // 直接通过 inline style 设置值，CSS transition 负责动画，
  // 不再通过 useEffect 写入 CSS 变量（消除异步一帧延迟导致的卡顿）
  const innerLayoutStyle = isHorizontal
    ? {}
    : {
        marginLeft: sidebarCollapsed ? collapsedWidth : sidebarWidthPx,
      };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 横向布局：顶部导航；纵向布局：侧边栏 */}
      {isHorizontal ? <Sidebar horizontal /> : <Sidebar />}

      <Layout className={fixedHeader ? "main-layout" : "main-layout main-layout--scroll"} style={innerLayoutStyle}>
        <Header />
        <div className="breadcrumb-wrapper">
          <div className="breadcrumb-inner">
            <Breadcrumb
              items={breadcrumbItems}
              itemRender={(route, _params, routes) => {
                const isLast = routes.indexOf(route) === routes.length - 1;
                if (isLast) {
                  return <span>{route.title}</span>;
                }
                return (
                  <a onClick={(e) => { e.preventDefault(); navigate(route.path); }}>
                    {route.title}
                  </a>
                );
              }}
            />
          </div>
          <Dropdown menu={{ items: breadcrumbMenuItems }} trigger={['click']} placement="bottomRight">
            <span className="breadcrumb-more-btn" title={t('common.tabOperations')}>
              <EllipsisOutlined />
            </span>
          </Dropdown>
        </div>

        {/* 多标签页导航 */}
        {showTabs && tabs.length > 0 && (
          <div className={`tabs-wrapper tabs-wrapper--${tabStyle}`}>
            <Tabs
              type={tabStyle === 'card' ? 'editable-card' : 'line'}
              hideAdd
              activeKey={activeTab}
              onChange={handleTabChange}
              items={tabs.map((tab) => ({
                key: tab.key,
                label: (
                  <span className="tab-label-custom">
                    {showTabIcons && getTabIcon(tab.key) && React.cloneElement(getTabIcon(tab.key), { style: { fontSize: 12 } })}
                    {tab.label}
                    {tab.closable !== false && (
                      <CloseOutlined
                        className="tab-close-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTab(tab.key);
                        }}
                      />
                    )}
                  </span>
                ),
                closable: false,
              }))}
              size="small"
            />
          </div>
        )}

        <Content className="main-content" style={{ maxWidth: 'var(--content-max-width, 100%)', margin: '0 auto', width: '100%' }}>
          <Outlet />
        </Content>

        {/* 底部联系我们模块 */}
        <footer className="app-footer">
          <div className="app-footer-inner">
            <span className="app-footer-title">联系我们：</span>
            <a href={`tel:${contactInfo.contactPhone}`} className="app-footer-link" title="点击拨打电话">
              <PhoneOutlined />
              <span>{contactInfo.contactPhone}</span>
            </a>
            <a href={`mailto:${contactInfo.contactEmail}`} className="app-footer-link" title="点击发送邮件">
              <MailOutlined />
              <span>{contactInfo.contactEmail}</span>
            </a>
            <span className="app-footer-link app-footer-text" title="公司地址">
              <EnvironmentOutlined />
              <span>{contactInfo.address}</span>
            </span>
          </div>
        </footer>
      </Layout>

      {/* 主题配置 */}
      <ThemeConfig />

      <Modal
        title={t('common.tip')}
        open={confirmVisible}
        onOk={handleConfirmClose}
        onCancel={handleCancelClose}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        {t('common.confirmCloseTab')}
      </Modal>
    </Layout>
  );
};

export default MainLayout;
