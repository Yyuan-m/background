/**
 * 国际化 (i18n) 基础框架
 *
 * 所有 UI 文本的单一来源，修改此处即可全局生效。
 * 后续接入多语言时只需添加其他语言包即可。
 *
 * 使用方式：
 *   import { t } from '@/i18n';
 *   t('menu.dashboard')  // → '仪表盘'
 *   t('common.total', { total: 100 })  // → '共 100 条'
 */

import storage from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants';

// ==================== 中文语言包 ====================
const zhCN = {
  // ---------- 通用 ----------
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '新增',
    search: '搜索',
    reset: '重置',
    export: '导出',
    import: '导入',
    upload: '上传',
    download: '下载',
    refresh: '刷新',
    submit: '提交',
    back: '返回',
    close: '关闭',
    yes: '是',
    no: '否',
    success: '操作成功',
    failed: '操作失败',
    loading: '加载中...',
    noData: '暂无数据',
    total: '共 {total} 条',
    selected: '已选择 {count} 项',
    operation: '操作',
    status: '状态',
    createTime: '创建时间',
    updateTime: '更新时间',
    remark: '备注',
    actions: '操作',
    detail: '详情',
    more: '更多',
    pleaseSelect: '请选择',
    pleaseInput: '请输入',
    enabled: '启用',
    disabled: '禁用',
    tip: '提示',
    searchMenu: '搜索菜单...',
    confirmDelete: '确定要删除吗？',
    confirmCloseTab: '确定要关闭所有标签页吗？关闭后将跳转到数据仪表盘页面。',
    home: '首页',
    manage: '管理',
    logout: '退出登录',
    changePassword: '修改密码',
    fullscreen: '全屏显示',
    exitFullscreen: '退出全屏',
    refreshPage: '刷新页面',
    tabOperations: '标签页操作',
    closeCurrent: '关闭当前',
    closeLeft: '关闭左侧',
    closeRight: '关闭右侧',
    closeAll: '关闭所有',
    noPermission: '无权限访问',
    pageNotFound: '页面未找到',
    serverError: '服务器内部错误',
    tokenExpired: 'Token过期',
    notFound: '未找到',
    reload: '刷新页面',
    retry: '重试',
    backHome: '返回首页',
    reLogin: '重新登录',
    welcome: '欢迎访问大圣玩车后台管理系统',
    websiteConfig: '网站配置',
    announcement: '公告管理',
    carousel: '轮播图配置',
    dictionary: '数据字典',
    operationLog: '操作日志',
    operationLogTitle: '操作日志',
    profile: '个人中心',
    register: '注册',
    forgotPassword: '找回密码',
    marketing: '营销活动',
    afterSales: '售后工单',
    financeOverview: '财务统计',
    // 订单
    orderId: '订单ID',
    orderNo: '订单编号',
    customerName: '客户名称',
    orderAmount: '订单金额',
    orderStatus: '订单状态',
    orderTime: '下单时间',
    orderDetail: '订单详情',
    // 车辆
    vehicleId: '车辆ID',
    plateNumber: '车牌号',
    model: '车型',
    vehicleStatus: '车辆状态',
    price: '价格',
    vehicleDetail: '车辆详情',
    // 客户
    customerId: '客户ID',
    customerPhone: '手机号',
    customerEmail: '邮箱',
    customerDetail: '租客详情',
    // 系统
    userList: '用户列表',
    roleList: '角色列表',
    menuList: '菜单列表',
    // 公告
    announcementTitle: '公告标题',
    // 轮播图
    carouselTitle: '轮播图标题',
    // 字典
    dictName: '字典名称',
    dictCode: '字典编码',
    // 系统设置
    configItem: '配置项',
    configValue: '配置值',
    // 操作日志
    operator: '操作人',
    operationTime: '操作时间',
    operationDesc: '操作描述',
    operationType: '操作类型',
    operationResult: '操作结果',
    operationIp: '操作IP',
    userAgent: '用户代理',
    operationDetail: '操作详情',
    // 网络错误
    networkError: '网络连接失败，请检查网络',
    networkException: '网络异常，请稍后重试',
    requestTimeout: '请求超时，请稍后重试',
    requestFailed: '请求失败',
    requestBusy: '请求过于频繁，请稍后重试',
    paramError: '请求参数错误',
    loginExpired: '登录已过期，请重新登录',
    noPermissionAccess: '没有权限访问',
    resourceNotFound: '请求的资源不存在',
    paramValidationFailed: '参数校验失败',
    serverInternalError: '服务器内部错误',
    serviceUnavailable: '服务暂时不可用，请稍后重试',
    retrying: '请求失败，正在重试 ({current}/{total})...',
    concurrentLimit: '并发请求数已达上限，请稍后重试',
  },
  // ---------- 菜单 ----------
  menu: {
    dashboard: '数据仪表盘',
    orders: '订单管理',
    vehicles: '车辆管理',
    customers: '租客管理',
    finance: '财务统计',
    marketing: '营销活动',
    afterSales: '售后工单',
    system: '系统管理',
    users: '用户管理',
    roles: '角色管理',
    menus: '菜单管理',
    settings: '系统设置',
    profile: '个人中心',
  },
  // ---------- 登录 ----------
  login: {
    title: '欢迎回来',
    subtitle: '登录您的账户',
    username: '用户名',
    password: '密码',
    remember: '记住密码',
    login: '登 录',
    register: '注册账号',
    forgotPassword: '忘记密码？',
    success: '登录成功',
    usernameRequired: '请输入用户名',
    passwordRequired: '请输入密码',
    brandName: 'LUXURY CAR',
    brandSubtitle: '大圣玩车',
  },
  // ---------- 错误页面 ----------
  error: {
    pageNotFound: '页面不存在',
    pageNotFoundDesc: '抱歉，您访问的页面不存在或已被移除。',
    forbidden: '无权访问',
    forbiddenDesc: '抱歉，您没有权限访问此页面。',
    serverError: '服务器错误',
    serverErrorDesc: '抱歉，服务器发生了意外错误，请稍后再试。',
    tokenExpired: '登录已过期',
    tokenExpiredDesc: '您的登录状态已过期，请重新登录。',
    renderError: '页面渲染出错',
    renderErrorDesc: '抱歉，页面发生了意外错误，请尝试刷新页面。',
    goHome: '返回首页',
    goLogin: '重新登录',
    retry: '重试',
    reload: '刷新页面',
  },
  // ---------- 通知 ----------
  notification: {
    title: '消息通知',
    markAllRead: '全部已读',
    empty: '暂无通知',
  },
  // ---------- 页面标题 ----------
  pageTitle: {
    dashboard: '数据仪表盘',
    orders: '订单管理',
    vehicles: '车辆管理',
    customers: '租客管理 (CRM)',
    finance: '财务统计',
    marketing: '营销活动',
    afterSales: '售后工单',
    systemSettings: '网站配置',
    announcements: '公告管理',
    carousel: '轮播图配置',
    dictionary: '数据字典',
    operationLogs: '操作日志',
    users: '用户管理',
    roles: '角色管理',
    menus: '菜单管理',
    profile: '个人中心',
  },
  // ---------- 面包屑 ----------
  breadcrumb: {
    dashboard: '数据仪表盘',
    vehicles: '车辆管理',
    orders: '订单管理',
    customers: '租客管理',
    finance: '财务统计',
    marketing: '营销活动',
    afterSales: '售后工单',
    settings: '系统设置',
    system: '网站配置',
    announcements: '公告管理',
    profile: '个人中心',
    carousel: '轮播图配置',
    dictionary: '数据字典',
    users: '用户管理',
    roles: '角色管理',
    menus: '菜单管理',
    logs: '操作日志',
    home: '首页',
    orderDetail: '订单详情',
    vehicleDetail: '车辆详情',
    customerDetail: '租客详情',
  },
};

