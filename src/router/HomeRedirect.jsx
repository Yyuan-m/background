import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import useAppStore from '@/store/useAppStore';
import useAuthStore from '@/store/useAuthStore';

/**
 * 首页智能重定向：
 * 访问 "/" 时跳转到当前用户第一个有权限的菜单（默认数据仪表盘）。
 * 避免固定跳 /dashboard 导致无该权限的账号（如纯客服）进入 403 循环。
 *
 * 菜单树由父级 MainLayout 挂载时统一加载（单飞去重），此处只读取不请求：
 * 1) 不再重复调用 loadMenuTree → 消除登录期对 /api/system/menu/user-menus 的重复请求；
 * 2) 只有当菜单加载完成（menuLoading 为 false）且非空时才导航，
 *    避免空菜单时反复触发加载造成的无限请求循环与页面崩溃。
 */
const HomeRedirect = () => {
  const { menuTree, menuLoading } = useAppStore();
  const { hasPermission } = useAuthStore();

  // 菜单加载完成前保持 loading，避免菜单未就绪时误跳到 /403
  if (menuLoading || menuTree.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin tip="正在加载菜单..." />
      </div>
    );
  }

  // 第一个有权限的顶级菜单（menuTree 已由后端按权限过滤，这里再校验一层）
  const firstPermitted = menuTree.find((item) => hasPermission(item.permission));
  const target = firstPermitted?.key || '/403';

  return <Navigate to={target} replace />;
};

export default HomeRedirect;
