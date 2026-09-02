import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '@/layout/MainLayout';
import AuthGuard from '@/router/AuthGuard';
import GuestGuard from '@/router/GuestGuard';
import HomeRedirect from '@/router/HomeRedirect';
import routeConfigs from '@/router/routeConfig';

/**
 * 基于 routeConfig.js 自动发现的路由配置构建路由树。
 *
 * 新增页面只需：
 * 1. 在 src/pages/ 下创建 .jsx 文件
 * 2. 在默认导出组件上挂载 routeConfig = { path, permission?, guest?, standalone? }
 * 3. 导出默认组件
 * 无需手动修改路由文件。
 */

// 分类路由
const guestRoutes = routeConfigs.filter((c) => c.guest);
const standaloneRoutes = routeConfigs.filter((c) => c.standalone);
const authRoutes = routeConfigs.filter((c) => !c.guest && !c.standalone);

const router = createBrowserRouter([
  // 游客页面（登录、注册、忘记密码等）
  ...guestRoutes.map(({ path, component: Page }) => ({
    path,
    element: <GuestGuard><Page /></GuestGuard>,
  })),
  // 需要认证的页面（嵌套在 MainLayout 中）
  {
    path: '/',
    element: <AuthGuard><MainLayout /></AuthGuard>,
    children: [
      // 首页智能重定向：跳转到当前用户第一个有权限的菜单（避免无 dashboard 权限账号 403 循环）
      { index: true, element: <HomeRedirect /> },
      ...authRoutes.map(({ path, component: Page }) => ({
        path: path.startsWith('/') ? path.slice(1) : path,
        element: <Page />,
      })),
    ],
  },
  // 独立页面（403 等，无需守卫包裹）
  ...standaloneRoutes.map(({ path, component: Page }) => ({
    path,
    element: <Page />,
  })),
  // 兜底：未匹配路由跳转到 404
  { path: '*', element: <Navigate to="/404" replace /> },
]);

export default router;
