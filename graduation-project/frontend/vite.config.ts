import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      // 开发期前端统一走 `/api`，由 Vite 转发到后端（C-APP-WIRING@1 基址约定）
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: false,
        configure: proxy => {
          proxy.on('proxyRes', proxyRes => {
            // SSE 必须直通不缓冲：关闭中间层缓存与压缩缓冲
            proxyRes.headers['cache-control'] = 'no-cache, no-transform'
            proxyRes.headers['x-accel-buffering'] = 'no'
          })
        }
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts'],
          // 后台 UI 库单独成块：大屏路由 chunk 不包含 element-plus（R-108）
          'element-plus': ['element-plus'],
          vendor: ['vue', 'vue-router', 'pinia']
        }
      }
    }
  }
})