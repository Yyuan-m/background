/**
 * 应用级日志工具
 *
 * 支持日志级别控制，生产环境自动屏蔽 debug 日志，
 * 可扩展接入外部日志收集服务。
 *
 * 使用方式：
 *   import logger from '@/utils/logger';
 *   logger.debug('调试信息', data);
 *   logger.info('操作成功', { userId: 123 });
 *   logger.warn('接口响应慢', { url, duration });
 *   logger.error('请求失败', error);
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

// 根据环境设置默认日志级别
const DEFAULT_LEVEL = import.meta.env.PROD ? 'warn' : 'debug';

class Logger {
  constructor() {
    this._level = DEFAULT_LEVEL;
    this._prefix = '[App]';
    this._history = [];
    this._maxHistory = 200;
  }

  /** 设置日志级别 */
  setLevel(level) {
    if (Object.hasOwn(LOG_LEVELS, level)) {
      this._level = level;
    }
  }

  /** 获取当前日志级别 */
  getLevel() {
    return this._level;
  }

  /** 设置日志前缀 */
  setPrefix(prefix) {
    this._prefix = prefix;
  }

  /** 是否启用某个级别 */
  _enabled(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this._level];
  }

  /** 记录到历史 */
  _record(level, message, data) {
    const entry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      time: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location?.href : '',
    };
    this._history.push(entry);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
    return entry;
  }

  /** 获取历史日志 */
  getHistory() {
    return [...this._history];
  }

  /** 清空历史 */
  clearHistory() {
    this._history = [];
  }

  debug(message, data) {
    if (!this._enabled('debug')) return;
    const entry = this._record('debug', message, data);
    console.debug(
      `%c${this._prefix} DEBUG%c ${message}`,
      'color: #6366f1; font-weight: bold;',
      'color: inherit;',
      data !== undefined ? data : '',
    );
    return entry;
  }

  info(message, data) {
    if (!this._enabled('info')) return;
    const entry = this._record('info', message, data);
    console.info(
      `%c${this._prefix} INFO%c ${message}`,
      'color: #10b981; font-weight: bold;',
      'color: inherit;',
      data !== undefined ? data : '',
    );
    return entry;
  }

  warn(message, data) {
    if (!this._enabled('warn')) return;
    const entry = this._record('warn', message, data);
    console.warn(
      `%c${this._prefix} WARN%c ${message}`,
      'color: #f59e0b; font-weight: bold;',
      'color: inherit;',
      data !== undefined ? data : '',
    );
    return entry;
  }

  error(message, data) {
    if (!this._enabled('error')) return;
    const entry = this._record('error', message, data);
    console.error(
      `%c${this._prefix} ERROR%c ${message}`,
      'color: #ef4444; font-weight: bold;',
      'color: inherit;',
      data !== undefined ? data : '',
    );
    return entry;
  }

  /**
   * 上报错误到外部监控（预留接口）
   * 可接入 Sentry、阿里云 ARMS 等
   */
  report(error, extra = {}) {
    this.error(error.message || String(error), extra);
    // TODO: 接入外部监控服务
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra });
    // }
  }
}

const logger = new Logger();

export default logger;
export { LOG_LEVELS };
