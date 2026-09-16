# LUXURY CAR - 大圣玩车后台管理系统（前端）

基于 **React 19 + Vite 6 + Ant Design 5** 构建的租车业务后台管理系统前端工程，配套后端服务 `my-first-react-app-server`（Spring Boot，默认 `8088` 端口）。

系统覆盖租车业务全流程：车辆管理、订单管理、客户管理与实名审核、财务管理、营销活动、售后服务、用户反馈、系统设置（用户 / 角色 / 菜单 / 字典 / 文件 / 日志 / 门店 / 轮播）等，内置按钮级权限、无感 Token 刷新、多主题换肤、多标签页工作台等企业级能力。

---

## 一、技术栈

| 分类 | 技术 | 版本 | 说明 |
| --- | --- | --- | --- |
| 前端框架 | React | ^19.2.7 | 函数组件 + Hooks |
| 构建工具 | Vite | ^6.2.0 | 开发服务器 / 生产构建 |
| UI 组件库 | Ant Design | ^5.24.6 | 配合 `@ant-design/icons` ^5.6.1 |
| 路由 | react-router-dom | ^6.28.0 | `createBrowserRouter` 数据路由 |
| 状态管理 | Zustand | ^5.0.3 | 轻量全局状态（3 个 store） |
| HTTP 客户端 | Axios | ^1.7.9 | 统一封装请求层 |
| 时间处理 | Day.js | ^1.11.13 | 配合 antd 本地化 |
| 图表 | Recharts | ^2.15.0 | 仪表盘 / 财务图表 |
| 样式 | Sass | ^1.83.0 | `modern-compiler` API |
| 性能监控 | web-vitals | ^6.0.0 | 生产环境核心指标采集 |
| 代码规范 | ESLint | ^9.39.5 | Flat Config 扁平化配置 |

> 环境要求：**Node.js ≥ 18**、**npm ≥ 9**（推荐使用 pnpm / yarn 亦可）。

---

## 二、快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动后端服务

前端通过 Vite 代理访问后端，请先确保后端 `my-first-react-app-server` 已启动并监听 `http://localhost:8088`。

接口文档（Knife4j）：`http://localhost:8088/doc.html`

### 3. 启动前端开发服务器

```bash
npm run dev
```

启动后会自动打开浏览器：`http://localhost:3001`

### 4. 生产构建与预览

```bash
npm run build     # 产物输出到 dist/
npm run preview   # 本地预览 dist 产物
```

---

## 三、可用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（端口 `3001`，自动打开浏览器） |
| `npm start` | 等价于 `npm run dev` |
| `npm run build` | 生产构建，输出到 `dist/` |
| `npm run preview` | 预览生产构建产物 |
| `npm run lint` | ESLint 检查 `src` |
| `npm run lint:fix` | ESLint 自动修复 |

---

## 四、环境变量

变量定义在 `.env`（公共）、`.env.development`（开发）、`.env.production`（生产），Vite 中通过 `import.meta.env` 读取。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_APP_TITLE` | `LUXURY CAR - 大圣玩车后台管理系统` | 应用标题 |
| `VITE_API_BASE_URL` | `/api` | API 基础路径（开发环境走 Vite 代理） |
| `VITE_ENABLE_MOCK` | `false` | 是否启用 Mock 数据 |
| `VITE_ENABLE_LOGGER` | `true` | 是否启用前端日志 |
| `VITE_LOG_LEVEL` | 开发 `debug` / 生产 `warn` | 日志级别：`debug \| info \| warn \| error \| none` |
| `VITE_REQUEST_TIMEOUT` | `15000` | 普通请求超时（毫秒） |
| `VITE_UPLOAD_TIMEOUT` | `60000` | 文件上传超时（毫秒） |

---

## 五、运行时配置（`window.__APP_CONFIG__`）

在 [index.html](index.html) 中通过内联脚本声明全局运行时配置，**生产部署时只需修改此处即可切换后端地址，无需重新构建前端**。

配置由 `AppConfigProvider`（[src/context/AppConfigContext.jsx](src/context/AppConfigContext.jsx)）统一注入，业务代码通过 `useAppConfig()` 读取。

| 字段 | 说明 |
| --- | --- |
| `apiBaseUrl` | 后端 API 基础地址。开发留空走 Vite 代理；生产填写后端地址，如 `http://your-server:8088/api` |
| `assetBaseUrl` | 后端静态资源（图片/文件）地址，对应后台服务 `8088` |
| `customerAssetBaseUrl` | 客户端服务 `8089` 的静态资源地址，用于客户头像、客户评价图片等 |
| `appName` / `appSubtitle` / `appVersion` | 应用名称、副标题、版本号（控制浏览器标题栏） |
| `locale` | 国际化语言（当前仅 `zh-CN`） |
| `dictionary` / `user` | 字典数据、登录用户数据（登录后由代码填充） |

