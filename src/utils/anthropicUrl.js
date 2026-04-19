/**
 * URL del endpoint Messages de Anthropic vía proxy de Vite.
 * - Si defines `VITE_ANTHROPIC_MESSAGES_URL` (absoluta o relativa), se usa tal cual.
 * - Si no, se antepone `import.meta.env.BASE_URL` (subcarpeta en GitHub Pages, etc.).
 */
export function getAnthropicMessagesUrl() {
  const custom = import.meta.env.VITE_ANTHROPIC_MESSAGES_URL
  if (custom) return String(custom).trim()

  const base = import.meta.env.BASE_URL || '/'
  const trimmed = base.replace(/\/$/, '')
  const segment = `${trimmed}/anthropic-api/v1/messages`.replace(/\/+/g, '/')
  return segment.startsWith('/') ? segment : `/${segment}`
}

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
    'HTTP 404: la ruta del proxy no existe en este servidor. ' +
    'Ejecuta la app con «npm run dev» o «npm run preview» dentro de la carpeta costeo-importacion (debe estar activo Vite). ' +
    'No uses Live Server ni abras dist/index.html sin Vite: no hay proxy a Anthropic. ' +
    'Si publicas en un subdirectorio, define VITE_BASE en .env (p. ej. /repo/) y reconstruye, o usa VITE_ANTHROPIC_MESSAGES_URL hacia tu propio proxy.'
  )
}
