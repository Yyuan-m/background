import axios from 'axios';
import { message } from '@/utils/antdStatic';
import auth from '@/utils/auth';
import logger from '@/utils/logger';
import { t } from '@/i18n';
import { REQUEST_TIMEOUT, UPLOAD_TIMEOUT, REQUEST_RETRY_COUNT, REQUEST_RETRY_DELAY } from '@/constants';
import { doRefreshToken } from '@/utils/tokenRefresh';

/* ==========================================================================
   request.js  ——  生产级 HTTP 请求封装（基于 axios）
   切换后端只需修改 index.html 中的 window.__APP_CONFIG__.apiBaseUrl
   ========================================================================== */

// ---------- 全局配置 ----------

/** 从 index.html 全局配置读取后端 API 地址 */
const getBaseURL = () => {
  try {
    return window.__APP_CONFIG__?.apiBaseUrl || '';
  } catch {
    return '';
  }
};

/** 业务成功码映射（兼容多种后端返回格式） */
const SUCCESS_CODES = [0, 200];

// ---------- 403（无权限）提示去重 ----------
// 多个接口接连返回 403 时，只在时间窗口内弹一次，避免扎眼的重复弹窗
const PERMISSION_DENIED_DEBOUNCE = 3000; // 3 秒内只弹一次
let lastPermissionDeniedAt = 0;
const showPermissionDenied = (msg) => {
  const now = Date.now();
  if (now - lastPermissionDeniedAt < PERMISSION_DENIED_DEBOUNCE) return;
  lastPermissionDeniedAt = now;
  message.error(msg || t('common.noPermissionAccess'));
};

// ---------- 请求去重 ----------

/** 进行中的请求映射表（key: method+url+body, value: CancelTokenSource） */
const pendingMap = new Map();

/** 生成请求唯一标识 */
const getRequestKey = (config) => {
  const { method, url, params, data } = config;
  return [method, url, JSON.stringify(params), JSON.stringify(data)].join('&');
};

/** 添加请求到去重队列，若已存在则取消前一个 */
const addPending = (config) => {
  const key = getRequestKey(config);
  if (pendingMap.has(key)) {
    pendingMap.get(key).abort();
    pendingMap.delete(key);
  }
  const controller = new AbortController();
  config.signal = controller.signal;
  config._requestKey = key;
  pendingMap.set(key, controller);
};

/** 移除已完成的请求 */
const removePending = (config) => {
  const key = config._requestKey || getRequestKey(config);
  pendingMap.delete(key);
};

// ---------- 请求缓存 ----------

/** 缓存存储（key: url+params, value: { data, timestamp, ttl }） */
const cacheMap = new Map();

/** 默认缓存时间（毫秒），0 表示不缓存 */
const DEFAULT_CACHE_TTL = 0;

/** 生成缓存键 */
const getCacheKey = (config) => {
  const { method, url, params } = config;
  return [method, url, JSON.stringify(params)].join('&');
};

/** 尝试从缓存获取 */
const getCache = (config) => {
  const ttl = config.cacheTTL ?? DEFAULT_CACHE_TTL;
  if (ttl <= 0) return null;
  const key = getCacheKey(config);
  const cached = cacheMap.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > ttl) {
    cacheMap.delete(key);
    return null;
  }
  return cached.data;
};

/** 写入缓存 */
const setCache = (config, data) => {
  const ttl = config.cacheTTL ?? DEFAULT_CACHE_TTL;
  if (ttl <= 0) return;
  const key = getCacheKey(config);
  cacheMap.set(key, { data, timestamp: Date.now(), ttl });
};

/** 清空所有缓存 */
export const clearCache = () => cacheMap.clear();

// ---------- 防抖提交 ----------

/** 防抖标记（key: 自定义防抖ID, value: 最近一次请求时间） */
const debounceMap = new Map();

// ---------- 重试 ----------

/** 默认重试次数 */
const DEFAULT_RETRY = REQUEST_RETRY_COUNT;
/** 默认重试间隔（毫秒） */
const DEFAULT_RETRY_DELAY = REQUEST_RETRY_DELAY;

/** 判断是否应该重试 */
const shouldRetry = (config, error) => {
  const retry = config.retry ?? DEFAULT_RETRY;
  if (retry <= 0) return false;
  // 已重试次数
  config.__retryCount = config.__retryCount || 0;
  if (config.__retryCount >= retry) return false;
  // 仅对网络错误和 5xx 重试，不重试 4xx
  if (error.response) {
    return error.response.status >= 500;
  }
  return true; // 网络错误（无 response）也重试
};

