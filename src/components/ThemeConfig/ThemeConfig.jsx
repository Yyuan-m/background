import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Select, Switch, Button, Divider, Tooltip } from 'antd';
import { message } from '@/utils/antdStatic';
import { SettingOutlined, CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons';
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

// 各项配置的悬浮解释：说明作用及影响页面位置
const configTips = {
  layout: '切换整体框架：纵向布局为左侧菜单栏，横向布局为顶部菜单栏，影响导航菜单位置',
  theme: '切换整套全局配色，影响顶栏、侧边栏、按钮、背景等所有颜色',
  sidebarWidth: '调整左侧菜单栏宽度，影响左侧导航区域的宽窄',
  contentWidth: '设置中间内容区域宽度：全屏铺满，或固定宽度居中显示',
  tabStyle: '切换顶部多标签页的展示风格：卡片风格或简约风格',
  borderRadius: '控制卡片、按钮、输入框、弹窗等元素的圆角大小',
  fontSize: '调整整个页面的基础文字大小，影响全局字体显示',
  grayMode: '将整个页面切换为灰色调，常用于纪念日、哀悼等场景',
  colorWeak: '降低页面色彩对比度，帮助色弱用户更好地分辨界面',
  fixedHeader: '开启后顶部栏固定在页面顶部，不随内容向下滚动',
  pageAnimation: '开启页面切换时的过渡动画效果，使跳转更平滑',
  showTabs: '显示或隐藏顶部的多标签页栏（页面标签导航）',
  showTabIcons: '在顶部标签页名称前显示对应的页面图标',
  showRefresh: '显示或隐藏顶部工具栏中的刷新按钮',
  showSearch: '显示或隐藏顶部工具栏中的搜索按钮（菜单搜索）',
  showFullscreen: '显示或隐藏顶部工具栏中的全屏切换按钮',
};

// 带解释图标的配置项名称：名称 + 问号图标（悬浮显示详情）
const ConfigLabel = ({ text, tip }) => (
  <div className="config-label">
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {text}
      <Tooltip title={tip} placement="top">
        <QuestionCircleOutlined className="config-label-help" />
      </Tooltip>
    </span>
  </div>
);

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
            <ConfigLabel text="布局切换" tip={configTips.layout} />
            <Select
              value={localConfig.layout}
              onChange={(v) => handleChange('layout', v)}
              options={layoutOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <div className="config-section">
            <ConfigLabel text="主题配色" tip={configTips.theme} />
            <Select
              value={localConfig.theme}
              onChange={(v) => handleChange('theme', v)}
              options={themeOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <div className="config-section">
            <ConfigLabel text="侧边栏宽度" tip={configTips.sidebarWidth} />
            <Select
              value={localConfig.sidebarWidth}
              onChange={(v) => handleChange('sidebarWidth', v)}
              options={sidebarWidthOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <div className="config-section">
            <ConfigLabel text="内容区宽度" tip={configTips.contentWidth} />
            <Select
              value={localConfig.contentWidth}
              onChange={(v) => handleChange('contentWidth', v)}
              options={contentWidthOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <div className="config-section">
            <ConfigLabel text="标签风格" tip={configTips.tabStyle} />
            <Select
              value={localConfig.tabStyle}
              onChange={(v) => handleChange('tabStyle', v)}
              options={tabStyleOptions}
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
            />
          </div>

          <div className="config-section">
            <ConfigLabel text="全局圆角" tip={configTips.borderRadius} />
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
            <ConfigLabel text="全局字号" tip={configTips.fontSize} />
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
              <ConfigLabel text="灰色模式" tip={configTips.grayMode} />
              <Switch checked={localConfig.grayMode} onChange={(v) => handleChange('grayMode', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <ConfigLabel text="色弱模式" tip={configTips.colorWeak} />
              <Switch checked={localConfig.colorWeak} onChange={(v) => handleChange('colorWeak', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <ConfigLabel text="固定顶栏" tip={configTips.fixedHeader} />
              <Switch checked={localConfig.fixedHeader} onChange={(v) => handleChange('fixedHeader', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <ConfigLabel text="页面动画" tip={configTips.pageAnimation} />
              <Switch checked={localConfig.pageAnimation} onChange={(v) => handleChange('pageAnimation', v)} />
            </div>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div className="config-section">
            <div className="config-switch-row">
              <ConfigLabel text="标签页" tip={configTips.showTabs} />
              <Switch checked={localConfig.showTabs} onChange={(v) => handleChange('showTabs', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <ConfigLabel text="标签图标" tip={configTips.showTabIcons} />
              <Switch checked={localConfig.showTabIcons} onChange={(v) => handleChange('showTabIcons', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <ConfigLabel text="刷新按钮" tip={configTips.showRefresh} />
              <Switch checked={localConfig.showRefresh} onChange={(v) => handleChange('showRefresh', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <ConfigLabel text="搜索按钮" tip={configTips.showSearch} />
              <Switch checked={localConfig.showSearch} onChange={(v) => handleChange('showSearch', v)} />
            </div>
          </div>

          <div className="config-section">
            <div className="config-switch-row">
              <ConfigLabel text="全屏按钮" tip={configTips.showFullscreen} />
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