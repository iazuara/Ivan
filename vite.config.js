import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createProxyMiddleware } from 'http-proxy-middleware'

const PROXY_TARGET = 'https://api.anthropic.com'
const PROXY_PREFIX = '/anthropic-api'

const viteNativeAnthropicProxy = {
  [PROXY_PREFIX]: {
    target: PROXY_TARGET,
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(new RegExp(`^${PROXY_PREFIX}`), ''),
  },
}

/** Comprueba que el HTML lo sirve este mismo Vite (no Live Server ni otro host). */
function anthropicDiagnosticsPlugin() {
  const ping = (req, res, next) => {
    const pathOnly = req.url?.split('?')[0]
    if (pathOnly === '/__anthropic_proxy_check') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ ok: true, vite: true, anthropicProxy: PROXY_PREFIX }))
      return
    }
    next()
  }

  return {
    name: 'anthropic-diagnostics',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(ping)
    },
    configurePreviewServer(server) {
      server.middlewares.use(ping)
    },
  }
}

function anthropicHpmPlugin() {
  const factory = () =>
    createProxyMiddleware({
      pathFilter: PROXY_PREFIX,
      target: PROXY_TARGET,
      changeOrigin: true,
      secure: true,
      pathRewrite: { [`^${PROXY_PREFIX}`]: '' },
    })

  return {
    name: 'anthropic-hpm',
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
  plugins: [anthropicDiagnosticsPlugin(), anthropicHpmPlugin(), react()],
  server: {
    proxy: viteNativeAnthropicProxy,
  },
  preview: {
    proxy: viteNativeAnthropicProxy,
  },
})