> 静态资源地址解析统一封装在 [src/utils/imageUrl.js](src/utils/imageUrl.js)：后台资源走 `assetBaseUrl`，客户端资源走 `customerAssetBaseUrl`（可用 `customerImageUrl()` 快捷生成）。

---

## 六、开发代理与跨域

开发环境在 [vite.config.js](vite.config.js) 中配置代理，切换后端时只需修改 `target`：

| 代理前缀 | 目标地址 | 说明 |
| --- | --- | --- |
| `/api` | `http://localhost:8088` | 后端业务接口 |
| `/uploads` | `http://localhost:8088` | 后端上传的静态资源 |

同时配置了路径别名 `@` → `src`（`jsconfig.json` 同步用于 IDE 智能提示）。

---

## 七、目录结构

```text
my-first-react-app/
├── public/                     # 静态资源（favicon、manifest 等）
├── src/
│   ├── api/
│   │   ├── request.js          # Axios 统一封装（拦截器 / 重试 / 刷新）
│   │   └── modules/            # 按业务拆分的接口模块（21 个）
│   ├── components/             # 通用组件
│   │   ├── DictSelect/         # 字典下拉选择（带模块级缓存）
│   │   ├── FileUploader/       # 文件上传（上传到 sys_file）
│   │   ├── IconPicker/         # 图标选择器
│   │   ├── ThemeConfig/        # 主题配置抽屉
│   │   ├── HomeCarousel/       # 首页轮播
│   │   ├── ErrorBoundary/      # 错误边界
│   │   ├── Loading/            # 加载态
│   │   ├── StatCard.jsx        # 统计卡片
│   │   └── CountUp.jsx         # 数字滚动
│   ├── constants/              # 全局常量
│   ├── context/                # React Context（运行时配置）
│   ├── hooks/                  # 自定义 Hooks
│   │   ├── useDict.js          # 字典
│   │   ├── useFullscreen.js    # 全屏
│   │   ├── useMenuSearch.js    # 全局菜单搜索
│   │   └── useVehicleOptions.js# 车辆下拉选项（模块级缓存）
│   ├── i18n/                   # 国际化
│   ├── layout/                 # 主布局（MainLayout / Header / Sidebar）
│   ├── pages/                  # 页面（按业务分目录）
│   ├── router/                 # 路由（自动扫描 + 权限守卫）
│   ├── store/                  # Zustand 状态
│   ├── styles/                 # 全局样式与变量
│   ├── utils/                  # 工具函数
│   ├── App.jsx                 # 根组件（ConfigProvider / RouterProvider）
│   └── index.jsx               # 应用入口
├── .env / .env.development / .env.production
├── eslint.config.js            # ESLint Flat Config
├── index.html                  # HTML 模板 + 运行时配置
├── jsconfig.json               # 路径别名（IDE）
├── package.json
├── vite.config.js
└── README.md
```

---

## 八、核心架构

### 1. 应用启动链路

[index.jsx](src/index.jsx) → [App.jsx](src/App.jsx)

```text
React.StrictMode
  └─ ErrorBoundary                 # 全局错误兜底
      └─ AppConfigProvider         # 注入 window.__APP_CONFIG__
          └─ Suspense (PageLoading)
              └─ App
                  └─ ConfigProvider (zhCN + 主题 token)
                      └─ AntdApp (静态方法上下文)
                          └─ RouterProvider
```

### 2. 路由自动扫描（约定优于配置）

路由由 [src/router/routeConfig.js](src/router/routeConfig.js) 通过 `import.meta.glob('../pages/**/*.jsx')` **自动扫描**生成，无需手动维护路由表。

新增一个页面只需三步：

1. 在 `src/pages/` 下创建 `.jsx` 页面组件（`export default`）；
2. 给组件挂载 `routeConfig` 静态属性；
3. 完成 —— 路由与权限映射会自动生成。

```jsx
function VehicleList() { /* ... */ }

VehicleList.routeConfig = { path: '/vehicles', permission: 'vehicle' };

export default VehicleList;
```

