import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages 子路径部署时设置 GITHUB_PAGES=true
const base = process.env.GITHUB_PAGES === 'true' ? '/ShanbeiWordTest/' : '/'

function stripPrefix(prefix) {
  return (path) => (path.startsWith(prefix) ? path.slice(prefix.length) || '/' : path)
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL

  return {
    base,
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Groq 浏览器直连易被 CORS 拦截；开发时用 /api/groq 转发（生产需自建同源代理）
        '/api/groq': {
          target: 'https://api.groq.com/openai/v1',
          changeOrigin: true,
          rewrite: stripPrefix('/api/groq'),
        },
        '/api/deepseek': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          rewrite: stripPrefix('/api/deepseek'),
        },
        ...(supabaseUrl
          ? {
              '/api/supabase': {
                target: supabaseUrl,
                changeOrigin: true,
                rewrite: stripPrefix('/api/supabase'),
              },
            }
          : {}),
      },
    },
  }
})
