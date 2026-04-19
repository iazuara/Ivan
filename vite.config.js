import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function buildAnthropicProxy(env) {
  const base = env.VITE_BASE || '/'
  const trimmed = base.replace(/\/$/, '')
  const prefix = trimmed ? `${trimmed}/anthropic-api` : '/anthropic-api'

  return {
    [prefix]: {
      target: 'https://api.anthropic.com',
      changeOrigin: true,
      secure: true,
      rewrite: (path) => {
        if (!path.startsWith(prefix)) return path
        const rest = path.slice(prefix.length)
        return rest.startsWith('/') ? rest : `/${rest}`
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE || '/'

  return {
    base,
    plugins: [react()],
    server: {
      proxy: buildAnthropicProxy(env),
    },
    preview: {
      proxy: buildAnthropicProxy(env),
    },
  }
})
