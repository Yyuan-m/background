import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button, Dropdown, Avatar, Space, Input, AutoComplete } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  KeyOutlined,
  BellOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import useAppStore from '@/store/useAppStore';
import useAuthStore from '@/store/useAuthStore';
import useThemeStore from '@/store/useThemeStore';
import useFullscreen from '@/hooks/useFullscreen';
import useMenuSearch from '@/hooks/useMenuSearch';
import { clearCache } from '@/api/request';
import { logoutApi } from '@/api/modules/auth';
import auth from '@/utils/auth';
import { t } from '@/i18n';
import { imageUrl } from '@/utils/imageUrl';
import '@/layout/Header.scss';

const { Header: AntHeader } = Layout;

const Header = () => {
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar, refreshCurrentPage } = useAppStore();
  const { user, logout } = useAuthStore();
  const { layout, showRefresh, showSearch, showFullscreen, fixedHeader } = useThemeStore();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { keyword, setKeyword, results, open, setOpen, handleSelect, clearKeyword } = useMenuSearch();

  const isHorizontal = layout === 'horizontal';

  const handleLogout = async () => {
    // 通知后端拉黑 access/refresh token（失败不阻塞本地登出）
    try {
      await logoutApi({ refreshToken: auth.getRefreshToken() });
    } catch { /* 忽略，保证本地登出不受影响 */ }
    logout();
    // 清除请求缓存，防止下一个用户看到上一个用户的缓存数据
    clearCache();
    // 使用 window.location.href 强制刷新页面，彻底清除内存中的所有状态
    window.location.href = '/login';
  };

  // 刷新当前页面：重挂载内容区组件，重新请求当前页所有接口（不整页 reload）
  const handleRefresh = () => {
    refreshCurrentPage();
  };

  // 输入搜索
  const handleSearchChange = (value) => {
    setKeyword(value);
    if (value.trim()) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('common.profile'),
      onClick: () => navigate('/settings/profile'),
    },
    {
      key: 'password',
      icon: <KeyOutlined />,
      label: t('common.changePassword'),
      onClick: () => navigate('/settings/profile'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('common.logout'),
      onClick: handleLogout,
    },
  ];

  // 搜索结果选项
  const searchOptions = results.map((item) => ({
    value: item.key,
    label: (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}
        onClick={() => handleSelect(item)}
      >
        <SearchOutlined style={{ color: 'var(--text-muted, #999)' }} />
        <span>{item.label}</span>
        <span style={{ color: 'var(--text-muted, #bbb)', fontSize: 12, marginLeft: 'auto' }}>{item.key}</span>
      </div>
    ),
  }));

  return (
    <AntHeader
      className="main-header"
      style={{
        background: 'var(--bg-header, #ffffff)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
        height: 64,
        position: fixedHeader ? 'sticky' : 'static',
        top: 0,
        zIndex: 99,
      }}
    >
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!isHorizontal && (
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            style={{ fontSize: 16, width: 40, height: 40 }}
          />
        )}

        {/* 全局搜索 */}
        {showSearch && (
          <AutoComplete
            value={keyword}
            options={searchOptions}
            open={open && results.length > 0}
            onSearch={handleSearchChange}
            onSelect={(value) => {
              const item = results.find((r) => r.key === value);
              if (item) handleSelect(item);
            }}
            onBlur={() => setOpen(false)}
            onFocus={() => keyword.trim() && setOpen(true)}
            style={{ width: 240 }}
            dropdownMatchSelectWidth={300}
          >
            <Input
              prefix={<SearchOutlined style={{ color: 'var(--text-muted, #bbb)' }} />}
              placeholder={t('common.searchMenu')}
              allowClear
              onClear={clearKeyword}
              style={{ borderRadius: 6 }}
            />
          </AutoComplete>
        )}
      </div>

      <div className="header-right">
        <Space size={16}>
          {/* 刷新按钮 */}
          {showRefresh && (
            <Button
              type="text"
              icon={<ReloadOutlined style={{ fontSize: 16 }} />}
              onClick={handleRefresh}
              title={t('common.refreshPage')}
            />
          )}

          {/* 全屏按钮 */}
          {showFullscreen && (
            <Button
              type="text"
              icon={
                isFullscreen ? (
                  <FullscreenExitOutlined style={{ fontSize: 16 }} />
                ) : (
                  <FullscreenOutlined style={{ fontSize: 16 }} />
                )
              }
              onClick={toggleFullscreen}
              title={isFullscreen ? t('common.exitFullscreen') : t('common.fullscreen')}
            />
          )}

          <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space
              style={{
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                transition: 'background 0.2s',
              }}
              className="user-dropdown"
            >
              <Avatar
                size={32}
                src={user?.avatar ? imageUrl(user.avatar) : undefined}
                icon={!user?.avatar ? <UserOutlined /> : null}
                style={{ backgroundColor: !user?.avatar ? 'var(--avatar-bg, #c9a96e)' : undefined }}
              />
              <span style={{ color: 'var(--user-name-color, #1a1a2e)', fontWeight: 500, fontSize: 14 }}>
                {user?.nickname || user?.username || '管理员'}
              </span>
            </Space>
          </Dropdown>
        </Space>
      </div>
    </AntHeader>
  );
};

export default Header;
