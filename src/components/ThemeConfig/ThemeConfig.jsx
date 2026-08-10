import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Select, Switch, Button, Divider } from 'antd';
import { message } from '@/utils/antdStatic';
import { SettingOutlined, CloseOutlined } from '@ant-design/icons';
import useThemeStore from '@/store/useThemeStore';
import './ThemeConfig.scss';

const layoutOptions = [
  { value: 'vertical', label: '纵向布局' },
  { value: 'horizontal', label: '横向布局' },
];

const themeOptions = [
  { value: 'blue-black', label: '蓝黑经典' },
  { value: 'pure-white', label: '纯白极简' },
  { value: 'black-gold', label: '暗夜黑金' },
  { value: 'ocean-blue', label: '深海蔚蓝' },
  { value: 'jade-dark', label: '翡翠暗夜' },
  { value: 'purple-dark', label: '紫夜暗影' },
  { value: 'sunset-orange', label: '日落暖橙' },
  { value: 'graphite', label: '石墨极简' },
];

const tabStyleOptions = [
  { value: 'card', label: '卡片风格' },
  { value: 'simple', label: '简约风格' },
];

const sidebarWidthOptions = [
  { value: 'compact', label: '紧凑 (200px)' },
  { value: 'default', label: '标准 (240px)' },
  { value: 'wide', label: '宽版 (280px)' },
];

const borderRadiusOptions = [
  { value: 'small', label: '小圆角 (4px)' },
  { value: 'medium', label: '中圆角 (6px)' },
  { value: 'large', label: '大圆角 (10px)' },
];

const contentWidthOptions = [
  { value: 'full', label: '全屏铺满' },
  { value: '1200', label: '固定 1200px' },
  { value: '1400', label: '固定 1400px' },
];

const fontSizeOptions = [
  { value: 'small', label: '小号 (13px)' },
  { value: 'default', label: '标准 (14px)' },
  { value: 'large', label: '大号 (16px)' },
];

