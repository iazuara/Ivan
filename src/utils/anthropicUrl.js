/**
 * URL del endpoint Messages de Anthropic vía proxy local (Vite dev/preview).
 * - Si defines `VITE_ANTHROPIC_MESSAGES_URL`, se usa (URL absoluta o ruta propia).
 * - Por defecto: `/anthropic-api/v1/messages` (plugin en vite.config.js).
 */
export function getAnthropicMessagesUrl() {
  const custom = import.meta.env.VITE_ANTHROPIC_MESSAGES_URL
  if (custom) return String(custom).trim()
  return '/anthropic-api/v1/messages'
}

/** URL absoluta al mismo origen (evita resoluciones raras con previews embebidos). */
export function resolveAnthropicFetchUrl() {
  const path = getAnthropicMessagesUrl()
  if (/^https?:\/\//i.test(path)) return path
  if (typeof window === 'undefined') return path
  return new URL(path, window.location.origin).href
}

export const ANTHROPIC_PROXY_CHECK_URL = '/__anthropic_proxy_check'

export async function readAnthropicErrorDetail(res) {
  const raw = await res.text()
  try {
    const j = JSON.parse(raw)
    return j?.error?.message || j?.message || raw.slice(0, 400)
  } catch {
    return raw.slice(0, 400) || ''
  }
}

export function hintAnthropic404() {
  return (
    'HTTP 404: no se encontró el proxy hacia Anthropic en este servidor. ' +
    '1) Terminal → carpeta costeo-importacion → «npm run dev» (o «npm run build» y luego «npm run preview»). ' +
    '2) En el navegador abre solo la URL que imprime Vite (p. ej. http://localhost:5173/), no Live Server ni abrir dist/index.html a pelo. ' +
    '3) Prueba en la misma pestaña: ' +
    ANTHROPIC_PROXY_CHECK_URL +
    ' — debe verse JSON {"ok":true,...}; si da 404, esta página no la está sirviendo Vite. ' +
    '4) Reinicia Vite tras cambiar vite.config.js (Ctrl+C y otra vez npm run dev). ' +
    '5) Hosting estático sin Node: define VITE_ANTHROPIC_MESSAGES_URL hacia tu backend proxy.'
  )
}
