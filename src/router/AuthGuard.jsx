import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { routePermissionMap } from '@/router/routeConfig';

/**
 * 路由守卫 - 未登录重定向到登录页，无权限重定向到403
 * 权限映射由各页面导出的 routeConfig 自动生成，无需手动维护。
 */
const AuthGuard = ({ children }) => {
  const { isLoggedIn, hasPermission } = useAuthStore();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 权限检查：精确匹配 → 前缀匹配
  const path = location.pathname;
  let requiredPermission = routePermissionMap[path];

  if (!requiredPermission) {
    // 前缀匹配（如 /orders/123 → order）
    for (const [routePath, perm] of Object.entries(routePermissionMap)) {
      if (routePath !== '/' && path.startsWith(`${routePath}/`)) {
        requiredPermission = perm;
        break;
      }
    }
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/403" replace />;
  }

  return children;
};

export default AuthGuard;