const getDefaultConfig = () => ({
  layout: 'vertical',
  theme: 'blue-black',
  tabStyle: 'card',
  sidebarWidth: 'default',
  borderRadius: 'medium',
  contentWidth: 'full',
  showTabs: true,
  showTabIcons: false,
  showRefresh: true,
  showSearch: true,
  showFullscreen: true,
  fontSize: 'default',
  grayMode: false,
  colorWeak: false,
  fixedHeader: true,
  pageAnimation: true,
});

  const ThemeConfig = () => {
  const [open, setOpen] = useState(false);
  const themeStore = useThemeStore();
  // 记录打开弹窗时的原始配置，关闭时回退
  const originalConfigRef = useRef(null);
  const drawerBodyRef = useRef(null);

  const [localConfig, setLocalConfig] = useState(getDefaultConfig());

  // 打开弹窗时：保存原始配置 + 同步本地预览
  useEffect(() => {
    if (open) {
      originalConfigRef.current = {
        layout: themeStore.layout,
        theme: themeStore.theme,
        tabStyle: themeStore.tabStyle,
        sidebarWidth: themeStore.sidebarWidth,
        borderRadius: themeStore.borderRadius,
        contentWidth: themeStore.contentWidth,
        showTabs: themeStore.showTabs,
        showTabIcons: themeStore.showTabIcons,
        showRefresh: themeStore.showRefresh,
        showSearch: themeStore.showSearch,
        showFullscreen: themeStore.showFullscreen,
        fontSize: themeStore.fontSize,
        grayMode: themeStore.grayMode,
        colorWeak: themeStore.colorWeak,
        fixedHeader: themeStore.fixedHeader,
        pageAnimation: themeStore.pageAnimation,
      };
      setLocalConfig({
        layout: themeStore.layout,
        theme: themeStore.theme,
        tabStyle: themeStore.tabStyle,
        sidebarWidth: themeStore.sidebarWidth,
        borderRadius: themeStore.borderRadius,
        contentWidth: themeStore.contentWidth,
        showTabs: themeStore.showTabs,
        showTabIcons: themeStore.showTabIcons,
        showRefresh: themeStore.showRefresh,
        showSearch: themeStore.showSearch,
        showFullscreen: themeStore.showFullscreen,
        fontSize: themeStore.fontSize,
        grayMode: themeStore.grayMode,
        colorWeak: themeStore.colorWeak,
        fixedHeader: themeStore.fixedHeader,
        pageAnimation: themeStore.pageAnimation,
      });
    }
  }, [open]);

  // 实时预览：修改本地状态并立即应用到 store
  const handleChange = (key, value) => {
    const updated = { ...localConfig, [key]: value };
    setLocalConfig(updated);
    themeStore.setConfig(key, value);
  };

  // 关闭弹窗：回退到打开前的原始配置
  const handleClose = () => {
    if (originalConfigRef.current) {
      // 逐条回退到原始值
      Object.entries(originalConfigRef.current).forEach(([key, value]) => {
        themeStore.setConfig(key, value);
      });
    }
    setOpen(false);
  };

  // 保存配置：持久化，关闭弹窗
  const handleSave = () => {
    themeStore.saveConfig(localConfig);
    message.success('主题配置已保存');
    setOpen(false);
  };

  // 恢复默认：预览默认值，不持久化，用户可继续保存或关闭回退
  const handleReset = () => {
    const defaults = getDefaultConfig();
    setLocalConfig(defaults);
    // 立即应用预览
    Object.entries(defaults).forEach(([key, value]) => {
      themeStore.setConfig(key, value);
    });
    message.success('已恢复默认配置，点击保存生效');
  };

  // 将下拉框挂载到 Drawer 内部，避免超出视口产生横向滚动条
  const getPopupContainer = () => {
    return drawerBodyRef.current || document.body;
  };

  return (
    <>
      <div className="theme-config-fab" onClick={() => setOpen(true)} title="主题配置">
        <SettingOutlined style={{ fontSize: 20 }} />
      </div>

      <Drawer
        title={
          <div className="theme-drawer-title">
            <span>主题配置</span>
            <CloseOutlined className="theme-drawer-close" onClick={handleClose} />
          </div>
        }
        placement="right"
        width={360}
        open={open}
        onClose={handleClose}
        closable={false}
        className="theme-config-drawer"
      >
        <div className="theme-config-body" ref={drawerBodyRef}>
          <div className="config-section">
            <div className="config-label">布局切换</div>
            <Select
              value={localConfig.layout}
              onChange={(v) => handleChange('layout', v)}
              options={layoutOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <div className="config-section">
            <div className="config-label">主题配色</div>
            <Select
              value={localConfig.theme}
              onChange={(v) => handleChange('theme', v)}
              options={themeOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <div className="config-section">
            <div className="config-label">侧边栏宽度</div>
            <Select
              value={localConfig.sidebarWidth}
              onChange={(v) => handleChange('sidebarWidth', v)}
              options={sidebarWidthOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <div className="config-section">
            <div className="config-label">内容区宽度</div>
            <Select
              value={localConfig.contentWidth}
              onChange={(v) => handleChange('contentWidth', v)}
              options={contentWidthOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <div className="config-section">
            <div className="config-label">标签风格</div>
            <Select
              value={localConfig.tabStyle}
              onChange={(v) => handleChange('tabStyle', v)}
              options={tabStyleOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <div className="config-section">
            <div className="config-label">全局圆角</div>
            <Select
              value={localConfig.borderRadius}
              onChange={(v) => handleChange('borderRadius', v)}
              options={borderRadiusOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div className="config-section">
            <div className="config-label">全局字号</div>
            <Select
              value={localConfig.fontSize}
              onChange={(v) => handleChange('fontSize', v)}
              options={fontSizeOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div className="config-section">
            <div className="config-switch-row">
              <span className="config-label">灰色模式</span>
              <Switch checked={localConfig.grayMode} onChange={(v) => handleChange('grayMode', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <span className="config-label">色弱模式</span>
              <Switch checked={localConfig.colorWeak} onChange={(v) => handleChange('colorWeak', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <span className="config-label">固定顶栏</span>
              <Switch checked={localConfig.fixedHeader} onChange={(v) => handleChange('fixedHeader', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <span className="config-label">页面动画</span>
              <Switch checked={localConfig.pageAnimation} onChange={(v) => handleChange('pageAnimation', v)} />
            </div>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div className="config-section">
            <div className="config-switch-row">
              <span className="config-label">标签页</span>
              <Switch checked={localConfig.showTabs} onChange={(v) => handleChange('showTabs', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <span className="config-label">标签图标</span>
              <Switch checked={localConfig.showTabIcons} onChange={(v) => handleChange('showTabIcons', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <span className="config-label">刷新按钮</span>
              <Switch checked={localConfig.showRefresh} onChange={(v) => handleChange('showRefresh', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <span className="config-label">搜索按钮</span>
              <Switch checked={localConfig.showSearch} onChange={(v) => handleChange('showSearch', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <span className="config-label">全屏按钮</span>
              <Switch checked={localConfig.showFullscreen} onChange={(v) => handleChange('showFullscreen', v)} />
            </div>
          </div>
        </div>

        <div className="theme-config-footer">
          <Button type="primary" block onClick={handleSave} style={{ marginBottom: 10 }}>
            保存
          </Button>
          <Button block onClick={handleReset}>
            恢复默认
          </Button>
        </div>
      </Drawer>
    </>
  );
};

export default ThemeConfig;
