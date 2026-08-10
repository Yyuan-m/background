import { Spin } from 'antd';

/**
 * 页面级加载组件
 *
 * 用于 React.lazy() 的 Suspense fallback，
 * 在路由懒加载时展示加载动画。
 */
const PageLoading = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100%',
    background: 'var(--bg-page, #f0f2f5)',
  }}>
    <Spin size="large">
      <div style={{ padding: 50 }} />
    </Spin>
  </div>
);

/**
 * 内容区加载组件
 *
 * 适用于页面内部数据加载状态。
 */
const ContentLoading = ({ tip = '加载中...' }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 0',
  }}>
    <Spin tip={tip} />
  </div>
);

/**
 * 局部加载组件
 *
 * 适用于表格、卡片等局部区域的加载状态。
 */
const InlineLoading = ({ size = 'default' }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  }}>
    <Spin size={size} />
  </div>
);

export { PageLoading, ContentLoading, InlineLoading };
