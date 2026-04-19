import { COST_KEYS } from './constantes.js'

/** Lee un archivo y devuelve solo la parte base64 (sin prefijo data:...). */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('No se pudo leer el archivo'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error || new Error('Error al leer el PDF'))
    reader.readAsDataURL(file)
  })
}

/**
 * Intenta obtener un único objeto JSON de la respuesta del asistente
 * (texto plano, bloque ```json``` o JSON incrustado).
 */
export function extractJsonObjectFromText(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) throw new Error('Respuesta vacía del modelo')

  const fence = /```(?:json)?\s*([\s\S]*?)```/i
  const m = trimmed.match(fence)
  const candidate = m ? m[1].trim() : trimmed

  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No se encontró un objeto JSON en la respuesta')
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    throw new Error('El JSON devuelto no es válido')
  }
}

/**
 * Normaliza el JSON devuelto por la IA al formato interno de la app.
 */
export function mergeCapturedState(raw, { newId }) {
  const out = {
    tipoCambio: null,
    productos: null,
    gastos: null,
  }

  if (raw == null || typeof raw !== 'object') {
    return out
  }

  const tc = raw.tipoCambio ?? raw.tipo_cambio
  if (tc != null && tc !== '') {
    const n = Number(tc)
    if (Number.isFinite(n) && n > 0) out.tipoCambio = n
  }

  const arr = raw.productos
  if (Array.isArray(arr) && arr.length > 0) {
    out.productos = arr.map((p) => ({
      id: newId(),
      descripcion: String(
        p.descripcion ?? p.descripcion_producto ?? p.nombre ?? '',
      ).slice(0, 500),
      cantidad: Math.max(0, Number(p.cantidad ?? p.cant ?? p.qty) || 0),
      precioUsd: Math.max(
        0,
        Number(
          p.precioUsd ?? p.precio_usd ?? p.precio_unitario_usd ?? p.unit_price_usd,
        ) || 0,
      ),
      pesoKg: Math.max(
        0,
        Number(
          p.pesoKg ?? p.peso_kg ?? p.peso_unitario_kg ?? p.peso_por_pieza_kg,
        ) || 0,
      ),
      margenPct: Math.min(
        1000,
        Math.max(0, Number(p.margenPct ?? p.margen_pct ?? 35) || 35),
      ),
    }))
  }

  const gRaw = raw.gastos
  if (gRaw && typeof gRaw === 'object') {
    const g = {}
    for (const k of COST_KEYS) {
      if (gRaw[k] != null && gRaw[k] !== '') {
        const n = Number(gRaw[k])
        if (Number.isFinite(n) && n >= 0) g[k] = n
      }
    }
    if (Object.keys(g).length > 0) out.gastos = g
  }

  return out
}
