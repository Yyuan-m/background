/**
 * 图片/静态资源 URL 处理工具
 *
 * 后端返回的图片地址可能是以下几种形式：
 *   1. 绝对 URL：http://192.168.5.185:8088/uploads/xxx.png  → 直接返回
 *   2. data URI：data:image/png;base64,...                   → 直接返回
 *   3. 相对路径：/uploads/xxx.png                            → 需拼接后端 origin
 *
 * 后端 origin 从 window.__APP_CONFIG__.assetBaseUrl 读取：
 *   - 开发环境留空（靠 vite.config.js 的 /uploads 代理转发到后端）
 *   - 生产环境填完整地址，如 'http://your-server:8088'
 */

/** 读取静态资源基础地址 */
const getAssetBaseUrl = () => {
  try {
    return window.__APP_CONFIG__?.assetBaseUrl || '';
  } catch {
    return '';
  }
};

/**
 * 将后端返回的图片地址转换为可访问的完整 URL
 * @param {string} url 后端返回的图片地址
 * @returns {string} 可直接用于 <img src> / <Image src> 的 URL
 */
export const imageUrl = (url) => {
  if (!url) return '';
  // 绝对 URL（http/https）和 data URI 直接返回
  if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url)) return url;
  // 相对路径拼接后端 origin
  const base = getAssetBaseUrl();
  return base + url;
};

export default imageUrl;
