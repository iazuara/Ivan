import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createProxyMiddleware } from 'http-proxy-middleware'

/**
 * Proxy explícito (Connect) hacia Anthropic.
 * En algunos entornos el `server.proxy` integrado de Vite no intercepta bien las peticiones;
 * este middleware se registra con enforce: 'pre' para ir antes del fallback SPA.
 */
function anthropicProxyPlugin() {
  const factory = () =>
    createProxyMiddleware({
      pathFilter: '/anthropic-api',
      target: 'https://api.anthropic.com',
      changeOrigin: true,
      secure: true,
      pathRewrite: { '^/anthropic-api': '' },
    })

  return {
    name: 'anthropic-proxy',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(factory())
    },
    configurePreviewServer(server) {
      server.middlewares.use(factory())
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [anthropicProxyPlugin(), react()],
})
