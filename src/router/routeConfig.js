/**
 * 自动扫描 pages/ 目录下所有 .jsx 文件，
 * 读取每个组件上的 routeConfig 属性，生成路由配置和权限映射。
 *
 * 此文件独立于 router/index.jsx，避免与 AuthGuard 产生循环依赖。
 */
const pageModules = import.meta.glob('../pages/**/*.jsx', { eager: true });

// 收集所有 routeConfig
const routeConfigs = [];
Object.entries(pageModules).forEach(([, module]) => {
  const component = module.default;
  if (component?.routeConfig) {
    routeConfigs.push({
      ...component.routeConfig,
      component,
    });
  }
});

/** 路由路径 → 权限标识映射，供 AuthGuard 使用 */
export const routePermissionMap = {};
routeConfigs.forEach(({ path, permission }) => {
  if (path && permission) {
    routePermissionMap[path] = permission;
  }
});

/** 所有路由配置（含组件引用），供 router/index.jsx 构建路由树 */
export default routeConfigs;
