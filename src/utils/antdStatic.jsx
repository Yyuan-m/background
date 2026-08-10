/**
 * antd 5.x 全局静态方法注入
 *
 * 在 antd 5.x 中，直接 `import { message } from 'antd'` 使用静态方法
 * 无法消费 ConfigProvider 的 context（主题、prefixCls、locale 等），
 * 会导致弹窗样式不生效或控制台警告。
 *
 * 本模块按官方"全局场景（redux 场景）"模式实现：
 *   1. 在应用顶层通过 <StaticFunctionSetter /> 组件调用 App.useApp()
 *      获取 message / notification / modal 实例并赋值给本模块导出变量。
 *   2. 非组件场景（如 request.js、store 等）从本模块 import 使用。
 *
 * 利用 ES Module 的 live binding 特性：组件渲染后重新赋值，
 * import 端会自动看到最新实例。
 *
 * 用法：
 *   - 组件内：优先使用 `const { message } = App.useApp();`
 *   - 非组件：`import { message } from '@/utils/antdStatic';`
 *
 * 注意：<StaticFunctionSetter /> 必须渲染在 <App> 组件之内。
 *       在注入完成前，本模块回退到 antd 原生静态方法，保证基本可用。
 */
import { App as AntdApp, message as rawMessage, notification as rawNotification, Modal as rawModal } from 'antd';

// 初始回退到 antd 原生静态方法，保证注入前也能用
export let message = rawMessage;
export let notification = rawNotification;
export let modal = rawModal;

/**
 * 在 <App> 内渲染此组件以注入静态方法实例（消费 ConfigProvider context）
 * @returns {null} 不渲染任何 DOM
 */
export const StaticFunctionSetter = () => {
  const staticFunction = AntdApp.useApp();
  message = staticFunction.message;
  modal = staticFunction.modal;
  notification = staticFunction.notification;
  return null;
};
