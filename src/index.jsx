import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import '@/styles/global.scss';

import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import { PageLoading } from '@/components/Loading';
import { AppConfigProvider } from '@/context/AppConfigContext';
import logger from '@/utils/logger';

// 懒加载 App 组件（减少首屏包体积）
const App = React.lazy(() => import('@/App'));

// 初始化日志
logger.info('应用启动', { version: __APP_VERSION__, env: import.meta.env.MODE });

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        logger.report(error, { componentStack: errorInfo?.componentStack });
      }}
    >
      <AppConfigProvider>
        <Suspense fallback={<PageLoading />}>
          <App />
        </Suspense>
      </AppConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
