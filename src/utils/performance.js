/**
 * 前端性能监控工具
 *
 * 基于 Web Vitals 标准，采集 LCP、FID、CLS、INP、TTFB 等核心指标，
 * 支持上报到分析平台（预留接口）。
 *
 * 使用方式：
 *   import { initPerformanceMonitor } from '@/utils/performance';
 *   initPerformanceMonitor(); // 在 App 入口调用一次
 */

import logger from '@/utils/logger';

// ==================== 指标阈值（参考 Google 标准） ====================
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },   // 最大内容绘制 (ms)
  FID: { good: 100, poor: 300 },      // 首次输入延迟 (ms)
  INP: { good: 200, poor: 500 },      // 交互到下次绘制 (ms)
  CLS: { good: 0.1, poor: 0.25 },     // 累积布局偏移
  TTFB: { good: 800, poor: 1800 },    // 首字节时间 (ms)
  FCP: { good: 1800, poor: 3000 },    // 首次内容绘制 (ms)
};

/** 评级：good / needs-improvement / poor */
const getRating = (name, value) => {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'unknown';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
};

/** 上报指标 */
const reportMetric = (metric) => {
  const { name, value, rating, delta } = metric;

  // 开发环境控制台输出
  if (import.meta.env.DEV) {
    const color = rating === 'good' ? '#10b981' : rating === 'needs-improvement' ? '#f59e0b' : '#ef4444';
    console.log(
      `%c[Perf] ${name}: %c${Math.round(value)}${name === 'CLS' ? '' : 'ms'} %c(${rating})`,
      'color: #6366f1;',
      `color: ${color}; font-weight: bold;`,
      'color: #94a3b8;',
    );
  }

  // 生产环境上报（预留接口）
  if (import.meta.env.PROD) {
    logger.info(`[Perf] ${name}`, { value, rating, delta });

    // TODO: 接入外部监控
    // if (window.analytics) {
    //   window.analytics.track('web_vitals', { name, value, rating, delta });
    // }
  }
};

/** 页面加载时间监控 */
const monitorPageLoad = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('load', () => {
    // 使用 Performance API 获取页面加载时间
    setTimeout(() => {
      try {
        const [navigation] = performance.getEntriesByType('navigation');
        if (navigation) {
          const metrics = {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            request: navigation.responseStart - navigation.requestStart,
            response: navigation.responseEnd - navigation.responseStart,
            domReady: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            pageLoad: navigation.loadEventEnd - navigation.fetchStart,
          };
          logger.debug('页面加载性能', metrics);
        }
      } catch { /* ignore */ }
    }, 0);
  });
};

/** 页面隐藏时上报未发送的指标 */
const setupVisibilityListener = () => {
  if (typeof document === 'undefined') return;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      logger.debug('页面隐藏，刷新性能指标');
    }
  });
};

/**
 * 初始化性能监控
 *
 * 动态加载 web-vitals 库并开始监控核心指标。
 * 仅在支持的浏览器中生效（需要 PerformanceObserver API）。
 */
const initPerformanceMonitor = async () => {
  // 检查浏览器是否支持 PerformanceObserver
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    logger.debug('浏览器不支持 PerformanceObserver，跳过性能监控');
    return;
  }

  // 监控页面加载时间
  monitorPageLoad();
  setupVisibilityListener();

  // 动态导入 web-vitals（避免增加初始包体积）
  try {
    const { onLCP, onFID, onCLS, onINP, onTTFB, onFCP } = await import('web-vitals');

    // 注册核心指标回调
    onLCP((metric) => reportMetric({ ...metric, rating: getRating('LCP', metric.value) }));
    onFID((metric) => reportMetric({ ...metric, rating: getRating('FID', metric.value) }));
    onCLS((metric) => reportMetric({ ...metric, rating: getRating('CLS', metric.value) }));
    onINP((metric) => reportMetric({ ...metric, rating: getRating('INP', metric.value) }));
    onTTFB((metric) => reportMetric({ ...metric, rating: getRating('TTFB', metric.value) }));
    onFCP((metric) => reportMetric({ ...metric, rating: getRating('FCP', metric.value) }));

    logger.info('性能监控已启动');
  } catch (err) {
    // web-vitals 未安装时静默降级
    logger.debug('web-vitals 未安装，跳过核心指标监控');
  }
};

export { initPerformanceMonitor, THRESHOLDS, getRating };
export default initPerformanceMonitor;
