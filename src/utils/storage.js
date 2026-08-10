/**
 * localStorage / sessionStorage 封装工具类
 */
import logger from '@/utils/logger';

const storage = {
  /**
   * localStorage 设置
   */
  set(key, value) {
    try {
      const val = typeof value === 'object' ? JSON.stringify(value) : value;
      localStorage.setItem(key, val);
    } catch (e) {
      logger.error('storage set error:', e);
    }
  },

  /**
   * localStorage 获取
   */
  get(key, defaultValue = null) {
    try {
      const val = localStorage.getItem(key);
      if (val === null) return defaultValue;
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    } catch (e) {
      logger.error('storage get error:', e);
      return defaultValue;
    }
  },

  /**
   * localStorage 删除
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      logger.error('storage remove error:', e);
    }
  },

  /**
   * localStorage 清空
   */
  clear() {
    try {
      localStorage.clear();
    } catch (e) {
      logger.error('storage clear error:', e);
    }
  },

  /**
   * sessionStorage 设置
   */
  session: {
    set(key, value) {
      try {
        const val = typeof value === 'object' ? JSON.stringify(value) : value;
        sessionStorage.setItem(key, val);
      } catch (e) {
        logger.error('sessionStorage set error:', e);
      }
    },
    get(key, defaultValue = null) {
      try {
        const val = sessionStorage.getItem(key);
        if (val === null) return defaultValue;
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      } catch (e) {
        logger.error('sessionStorage get error:', e);
        return defaultValue;
      }
    },
    remove(key) {
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        logger.error('sessionStorage remove error:', e);
      }
    },
  },
};

export default storage;