// ==================== 语言包映射 ====================
const messages = {
  'zh-CN': zhCN,
};

// ==================== 工具函数 ====================

/** 获取当前语言 */
const getLocale = () => {
  try {
    return storage.get(STORAGE_KEYS.LOCALE, 'zh-CN');
  } catch {
    return 'zh-CN';
  }
};

/** 设置语言 */
const setLocale = (locale) => {
  storage.set(STORAGE_KEYS.LOCALE, locale);
};

/**
 * 翻译函数
 * @param {string} key   - 翻译键，支持点号分隔，如 'menu.dashboard'
 * @param {object} params - 插值参数，如 { count: 5 }
 * @returns {string} 翻译后的文本
 *
 * @example
 *   t('common.total', { total: 100 })  // → '共 100 条'
 *   t('menu.dashboard')                // → '仪表盘'
 */
const t = (key, params = {}) => {
  const locale = getLocale();
  const langPack = messages[locale] || messages['zh-CN'];

  // 按点号拆分路径
  const keys = key.split('.');
  let value = langPack;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // 未找到翻译，返回原始 key
    }
  }

  if (typeof value !== 'string') return key;

  // 插值替换 {key}
  return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
    return params[paramKey] !== undefined ? String(params[paramKey]) : `{${paramKey}}`;
  });
};

export { t, getLocale, setLocale, messages };
export default t;