`routeConfig` 字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `path` | `string` | 路由路径（必填） |
| `permission` | `string` | 访问所需权限标识，缺省表示仅需登录 |
| `guest` | `boolean` | 游客页（如登录/注册），已登录访问会被重定向 |
| `standalone` | `boolean` | 独立页（如 403/404/500），不套任何守卫与布局 |

路由分类（[src/router/index.jsx](src/router/index.jsx)）：

- **游客路由**（`guest: true`）：`GuestGuard` 包裹，已登录则跳首页；
- **独立路由**（`standalone: true`）：无守卫、无布局；
- **鉴权路由**（其余）：嵌套在 `AuthGuard` + `MainLayout` 下；
- 根路径 `/` 由 `HomeRedirect` 重定向到第一个有权限的菜单；未匹配路径 → `/404`。

### 3. 请求层（`src/api/request.js`）

统一的 Axios 封装，具备生产级健壮性：

- **请求去重**：相同请求并发合并；
- **GET 缓存**：可选开启；
- **自动重试**：5xx / 网络异常按策略重试；
- **防抖**：避免重复触发；
- **403 提示去重**：避免权限报错弹窗刷屏；
- **自动附带 Token**：`Authorization: Bearer {accessToken}`；
- **401 无感刷新**：静默刷新 Token 并自动重放原请求；
- **Blob / ArrayBuffer 透传**：支持文件下载。

导出的快捷方法：`get` / `post` / `put` / `patch` / `del` / `upload` / `download` / `batchRequest` / `poll`。

接口统一响应结构 `{ code, msg, data }`，业务成功码 `0` 或 `200`，成功时返回 `data`。

### 4. 认证与无感刷新

- **双 Token 机制**：`accessToken` + `refreshToken`，存储于 [src/utils/auth.js](src/utils/auth.js)；
- **静默刷新**（[src/utils/tokenRefresh.js](src/utils/tokenRefresh.js)）：
  - 单飞（single-flight）刷新，避免并发重复刷新；
  - 刷新期间请求进入队列，成功后自动重放；
  - **到期前 5 分钟主动刷新**（`TOKEN_REFRESH_BUFFER`）；
  - 多标签页同步：监听 `storage` 事件保持一致；
  - 刷新失败统一跳转 `/token-expired`。

### 5. 权限模型（RBAC）

权限状态在 [src/store/useAuthStore.js](src/store/useAuthStore.js)，通过 `hasPermission(code)` 判断：

- **菜单级权限**：前缀（层级）匹配；
- **按钮级权限**：精确匹配。当权限标识包含 `add` / `update` / `delete` / `status` / `handle` / `process` / `restore` / `reset-password` / `export` / `import` 等动作词，或段数 ≥ 3 时，按按钮级精确校验；
- `*` 通配符代表超级管理员；
- 后端拒绝时返回 403（提示信息不泄露细节）。

侧边栏菜单由后端下发的菜单树动态渲染（过滤 `type === 'button'`），并按权限过滤。

### 6. 主题与布局

[src/store/useThemeStore.js](src/store/useThemeStore.js) 内置 **8 套主题配色**：`blue-black`、`pure-white`、`black-gold`、`ocean-blue`、`jade-dark`、`purple-dark`、`sunset-orange`、`graphite`，以 CSS 变量形式应用到 `:root`。

可配置项还包括：布局模式（纵向/横向）、标签页样式、侧边栏宽度、圆角、内容宽度、字号、灰色模式、色弱模式、固定头部、页面动画等，均持久化到 `localStorage`。可视化配置入口为右上角主题配置抽屉（[src/components/ThemeConfig/ThemeConfig.jsx](src/components/ThemeConfig/ThemeConfig.jsx)）。

### 7. 多标签页工作台

[src/layout/MainLayout.jsx](src/layout/MainLayout.jsx) 提供多标签页导航（状态持久化于 [src/store/useAppStore.js](src/store/useAppStore.js)），支持刷新当前页、关闭当前/其他/全部标签；同时每 60 秒同步一次权限、窗口聚焦时同步，并在进出系统时启停 Token 自动刷新。

### 8. 国际化

[src/i18n/index.js](src/i18n/index.js) 提供 `t('key', params)`（支持 `{name}` 插值）、`getLocale` / `setLocale`，当前内置 `zh-CN` 语言包（框架已就绪，后续可扩展多语言）。

---

## 九、功能模块与路由

