/**
 * 应用常量配置
 *
 * 集中管理所有硬编码常量，方便统一维护和主题定制。
 * 业务相关常量在此定义，环境相关配置通过 .env 文件管理。
 */

// ==================== 应用信息 ====================
export const APP_NAME = 'LUXURY CAR';
export const APP_SUBTITLE = '豪华汽车租赁后台管理系统';
export const APP_VERSION = '0.2.0';

// ==================== 分页默认值 ====================
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;

// ==================== 上传限制 ====================
export const UPLOAD_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const UPLOAD_ACCEPT_TYPES = {
  image: '.jpg,.jpeg,.png,.gif,.webp,.svg',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.csv',
  all: '.jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.csv',
};

// ==================== 时间格式 ====================
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const TIME_FORMAT = 'HH:mm:ss';

// ==================== 请求配置 ====================
export const REQUEST_TIMEOUT = 15000;
export const UPLOAD_TIMEOUT = 60000;
export const REQUEST_RETRY_COUNT = 0;
export const REQUEST_RETRY_DELAY = 1000;

// ==================== 缓存 Key 常量 ====================
export const STORAGE_KEYS = {
  TOKEN: 'luxury_car_token',
  REFRESH_TOKEN: 'luxury_car_refresh_token',
  USER: 'luxury_car_user',
  REMEMBER: 'luxury_car_remember',
  TABS: 'app_tabs',
  SIDEBAR_COLLAPSED: 'app_sidebar_collapsed',
  THEME_CONFIG: 'app_theme_config',
  PERMISSIONS: 'app_permissions',
  LOCALE: 'app_locale',
};

// ==================== Token 刷新配置 ====================
// access token 主动刷新提前量：距过期还剩该时间时触发无感刷新（毫秒）
export const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 分钟
// 主动刷新定时器最短间隔，避免异常状态下频繁刷新
export const TOKEN_REFRESH_MIN_INTERVAL = 60 * 1000; // 1 分钟
// 刷新接口请求超时
export const TOKEN_REFRESH_TIMEOUT = 10000;

// ==================== 角色常量 ====================
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

// ==================== 路由路径 ====================
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  FORBIDDEN: '/403',
  NOT_FOUND: '/404',
  SERVER_ERROR: '/500',
  TOKEN_EXPIRED: '/token-expired',
};

// ==================== 主题配置项 ====================
export const SIDEBAR_WIDTHS = {
  compact: { expanded: 200, collapsed: 64 },
  default: { expanded: 240, collapsed: 80 },
  wide: { expanded: 280, collapsed: 80 },
};

export const BORDER_RADII = {
  small: 4,
  medium: 6,
  large: 10,
};

// ==================== 菜单配置 ====================
export const MENU_ICON_SIZE = 18;

// ==================== 通知/消息 ====================
export const MESSAGE_DURATION = 3; // 消息提示显示时长（秒）
export const NOTIFICATION_DURATION = 4.5; // 通知显示时长（秒）
