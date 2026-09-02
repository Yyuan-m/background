import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import useAppStore from '@/store/useAppStore';
import useAuthStore from '@/store/useAuthStore';

/**
 * 首页智能重定向：
 * 访问 "/" 时跳转到当前用户第一个有权限的菜单（默认数据仪表盘）。
 * 避免固定跳 /dashboard 导致无该权限的账号（如纯客服）进入 403 循环。
 *
 * 菜单树异步加载：加载完成前渲染 loading，加载完成后取第一个可见顶级菜单跳转；
 * 菜单为空（异常场景）时兜底跳 /403。
 */
const HomeRedirect = () => {
  const { menuTree, menuLoading, loadMenuTree } = useAppStore();
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    // 首次进入且菜单为空时触发加载（MainLayout 同样会加载，此处兜底）
    if (!menuLoading && menuTree.length === 0) {
      void loadMenuTree();
    }
  }, [menuLoading, menuTree.length, loadMenuTree]);

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