### 公共页面（无需权限）

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/login` | 登录 | 游客页 |
| `/register` | 注册 | 游客页 |
| `/forgot-password` | 忘记密码 | 游客页 |
| `/403` | 无权限 | 独立页 |
| `/404` | 页面不存在 | 独立页 |
| `/500` | 服务异常 | 独立页 |
| `/token-expired` | 登录过期 | 独立页 |

### 业务模块（需登录 + 对应权限）

| 路由 | 模块 | 权限标识 |
| --- | --- | --- |
| `/dashboard` | 首页 / 数据看板 | `dashboard` |
| `/vehicles` | 车辆列表 | `vehicle` |
| `/vehicles/maintenance` | 车辆保养记录 | `vehicle:maintenance` |
| `/vehicles/documents` | 车辆证件 | `vehicle:document` |
| `/vehicles/gps` | GPS 轨迹 | `vehicle:gps` |
| `/vehicles/violations` | 违章记录 | `vehicle:violation` |
| `/vehicles/images` | 车辆图库 | `vehicle:image` |
| `/orders` | 订单列表 | `order` |
| `/orders/:id` | 订单详情 | `order` |
| `/customers` | 客户列表 | `customer` |
| `/customers/verify` | 客户实名审核 | `customer` |
| `/finance` | 财务总览（成本 / 对账 / 发票 / 利润分析） | `finance` |
| `/marketing` | 营销管理（优惠券等） | `marketing` |
| `/after-sales` | 售后服务 | `after_sales` |
| `/feedback` | 用户反馈 | `feedback` |
| `/announcements` | 公告管理 | `settings` |

### 系统设置

| 路由 | 模块 | 权限标识 |
| --- | --- | --- |
| `/settings/system` | 系统设置 | `settings` |
| `/settings/profile` | 个人中心 | `settings` |
| `/settings/carousel` | 轮播图设置 | `settings` |
| `/settings/dictionary` | 字典管理 | `settings` |
| `/settings/users` | 用户管理 | `settings` |
| `/settings/roles` | 角色管理 | `settings` |
| `/settings/menus` | 菜单管理 | `settings` |
| `/settings/files` | 文件管理 | `system:file` |
| `/settings/logs` | 操作日志 | `settings` |
| `/settings/store` | 门店设置 | `settings` |

> 页面实际可访问性取决于后端下发的角色权限，上表权限标识为默认值。

### 接口模块（`src/api/modules/`）

`auth`、`profile`、`system`、`menu`、`dict`、`file`、`operation-log`、`vehicle`、`car-maintenance`、`car-document`、`car-image`、`car-violation`、`gps-track`、`order`、`customer`、`finance`、`coupon`、`after-sales`、`feedback`、`carousel`、`storeConfig`。

---

## 十、与后端集成约定

| 项目 | 约定 |
| --- | --- |
| 后端服务 | Spring Boot，默认端口 `8088` |
| 接口前缀 | `/api` |
| 认证方式 | JWT，请求头 `Authorization: Bearer {accessToken}` |
| 统一响应 | `{ code, msg, data }`，成功码 `0` / `200` |
| 分页参数 | `page`、`pageSize` |
| 文件上传 | 走 `sys_file` 模块，返回 `{ url, fileId, name }` |
| 静态资源 | 后端 `/uploads/**` 提供，生产环境由 `assetBaseUrl` 指定 |
| 接口文档 | Knife4j：`http://localhost:8088/doc.html` |

---

## 十一、生产部署

1. 执行 `npm run build`，产物位于 `dist/`；
2. 将 `dist/` 部署到 Nginx / 静态服务器；
3. 按需修改 `dist/index.html` 中的 `window.__APP_CONFIG__`（`apiBaseUrl`、`assetBaseUrl`、`customerAssetBaseUrl`）指向实际后端地址，**无需重新构建**；
4. 由于使用 `createBrowserRouter`（History 路由），Nginx 需配置前端路由回退：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://your-backend:8088;
}

location /uploads/ {
    proxy_pass http://your-backend:8088;
}
```

---

## 十二、代码规范

项目使用 **ESLint 9 Flat Config**（[eslint.config.js](eslint.config.js)），集成 `react` / `react-hooks` / `react-refresh` 插件，主要约定：

- 统一使用单引号、语句结尾加分号；
- 多行结构强制尾逗号；
- `no-console` 允许 `warn` / `error` / `info` / `debug`。

提交前建议执行：

```bash
npm run lint
```

---

## 十三、相关工程

| 工程 | 说明 |
| --- | --- |
| `my-first-react-app` | 本工程，后台管理系统前端 |
| `my-first-react-app-server` | 后端服务（Spring Boot），默认 `8088` |
| 客户端服务 | 面向 C 端用户，默认 `8089`（提供客户侧静态资源） |
