import { Component } from 'react';
import { Button, Result } from 'antd';

/**
 * 全局错误边界组件
 *
 * 捕获子组件树中未处理的渲染错误，展示友好的错误页面，
 * 避免整个应用白屏崩溃。
 *
 * 生产环境隐藏错误详情，开发环境展示完整堆栈便于调试。
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // 生产环境可上报错误到监控平台
    if (import.meta.env.PROD && this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 开发环境打印详细错误
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] 捕获到渲染错误:', error);
      console.error('[ErrorBoundary] 组件堆栈:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 自定义降级 UI
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      const isDev = import.meta.env.DEV;
      const errorMessage = this.state.error?.message || '未知错误';

      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '40px',
          background: 'var(--bg-page, #f0f2f5)',
        }}>
          <Result
            status="500"
            title="页面渲染出错"
            subTitle={
              <div>
                <p>抱歉，页面发生了意外错误，请尝试刷新页面。</p>
                {isDev && (
                  <div style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    background: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: 6,
                    textAlign: 'left',
                    maxWidth: 600,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}>
                    <strong>错误信息：</strong>
                    {errorMessage}
                    {this.state.errorInfo?.componentStack && (
                      <>
                        {'\n\n'}
                        <strong>组件堆栈：</strong>
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </div>
                )}
              </div>
            }
            extra={[
              <Button
                key="retry"
                type="primary"
                onClick={this.handleReset}
              >
                重试
              </Button>,
              <Button key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>,
              this.props.onBack && (
                <Button key="back" onClick={this.props.onBack}>
                  返回首页
                </Button>
              ),
            ].filter(Boolean)}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
