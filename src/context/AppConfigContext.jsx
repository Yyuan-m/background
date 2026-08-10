import { createContext, useContext, useMemo } from 'react';

/**
 * 应用全局配置上下文
 *
 * 从 window.__APP_CONFIG__ 读取运行时配置，并通过 React Context 提供给整个应用。
 * 支持运行时动态修改配置，无需重新构建。
 *
 * 使用方式：
 *   const config = useAppConfig();
 *   console.log(config.apiBaseUrl);
 *   console.log(config.appName);
 */

// 默认配置（在 index.html 未加载时的兜底值）
const DEFAULT_APP_CONFIG = {
  apiBaseUrl: '/api',
  appName: 'LUXURY CAR',
  appSubtitle: '豪华汽车租赁后台管理系统',
  appVersion: '0.2.0',
  enableMock: false,
  enableLogger: true,
  sentryDSN: '',
  locale: 'zh-CN',
  dictionary: [],
  user: null,
};

/** 读取 window.__APP_CONFIG__ 并合并默认值 */
const getAppConfig = () => {
  try {
    const globalConfig = window.__APP_CONFIG__ || {};
    return { ...DEFAULT_APP_CONFIG, ...globalConfig };
  } catch {
    return { ...DEFAULT_APP_CONFIG };
  }
};

const AppConfigContext = createContext(null);

/**
 * AppConfigProvider — 应用配置提供者
 * 在应用根组件中包裹，使所有子组件都能通过 useAppConfig 获取配置
 */
const AppConfigProvider = ({ children }) => {
  const config = useMemo(() => getAppConfig(), []);

  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  );
};

/**
 * useAppConfig — 获取应用全局配置
 * @returns {object} 应用配置对象
 */
const useAppConfig = () => {
  const config = useContext(AppConfigContext);
  if (!config) {
    // 未包裹 Provider 时降级为直接读取 window
    return getAppConfig();
  }
  return config;
};

/**
 * 动态更新全局配置（无需刷新页面）
 * @param {object} partial - 要更新的配置项
 */
const updateAppConfig = (partial) => {
  try {
    window.__APP_CONFIG__ = { ...getAppConfig(), ...partial };
  } catch { /* ignore */ }
};

export { AppConfigProvider, useAppConfig, updateAppConfig, getAppConfig, DEFAULT_APP_CONFIG };
export default AppConfigContext;