// ---------- 并发控制 ----------

/** 当前并发请求数 */
let activeCount = 0;
/** 最大并发数（0 表示不限制） */
const MAX_CONCURRENT = 0;

// ---------- 创建 axios 实例 ----------

const request = axios.create({
  baseURL: getBaseURL(),
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// ======================== 请求拦截器 ========================

request.interceptors.request.use(
  (config) => {
    // 1. 防抖：相同 debounceKey 在指定时间内不重复发送
    if (config.debounceKey && config.debounceDelay) {
      const lastTime = debounceMap.get(config.debounceKey) || 0;
      if (Date.now() - lastTime < config.debounceDelay) {
        return Promise.reject({ __debounced: true, message: '请求被防抖拦截' });
      }
      debounceMap.set(config.debounceKey, Date.now());
    }

    // 2. 自动携带 Token
    const token = auth.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 3. 请求去重（仅对 GET 请求，或显式开启）
    if (config.deduplicate !== false && config.method?.toLowerCase() === 'get') {
      addPending(config);
    }

    // 4. 缓存命中则直接返回（仅 GET 请求）
    if (config.method?.toLowerCase() === 'get') {
      const cached = getCache(config);
      if (cached) {
        removePending(config);
        return Promise.resolve({ ...config, __fromCache: true, data: cached });
      }
    }

    // 5. 并发控制
    if (MAX_CONCURRENT > 0 && activeCount >= MAX_CONCURRENT) {
      return Promise.reject(new Error('并发请求数已达上限，请稍后重试'));
    }
    activeCount++;

    // 6. 请求唯一 ID（便于追踪和日志）
    config.__requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    config.__startTime = Date.now();

    // 7. 开发环境日志
    if (import.meta.env.DEV && config.log !== false) {
      logger.debug(`[${config.__requestId}] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ======================== 响应拦截器 ========================

request.interceptors.response.use(
  (response) => {
    // 1. 并发计数减一
    activeCount = Math.max(0, activeCount - 1);

    const { config } = response;

    // 2. 移除去重记录
    removePending(config);

    // 3. 缓存命中直接返回
    if (config.__fromCache) {
      return response.data;
    }

    // 4. 写入缓存（仅 GET 请求）
    if (config.method?.toLowerCase() === 'get') {
      setCache(config, response.data);
    }

    // 5. 开发环境日志
    if (import.meta.env.DEV && config.log !== false) {
      const duration = Date.now() - (config.__startTime || 0);
      logger.info(`[${config.__requestId}] ${duration}ms`, response.data);
    }

    // 5.5 Blob / 文件流响应直接返回（用于文件下载/导出场景）
    // 此时 response.data 是 Blob 对象，没有 code 字段，不能走业务码判断
    if (config.responseType === 'blob' || config.responseType === 'arraybuffer') {
      return response.data;
    }

    // 6. 业务状态码判断
    const res = response.data;
    if (res && SUCCESS_CODES.includes(res.code)) {
      const result = res.data != null ? res.data : res;
      // 接口成功弹窗提示：只有显式配置 successMsg 才弹，避免与页面手动提示重复
      if (config.successMsg && config.showSuccessMsg !== false) {
        message.success(config.successMsg);
      }
      return result;
    }

    // 业务错误
    const errMsg = res?.msg || res?.message || t('common.requestFailed');

    // 业务码 401：token 过期（后端 PermissionAspect / GlobalExceptionHandler 返回 200+code:401）
    // 同样触发无感刷新 + 重放，与 HTTP 401 分支保持一致
    if (res?.code === 401 && !config?.__retried) {
      config.__retried = true;
      return doRefreshToken()
        .then((newToken) => {
          config.headers.Authorization = `Bearer ${newToken}`;
          return request(config);
        })
        .catch(() => Promise.reject(new Error(errMsg)));
    }

    if (config.showError !== false) {
      // 业务码 403（权限不足）去重弹窗，避免多个接口接连弹出
      if (res?.code === 403) {
        showPermissionDenied(errMsg);
      } else {
        message.error(errMsg);
      }
    }
    return Promise.reject(new Error(errMsg));
  },
  async (error) => {
    // 1. 并发计数减一
    activeCount = Math.max(0, activeCount - 1);

    // 2. 被防抖拦下的请求，静默忽略
    if (error.__debounced) return Promise.resolve(null);

    // 3. 请求被取消（去重或手动取消），静默忽略
    if (axios.isCancel(error)) return Promise.resolve(null);

    const { config, response } = error;

    // 4. 移除去重记录
    if (config) removePending(config);

    // 5. 重试机制
    if (config && shouldRetry(config, error)) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      const delay = config.retryDelay || DEFAULT_RETRY_DELAY;
      if (config.showError !== false) {
        message.warning(t('common.retrying', { current: config.__retryCount, total: config.retry }));
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      return request(config);
    }

    // 6. 开发环境日志
    if (import.meta.env.DEV && config?.log !== false) {
      const duration = Date.now() - (config.__startTime || 0);
      logger.error(`[${config.__requestId}] ${duration}ms`, error);
    }

    // 7. HTTP 错误处理
    if (response) {
      const { status, data: resData } = response;
      const errorMessage = resData?.msg || resData?.message || '';

      switch (status) {
        case 400:
          if (config?.showError !== false) message.error(errorMessage || t('common.paramError'));
          break;
        case 401: {
          // access token 过期 → 无感刷新 + 重放原请求
          // 防死循环：已重放过的请求再次 401，不再二次刷新，直接失败（刷新逻辑见 tokenRefresh.js）
          if (config?.__retried) {
            return Promise.reject(error);
          }
          config.__retried = true;
          // 不在此处弹窗；弹窗与跳转由 tokenRefresh 的去重逻辑统一处理
          return doRefreshToken()
            .then((newToken) => {
              config.headers.Authorization = `Bearer ${newToken}`;
              return request(config);
            })
            .catch(() => {
              // 刷新失败：handleRefreshFailed 已统一处理提示与跳转
              return Promise.reject(error);
            });
        }
        case 403:
          // 权限不足：去重弹窗（3 秒内只弹一次），不跳转登录页
          if (config?.showError !== false) showPermissionDenied(errorMessage);
          break;
        case 404:
          if (config?.showError !== false) message.error(errorMessage || t('common.resourceNotFound'));
          break;
        case 422:
          if (config?.showError !== false) message.error(errorMessage || t('common.paramValidationFailed'));
          break;
        case 429:
          if (config?.showError !== false) message.error(t('common.requestBusy'));
          break;
        case 500:
          if (config?.showError !== false) message.error(errorMessage || t('common.serverInternalError'));
          break;
        case 502:
        case 503:
        case 504:
          if (config?.showError !== false) message.error(t('common.serviceUnavailable'));
          break;
        default:
          if (config?.showError !== false) message.error(`请求失败 (${status})`);
      }
    } else if (error.code === 'ECONNABORTED') {
      if (config?.showError !== false) message.error(t('common.requestTimeout'));
    } else if (error.code === 'ERR_NETWORK') {
      if (config?.showError !== false) message.error(t('common.networkError'));
    } else if (config?.showError !== false) message.error(t('common.networkException'));

    return Promise.reject(error);
  },
);

// ======================== 便捷方法 ========================

/**
 * GET 请求
 * @param {string} url     - 请求路径
 * @param {object} params  - URL 查询参数
 * @param {object} config  - 额外配置（见下方配置说明）
 */
const get = (url, params, config = {}) =>
  request.get(url, { params, ...config });

/**
 * POST 请求
 * @param {string} url     - 请求路径
 * @param {object} data    - 请求体
 * @param {object} config  - 额外配置
 */
const post = (url, data, config = {}) =>
  request.post(url, data, config);

/**
 * PUT 请求
 */
const put = (url, data, config = {}) =>
  request.put(url, data, config);

/**
 * PATCH 请求（部分更新）
 */
const patch = (url, data, config = {}) =>
  request.patch(url, data, config);

/**
 * DELETE 请求
 */
const del = (url, config = {}) =>
  request.delete(url, config);

/**
 * 文件上传
 * @param {string} url          - 上传地址
 * @param {FormData|File} file  - 文件或 FormData
 * @param {object} config       - 额外配置（支持 onUploadProgress 进度回调）
 * @returns {Promise}
 *
 * @example
 *   const file = e.target.files[0];
 *   upload('/upload/avatar', file, {
 *     onUploadProgress: (e) => console.log(`${(e.progress * 100).toFixed(0)}%`),
 *   });
 */
const upload = (url, file, config = {}) => {
  const formData = file instanceof FormData ? file : new FormData();
  if (file instanceof File) formData.append('file', file);
  return request.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT,
    ...config,
  });
};

/**
 * 文件下载（Blob 方式）
 * @param {string} url      - 下载地址
 * @param {string} filename - 保存的文件名
 * @param {object} config   - 额外配置
 *
 * @example
 *   download('/export/orders?date=2026-07', '订单报表.xlsx');
 */
const download = async (url, filename, config = {}) => {
  const response = await request.get(url, {
    responseType: 'blob',
    ...config,
  });
  const blob = new Blob([response]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

/**
 * 批量请求（并发）
 * @param {Array<Function>} requests - 返回 Promise 的请求函数数组
 * @param {number} limit             - 并发限制（0 表示不限制）
 * @returns {Promise<Array>}         - 所有请求结果
 *
 * @example
 *   batchRequest([
 *     () => get('/api/user/1'),
 *     () => get('/api/user/2'),
 *     () => get('/api/user/3'),
 *   ], 2); // 同时最多 2 个并发
 */
const batchRequest = async (requests, limit = 0) => {
  if (limit <= 0 || limit >= requests.length) {
    return Promise.all(requests.map((fn) => fn()));
  }
  const results = [];
  const executing = [];
  for (const fn of requests) {
    const p = Promise.resolve().then(() => fn()).then((r) => { results.push(r); });
    executing.push(p);
    if (executing.length >= limit) {
      await Promise.race(executing);
      // 移除已完成的
      executing.splice(0, executing.length, ...executing.filter(() => results.length < requests.length));
    }
  }
  await Promise.all(executing);
  return results;
};

/**
 * 轮询请求（定时重复调用，直到满足条件）
 * @param {Function} requestFn    - 请求函数
 * @param {Function} stopCondition - 停止条件，返回 true 时停止轮询
 * @param {number}   interval     - 轮询间隔（毫秒），默认 3000
 * @param {number}   maxRetries   - 最大轮询次数，默认 60
 * @returns {Promise}
 *
 * @example
 *   poll(
 *     () => get('/order/status/123'),
 *     (res) => res.status === 'completed',
 *     2000,  // 每 2 秒查一次
 *     30,    // 最多查 30 次
 *   );
 */
const poll = async (requestFn, stopCondition, interval = 3000, maxRetries = 60) => {
  for (let i = 0; i < maxRetries; i++) {
    const result = await requestFn();
    if (stopCondition(result)) return result;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`轮询已达最大次数 (${maxRetries})`);
};

// ======================== 导出 ========================

// 默认导出 axios 实例（兼容现有调用方式：request.get() / request.post()）
export default request;

// 命名导出便捷方法（推荐使用，类型更清晰）
export { get, post, put, patch, del, upload, download, batchRequest, poll };

/*
 * ======================== 配置参数说明 ========================
 *
 * 以下参数可在每个请求的 config 中传入，覆盖默认行为：
 *
 * @param {boolean}  showError     - 是否显示错误提示，默认 true
 * @param {boolean}  deduplicate   - 是否启用请求去重，GET 默认 true，其他默认 false
 * @param {boolean}  log           - 是否打印控制台日志，开发环境默认 true
 * @param {number}   retry         - 失败重试次数，默认 0（不重试）
 * @param {number}   retryDelay    - 重试间隔（毫秒），默认 1000
 * @param {number}   cacheTTL      - 缓存有效时间（毫秒），默认 0（不缓存），仅 GET 请求生效
 * @param {string}   debounceKey   - 防抖标识，相同 key 在 debounceDelay 内不会重复发送
 * @param {number}   debounceDelay - 防抖间隔（毫秒）
 * @param {number}   timeout       - 超时时间（毫秒），默认 15000
 * @param {Function} onUploadProgress - 上传进度回调
 * @param {Function} onDownloadProgress - 下载进度回调
 *
 * @example
 *   // 不显示错误提示
 *   get('/api/user/1', {}, { showError: false });
 *
 *   // 请求失败自动重试 3 次，间隔 2 秒
 *   post('/api/submit', data, { retry: 3, retryDelay: 2000 });
 *
 *   // 缓存 5 分钟
 *   get('/api/dict/vehicle_types', {}, { cacheTTL: 5 * 60 * 1000 });
 *
 *   // 防抖：2 秒内同一表单不重复提交
 *   post('/api/submit', data, { debounceKey: 'form_submit', debounceDelay: 2000 });
 *
 *   // 设置超时
 *   get('/api/report', {}, { timeout: 30000 });
 *
 *   // 关闭开发日志
 *   get('/api/data', {}, { log: false });
 */
