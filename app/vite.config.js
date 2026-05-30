import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Groq 浏览器直连易被 CORS 拦截；开发时用 /api/groq 转发（生产需自建同源代理）
      '/api/groq': {
        target: 'https://api.groq.com/openai/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/groq/, ''),
      },
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
      },
    },
  },
})
