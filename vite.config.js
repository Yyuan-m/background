import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },

    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },

    server: {
      host: true,
      port: 3001,
      open: true,
      // 开发代理：将 /api 和 /uploads 请求转发到后端服务
      // 切换后端时，修改下方 target 的 IP 和端口即可
      proxy: {
        '/api': {
          target: 'http://192.168.5.8:8088',
          changeOrigin: true,
        },
        // 后端静态资源（上传的图片/文件）由 /uploads/** 提供
        '/uploads': {
          target: 'http://192.168.5.8:8088',
          changeOrigin: true,
        },
      },
    },

    build: {
      // 输出目录
      outDir: 'dist',
      // 资源目录
      assetsDir: 'assets',
      // 小于此值的资源内联为 base64
      assetsInlineLimit: 4096,
      // chunk 大小警告阈值（KB）
      chunkSizeWarningLimit: 800,
      // 启用 CSS 代码分割
      cssCodeSplit: true,
      // 生成 sourcemap（生产环境默认关闭）
      sourcemap: mode === 'development',
      // 压缩选项
      minify: 'esbuild',
      // 目标浏览器：升级到 ES2018，减少 polyfill 体积（现代浏览器均已支持）
      target: 'es2018',

      rollupOptions: {
        output: {
          // 手动代码分割策略
          manualChunks(id) {
            // React 核心
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            // Ant Design 全家桶
            if (id.includes('node_modules/antd/') || id.includes('node_modules/@ant-design/') || id.includes('node_modules/rc-')) {
              return 'vendor-antd';
            }
            // 图表库
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory')) {
              return 'vendor-charts';
            }
            // 工具库
            if (id.includes('node_modules/axios') || id.includes('node_modules/dayjs') || id.includes('node_modules/zustand')) {
              return 'vendor-utils';
            }
            // Mock 数据单独拆分（体积较大但只在部分页面使用）
            if (id.includes('/src/mock/')) {
              return 'mock-data';
            }
          },

          // 统一 chunk 文件命名（利于缓存策略）
          chunkFileNames: 'js/[name]-[hash:10].js',
          entryFileNames: 'js/[name]-[hash:10].js',
          assetFileNames: (assetInfo) => {
            // CSS 文件
            if (assetInfo.name?.endsWith('.css')) {
              return 'css/[name]-[hash:10][extname]';
            }
            // 图片文件
            const imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
            if (imgExts.some((ext) => assetInfo.name?.endsWith(ext))) {
              return 'images/[name]-[hash:10][extname]';
            }
            // 字体文件
            const fontExts = ['.woff', '.woff2', '.eot', '.ttf', '.otf'];
            if (fontExts.some((ext) => assetInfo.name?.endsWith(ext))) {
              return 'fonts/[name]-[hash:10][extname]';
            }
            return 'assets/[name]-[hash:10][extname]';
          },
        },
      },
    },

    // 定义全局常量（通过 .env 注入）
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '0.2.0'),
    },
  };
});