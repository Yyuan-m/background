/**
 * tokenRefresh.js —— Token 无感刷新核心模块
 *
 * 设计目标：用户在 access token 过期前后无需手动重新登录，自动用 refresh token
 * 换取新的 access token，并重放期间到达的请求；refresh token 也失效时才退出登录。
 *
 * 隐藏风险与对应处理：
 * 1. 并发刷新：多个 401 同时到达时只发起一次刷新，其余请求挂起等待（单飞 single-flight）。
 * 2. 请求排队：刷新期间的请求进入队列，刷新成功后用新 token 重放；失败则统一拒绝。
 * 3. 刷新接口自身 401/失败：刷新请求走裸 axios，不经过响应拦截器，避免无限递归。
 * 4. 网络抖动 vs 真正失效：刷新接口返回 401/403/业务错误码 → 视为 refresh token 失效，退出登录；
 *    仅网络错误/5xx → 不退出登录，只拒绝本次请求，避免弱网下误登出。
 * 5. 重复弹窗：多个接口连续 401 时，“登录已过期”提示与跳转只执行一次（loginExpiredHandled 标记）。
 * 6. 死循环：被重放的请求若再次 401，标记 __retried 后不再二次刷新，直接失败。
 * 7. 多标签页：监听 storage 事件，A 标签页刷新后 B 标签页同步新 token 并重排主动刷新定时器。
 * 8. 主动刷新：在 access token 过期前 5 分钟主动刷新，避免业务请求撞上 401。
 * 9. 退出清理：登出/跳转登录时清除定时器与队列，避免内存泄漏与跳转后的残留请求。
 * 10. 状态复位：成功登录后重置 loginExpiredHandled，保证下一次过期仍能正常提示。
 */
import axios from 'axios';
import auth from '@/utils/auth';
import logger from '@/utils/logger';
import { message } from '@/utils/antdStatic';
import { t } from '@/i18n';
import useAuthStore from '@/store/useAuthStore';
import {
  TOKEN_REFRESH_BUFFER,
  TOKEN_REFRESH_MIN_INTERVAL,
  TOKEN_REFRESH_TIMEOUT,
} from '@/constants';

// ---------- 状态 ----------

/** 是否正在刷新（单飞标记） */
let isRefreshing = false;
/** 刷新期间等待重放的请求队列：{ resolve, reject } */
let pendingQueue = [];
/** “登录已过期”提示 + 跳转 是否已执行过（去重，整个过期周期内只触发一次） */
let loginExpiredHandled = false;
/** 主动刷新定时器句柄 */
let proactiveTimer = null;
/** 最近一次主动刷新触发时间，用于最小间隔节流 */
let lastProactiveAt = 0;
/** 多标签页 storage 监听是否已绑定 */
let storageListenerBound = false;

// ---------- 工具：baseURL（与 request.js 保持一致） ----------

const getBaseURL = () => {
  try {
    return window.__APP_CONFIG__?.apiBaseUrl || '';
  } catch {
    return '';
  }
};

/** 解析 JWT payload（不校验签名，仅前端用于读取 exp） */
const decodeJwtExp = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload && typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
};

// ---------- 核心刷新 ----------

/**
 * 执行一次 token 刷新（单飞）。
 * - 并发调用时只发一次真实请求，其余 await 同一个 Promise。
 * @returns {Promise<string>} 新的 access token
 */
export function doRefreshToken() {
  // 已在刷新中：挂入队列等待结果
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      pendingQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  const refreshToken = auth.getRefreshToken();

  // 没有 refresh token：直接判定为需要重新登录
  if (!refreshToken) {
    isRefreshing = false;
    handleRefreshFailed();
    return Promise.reject(new Error('missing refresh token'));
  }

  // 走裸 axios，绕过 request.js 拦截器，防止刷新接口 401 触发再次刷新（死循环）
  return axios
    .post(
      '/api/auth/refresh',
      { refreshToken },
      { baseURL: getBaseURL(), timeout: TOKEN_REFRESH_TIMEOUT },
    )
    .then((resp) => {
      const body = resp?.data;
      const data = body?.data;
      // 后端业务码非 200 或无 token → refresh token 已被后端拒绝
      if (!body || body.code !== 200 || !data || !data.token) {
        const err = new Error(body?.msg || 'refresh rejected');
        err.__refreshRejected = true;
        throw err;
      }
      const { token, refreshToken: newRefreshToken } = data;
      auth.setToken(token);
      if (newRefreshToken) auth.setRefreshToken(newRefreshToken);

      // 同步 store 中的 token（循环引用仅在运行时调用，安全）
      useAuthStore.getState().setToken?.(token);

      // 重放队列中等待的请求
      pendingQueue.forEach((cb) => cb.resolve(token));
      pendingQueue = [];
      isRefreshing = false;

      // 重新排定主动刷新
      scheduleProactiveRefresh(token);
      return token;
    })
    .catch((err) => {
      // 统一拒绝队列
      pendingQueue.forEach((cb) => cb.reject(err));
      pendingQueue = [];
      isRefreshing = false;

      // 仅当 refresh token 被后端明确拒绝时才退出登录；
      // 网络错误 / 5xx 视为抖动，不登出，避免弱网误杀会话
      const isRejected = err?.__refreshRejected || err?.response?.status === 401 || err?.response?.status === 403;
      if (isRejected || !auth.getRefreshToken()) {
        handleRefreshFailed();
      }
      throw err;
    });
}

