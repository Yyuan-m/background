/**
 * 图片/静态资源 URL 处理工具
 *
 * 后端返回的图片地址可能是以下几种形式：
 *   1. 绝对 URL：http://192.168.5.8:8088/uploads/xxx.png  → 直接返回（兼容历史数据）
 *   2. data URI：data:image/png;base64,...               → 直接返回
 *   3. 相对路径：/uploads/xxx.png                         → 需拼接后端 origin
 *
 * 双 base URL 设计：
 *   - 后台服务（8088）：window.__APP_CONFIG__.assetBaseUrl
 *       开发环境留空（靠 vite.config.js 的 /uploads 代理转发到 8088）
 *       生产环境填完整地址，如 'http://192.168.5.8:8088'
 *   - 客户端服务（8089）：window.__APP_CONFIG__.customerAssetBaseUrl
 *       用于展示客户头像、客户评价图片等由 8089 服务上传的资源
 *       开发环境留空时，会回退到 8088 base（仅当 8088 base 也为空时直接返回相对路径）
 *       生产环境填完整地址，如 'http://192.168.5.8:8089'
 */

/** 读取后台服务（8088）静态资源基础地址 */
const getAssetBaseUrl = () => {
  try {
    return window.__APP_CONFIG__?.assetBaseUrl || '';
  } catch {
    return '';
  }
};

/** 读取客户端服务（8089）静态资源基础地址 */
const getCustomerAssetBaseUrl = () => {
  try {
    const cfg = window.__APP_CONFIG__ || {};
    // 优先取 customerAssetBaseUrl，未配置时回退到 8088 base（兼容未配置场景）
    return cfg.customerAssetBaseUrl ?? cfg.assetBaseUrl ?? '';
  } catch {
    return '';
  }
};

/**
 * 将后端返回的图片地址转换为可访问的完整 URL
 * @param {string} url 后端返回的图片地址
 * @param {Object} [options] 可选参数
 * @param {string} [options.source='admin'] 来源：'admin'（8088）| 'customer'（8089）
 * @returns {string} 可直接用于 <img src> / <Image src> 的 URL
 */
export const imageUrl = (url, options) => {
  if (!url) return '';
  // 绝对 URL（http/https）和 data URI 直接返回
  if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url)) return url;

  const source = options?.source || (typeof options === 'string' ? options : 'admin');
  const base = source === 'customer' ? getCustomerAssetBaseUrl() : getAssetBaseUrl();
  return base + url;
};

/**
 * 客户端图片（8089 服务）URL 转换快捷方法
 * 用于展示客户头像、客户评价图片等由 8089 服务上传的资源
 * @param {string} url 后端返回的图片地址
 * @returns {string} 可直接用于 <img src> / <Image src> 的 URL
 */
export const customerImageUrl = (url) => imageUrl(url, { source: 'customer' });

export default imageUrl;
