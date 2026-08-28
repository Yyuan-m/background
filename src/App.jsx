import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import router from '@/router';
import useThemeStore from '@/store/useThemeStore';
import { useEffect } from 'react';
import logger from '@/utils/logger';
import { useAppConfig } from '@/context/AppConfigContext';
import { StaticFunctionSetter } from '@/utils/antdStatic';

const borderRadiusMap = { small: 4, medium: 6, large: 10 };
const fontSizeMap = { small: 13, default: 14, large: 16 };

const App = () => {
  const antdConfig = useThemeStore((s) => s.getAntdConfig());
  const themeBorderRadius = useThemeStore((s) => s.borderRadius);
  const themeFontSize = useThemeStore((s) => s.fontSize);
  const appConfig = useAppConfig();

  useEffect(() => {
    // 动态设置浏览器标题
    document.title = appConfig.appName
      ? `${appConfig.appName} - ${appConfig.appSubtitle}`
      : 'LUXURY CAR - 大圣玩车后台管理系统';

    // 根据配置设定日志级别
    if (appConfig.logLevel) {
      logger.setLevel(appConfig.logLevel);
    }

    logger.info('应用配置已加载', {
      apiBaseUrl: appConfig.apiBaseUrl,
      appName: appConfig.appName,
      locale: appConfig.locale,
    });

    // 生产环境初始化性能监控
    if (import.meta.env.PROD) {
      import('@/utils/performance').then(({ initPerformanceMonitor }) => {
        initPerformanceMonitor();
      });
    }
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: antdConfig.algorithm,
        token: {
          colorPrimary: antdConfig.colorPrimary,
          colorSuccess: antdConfig.colorSuccess,
          colorWarning: antdConfig.colorWarning,
          colorError: antdConfig.colorError,
          colorInfo: antdConfig.colorInfo,
          borderRadius: borderRadiusMap[themeBorderRadius] ?? 6,
          fontSize: fontSizeMap[themeFontSize] ?? 14,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
        components: {
          Button: {
            colorPrimary: antdConfig.colorPrimary,
            algorithm: true,
          },
          Menu: {
            darkItemBg: 'transparent',
            darkItemSelectedBg: antdConfig.darkItemSelectedBg,
            darkItemSelectedColor: antdConfig.darkItemSelectedColor,
          },
          Table: {
            headerBg: antdConfig.headerBg,
          },
        },
      }}
    >
      <AntdApp>
        <StaticFunctionSetter />
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
