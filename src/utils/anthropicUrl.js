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
    '1) En la carpeta costeo-importacion ejecuta «npm run dev» (o «npm run preview» tras «npm run build»). ' +
    '2) Abre exactamente la URL que muestra la terminal (p. ej. http://localhost:5173/), no Live Server ni otro preview. ' +
    '3) Tras cambiar vite.config.js o instalar dependencias, detén el servidor (Ctrl+C) y vuelve a iniciarlo. ' +
    '4) Si despliegas en hosting estático sin Node, define VITE_ANTHROPIC_MESSAGES_URL con la URL de tu backend proxy.'
  )
}