// ---------- 登录过期处理（去重） ----------

/**
 * 处理“登录已过期”：只弹一次提示、只清一次本地状态、只跳一次登录页。
 * 多个接口接连 401 时，后续调用直接 return，不再扎眼地重复弹窗。
 */
export function handleRefreshFailed() {
  if (loginExpiredHandled) return;
  loginExpiredHandled = true;

  // 停掉主动刷新定时器
  clearProactiveRefresh();

  try {
    message.error(t('common.loginExpired'));
  } catch { /* ignore */ }

  // 清理本地凭证与内存队列
  auth.clearAll();
  pendingQueue = [];

  // 延迟跳转，保证提示能展示出来；跳到 token 过期页（带倒计时），由该页引导用户重新登录
  setTimeout(() => {
    if (window.location.pathname !== '/token-expired' && window.location.pathname !== '/login') {
      window.location.replace('/token-expired');
    }
  }, 400);
}

/**
 * 重置“登录已过期”标记。
 * 在用户重新登录成功后调用，保证下次过期仍能正常提示与跳转。
 */
export function resetLoginExpiredFlag() {
  loginExpiredHandled = false;
}

// ---------- 主动刷新（定时器） ----------

/**
 * 根据 access token 的 exp 安排一次主动刷新：
 * 在过期前 TOKEN_REFRESH_BUFFER 触发；剩余时间不足则立即刷新。
 */
export function scheduleProactiveRefresh(token) {
  clearProactiveRefresh();

  const access = token || auth.getToken();
  const expSec = decodeJwtExp(access);
  if (!expSec) return; // 无法解析 exp（如非 JWT），交由被动 401 兜底

  const expMs = expSec * 1000;
  const delay = expMs - TOKEN_REFRESH_BUFFER - Date.now();

  // 节流：距离上次主动刷新太近则不再立即触发，改为最小间隔后重排
  const minInterval = TOKEN_REFRESH_MIN_INTERVAL;

  if (delay <= 0) {
    const elapsed = Date.now() - lastProactiveAt;
    if (elapsed < minInterval) {
      // 稍后重排，避免异常状态下风暴式刷新
      proactiveTimer = setTimeout(() => scheduleProactiveRefresh(access), minInterval - elapsed);
      return;
    }
    lastProactiveAt = Date.now();
    // 立即刷新；失败时由 doRefreshToken 内部决定是否登出
    doRefreshToken().catch((e) => {
      if (import.meta.env.DEV) logger.warn('主动刷新失败:', e?.message || e);
    });
    return;
  }

  proactiveTimer = setTimeout(() => {
    lastProactiveAt = Date.now();
    doRefreshToken().catch((e) => {
      if (import.meta.env.DEV) logger.warn('主动刷新失败:', e?.message || e);
    });
  }, delay);
}

/** 清除主动刷新定时器 */
export function clearProactiveRefresh() {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}

// ---------- 多标签页同步 ----------

/**
 * 监听 localStorage 变化：其他标签页刷新 token 后，本标签页同步重排主动刷新定时器。
 * 仅对 token 变化感兴趣，避免无谓处理。
 */
export function bindTabSync() {
  if (storageListenerBound) return;
  storageListenerBound = true;
  window.addEventListener('storage', (e) => {
    if (e.key === 'luxury_car_token' && e.newValue) {
      // 其他标签页已写入新 token，本地 storage 已自动更新，重排定时器即可
      scheduleProactiveRefresh(e.newValue.replace(/^"|"$/g, ''));
    }
    if (e.key === 'luxury_car_refresh_token' && !e.newValue) {
      // 其他标签页登出，refresh token 被清空，本标签页也停止刷新
      clearProactiveRefresh();
    }
  });
}

/**
 * 在已认证布局挂载时调用：启动主动刷新 + 多标签页同步。
 */
export function startTokenAutoRefresh() {
  bindTabSync();
  scheduleProactiveRefresh(auth.getToken());
}

/**
 * 在登出/离开认证布局时调用：停止主动刷新，清空队列。
 */
export function stopTokenAutoRefresh() {
  clearProactiveRefresh();
  pendingQueue = [];
  isRefreshing = false;
}

export default {
  doRefreshToken,
  handleRefreshFailed,
  resetLoginExpiredFlag,
  scheduleProactiveRefresh,
  clearProactiveRefresh,
  startTokenAutoRefresh,
  stopTokenAutoRefresh,
  bindTabSync,
};
