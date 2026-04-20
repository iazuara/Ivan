import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import GastosCosto from './components/GastosCosto.jsx'
import Margen from './components/Margen.jsx'
import Productos from './components/Productos.jsx'
import Resumen from './components/Resumen.jsx'
import {
  costoUnitarioMxnPorLinea,
  getResumen,
  valorMercanciaMxnLinea,
  valorMercanciaUsdLinea,
} from './utils/calculos.js'
import {
  COST_KEYS,
  GASTOS_LABELS,
  GASTOS_POR_PIEZAS_KEYS,
  GASTOS_POR_PESO_KEYS,
  GASTOS_POR_VALOR_MXN_KEYS,
  SAMPLE_DATA,
  emptyGastos,
} from './utils/constantes.js'
import {
  extractJsonObjectFromText,
  mergeCapturedState,
  readFileAsBase64,
} from './utils/pdfFacturas.js'
import {
  ANTHROPIC_PROXY_CHECK_URL,
  hintAnthropic404,
  readAnthropicErrorDetail,
  resolveAnthropicFetchUrl,
} from './utils/anthropicUrl.js'

const TABS = [
  { id: 'productos', label: 'Productos' },
  { id: 'gastos', label: 'Gastos al Costo' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'margen', label: 'Márgenes' },
]

const ANTHROPIC_MODEL = 'claude-sonnet-4-6'

/** Header beta requerido por Anthropic para enviar PDFs en el cuerpo del mensaje. */
const ANTHROPIC_BETA_PDFS = 'pdfs-2024-09-25'

/** Obligatorio si la petición sale del navegador hacia api.anthropic.com (CORS). El proxy de Vite reenvía este header. */
const ANTHROPIC_BROWSER_ACCESS = {
  'anthropic-dangerous-direct-browser-access': 'true',
}

const MAX_PDF_BYTES = 24 * 1024 * 1024

function newId() {
  return crypto.randomUUID()
}

function emptyProducto() {
  return {
    id: newId(),
    descripcion: '',
    cantidad: 0,
    precioUsd: 0,
    pesoKg: 0,
    margenPct: 35,
  }
}

function prorrateoTipo(key) {
  if (GASTOS_POR_PESO_KEYS.includes(key)) return 'peso (kg × pzas)'
  if (GASTOS_POR_PIEZAS_KEYS.includes(key)) return 'piezas'
  if (GASTOS_POR_VALOR_MXN_KEYS.includes(key)) return 'valor MXN'
  return '—'
}

export default function App() {
  const [tab, setTab] = useState('productos')
  const [tipoCambio, setTipoCambio] = useState(18.5)
  const [productos, setProductos] = useState([emptyProducto()])
  const [gastos, setGastos] = useState(emptyGastos)
  const [ivaImp, setIvaImp] = useState(16)
  const [ivaServ, setIvaServ] = useState(16)
  const [gastosAdicionales, setGastosAdicionales] = useState([])
  const [descuento, setDescuento] = useState(0)
  const [displayCurrency, setDisplayCurrency] = useState('ambas')

  const [apiModalOpen, setApiModalOpen] = useState(false)
  const [apiKeyDraft, setApiKeyDraft] = useState(
    () => typeof localStorage !== 'undefined'
      ? localStorage.getItem('anthropic_api_key') || ''
      : '',
  )
  const [iaLoading, setIaLoading] = useState(false)
  const [iaText, setIaText] = useState('')
  const [iaError, setIaError] = useState('')

  const [pdfProveedor, setPdfProveedor] = useState(null)
  const [pdfAgente, setPdfAgente] = useState(null)
  const inputPdfProveedorRef = useRef(null)
  const inputPdfAgenteRef = useRef(null)
  const [pdfCapturaLoading, setPdfCapturaLoading] = useState(false)
  const [pdfCapturaError, setPdfCapturaError] = useState('')
  const [pdfCapturaExito, setPdfCapturaExito] = useState('')
  /** null = comprobando; false = esta URL no es el dev server de Vite de este proyecto */
  const [viteProxyOk, setViteProxyOk] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:')
      return
    let cancel = false
    fetch(new URL(ANTHROPIC_PROXY_CHECK_URL, window.location.origin).href, {
      cache: 'no-store',
    })
      .then((r) => {
        if (!cancel) setViteProxyOk(r.ok)
      })
      .catch(() => {
        if (!cancel) setViteProxyOk(false)
      })
    return () => {
      cancel = true
    }
  }, [])

  const resumen = useMemo(
    () =>
      getResumen(
        productos,
        gastos,
        tipoCambio,
        ivaImp,
        ivaServ,
        gastosAdicionales,
        descuento,
      ),
    [
      productos,
      gastos,
      tipoCambio,
      ivaImp,
      ivaServ,
      gastosAdicionales,
      descuento,
    ],
  )

  const changeProducto = useCallback((id, patch) => {
    setProductos((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
  }, [])

  const addProducto = useCallback(() => {
    setProductos((rows) => [...rows, emptyProducto()])
  }, [])

  const deleteProducto = useCallback((id) => {
    setProductos((rows) => {
      const next = rows.filter((r) => r.id !== id)
      return next.length ? next : [emptyProducto()]
    })
  }, [])

  const loadSample = useCallback(() => {
    setTipoCambio(SAMPLE_DATA.tipoCambio)
    setProductos(
      SAMPLE_DATA.productos.map((p) => ({ ...p, id: newId() })),
    )
    setGastos({ ...SAMPLE_DATA.gastos })
    setIvaImp(SAMPLE_DATA.iva_imp)
    setIvaServ(SAMPLE_DATA.iva_serv)
    setGastosAdicionales(
      SAMPLE_DATA.gastosAdicionales.map((g) => ({ ...g, id: newId() })),
    )
    setDescuento(SAMPLE_DATA.descuento)
  }, [])

  const clearAll = useCallback(() => {
    setTipoCambio(18.5)
    setProductos([emptyProducto()])
    setGastos(emptyGastos())
    setIvaImp(16)
    setIvaServ(16)
    setGastosAdicionales([])
    setDescuento(0)
    setIaText('')
    setIaError('')
    setPdfProveedor(null)
    setPdfAgente(null)
    setPdfCapturaError('')
    setPdfCapturaExito('')
    if (inputPdfProveedorRef.current) inputPdfProveedorRef.current.value = ''
    if (inputPdfAgenteRef.current) inputPdfAgenteRef.current.value = ''
  }, [])

  const addAdicional = useCallback(() => {
    setGastosAdicionales((list) => [
      ...list,
      { id: newId(), concepto: '', monto: 0 },
    ])
  }, [])

  const changeAdicional = useCallback((id, patch) => {
    setGastosAdicionales((list) =>
      list.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    )
  }, [])

  const deleteAdicional = useCallback((id) => {
    setGastosAdicionales((list) => list.filter((g) => g.id !== id))
  }, [])

  const saveApiKey = useCallback(() => {
    const v = apiKeyDraft.trim()
    localStorage.setItem('anthropic_api_key', v)
    setApiModalOpen(false)
  }, [apiKeyDraft])

  const exportExcel = useCallback(() => {
    const tc = Number(tipoCambio) || 0
    const wb = XLSX.utils.book_new()

    const prodSheet = XLSX.utils.json_to_sheet(
      productos.map((p) => ({
        Descripción: p.descripcion,
        Cantidad: p.cantidad,
        'Precio USD': p.precioUsd,
        'Peso kg / pza': p.pesoKg,
        'Valor línea USD': valorMercanciaUsdLinea(p),
        'Valor línea MXN': valorMercanciaMxnLinea(p, tc),
        'Margen %': p.margenPct,
      })),
    )
    XLSX.utils.book_append_sheet(wb, prodSheet, 'Productos')

    const gastosRows = [
      ...COST_KEYS.map((k) => ({
        Concepto: GASTOS_LABELS[k],
        'Monto MXN': gastos[k],
        Prorrateo: prorrateoTipo(k),
      })),
      ...gastosAdicionales.map((g) => ({
        Concepto: g.concepto || '(sin concepto)',
        'Monto MXN': g.monto,
        Prorrateo: 'adicional (valor MXN)',
      })),
      {
        Concepto: 'Descuento (ajuste)',
        'Monto MXN': -Number(descuento) || 0,
        Prorrateo: 'valor MXN',
      },
    ]
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(gastosRows),
      'Gastos',
    )

    const resRows = [
      ['Concepto', 'Valor'],
      ['Tipo de cambio USD/MXN', tc],
      ['Valor mercancía USD', resumen.valorMercanciaUsd],
      ['Valor mercancía MXN', resumen.valorMercanciaMxn],
      ['Total gastos al costo MXN', resumen.totalGastosAlCosto],
      ['IVA importación %', ivaImp],
      ['Monto IVA importación MXN', resumen.montoIvaImp],
      ['IVA servicios %', ivaServ],
      ['Monto IVA servicios MXN', resumen.montoIvaServ],
      ['Total IVAs MXN', resumen.totalIvas],
      ['Total con IVA MXN', resumen.totalConIva],
      ['Costo total importación MXN', resumen.costoTotalImportacion],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resRows), 'Resumen')

    const cu = costoUnitarioMxnPorLinea(
      productos,
      gastos,
      tc,
      ivaImp,
      ivaServ,
      gastosAdicionales,
      descuento,
    )
    const margenRows = productos.map((p, i) => {
      const cuMxn = cu[i] ?? 0
      const cuUsd = tc > 0 ? cuMxn / tc : 0
      const mPct = Number(p.margenPct) || 0
      const pv = cuMxn * (1 + mPct / 100)
      const pvUsd = tc > 0 ? pv / tc : 0
      return {
        Descripción: p.descripcion,
        Cantidad: p.cantidad,
        'Costo unit MXN': cuMxn,
        'Costo unit USD': cuUsd,
        'Margen %': mPct,
        'Margen / pza MXN': pv - cuMxn,
        'Precio venta / pza MXN': pv,
        'Precio venta / pza USD': pvUsd,
      }
    })
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(margenRows),
      'Márgenes',
    )

    const stamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `costeo-importacion-${stamp}.xlsx`)
  }, [
    productos,
    gastos,
    tipoCambio,
    gastosAdicionales,
    descuento,
    resumen,
    ivaImp,
    ivaServ,
  ])

  const snapshotForIa = useMemo(
    () => ({
      tipoCambio,
      productos,
      gastos,
      iva_imp: ivaImp,
      iva_serv: ivaServ,
      gastosAdicionales,
      descuento,
      resumen,
    }),
    [
      tipoCambio,
      productos,
      gastos,
      ivaImp,
      ivaServ,
      gastosAdicionales,
      descuento,
      resumen,
    ],
  )

  const analyzeWithIa = useCallback(async () => {
    const key =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('anthropic_api_key')?.trim()
        : ''
    if (!key) {
      setApiKeyDraft(
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('anthropic_api_key') || ''
          : '',
      )
      setApiModalOpen(true)
      return
    }
    setIaLoading(true)
    setIaError('')
    setIaText('')
    try {
      const prompt = `Eres un analista fiscal y de comercio exterior en México. 
Revisa el siguiente costeo de importación (JSON). 
Explica de forma clara y accionable: composición del costo, prorrateos, sensibilidad al tipo de cambio, 
posibles riesgos o omisiones, y sugerencias breves. Responde en español.
Datos:
${JSON.stringify(snapshotForIa, null, 2)}`

      const res = await fetch(resolveAnthropicFetchUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          ...ANTHROPIC_BROWSER_ACCESS,
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        if (res.status === 404) throw new Error(hintAnthropic404())
        const detail = await readAnthropicErrorDetail(res)
        throw new Error(detail || `Error HTTP ${res.status}`)
      }
      const data = await res.json().catch(() => ({}))
      const text =
        data?.content?.map((b) => (b.text ? b.text : '')).join('\n') || ''
      setIaText(text || 'Sin contenido en la respuesta.')
    } catch (e) {
      setIaError(e?.message || 'No se pudo completar el análisis.')
    } finally {
      setIaLoading(false)
    }
  }, [snapshotForIa])

  const capturarDesdeFacturasPdf = useCallback(async () => {
    const key =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('anthropic_api_key')?.trim()
        : ''
    if (!key) {
      setApiKeyDraft(
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('anthropic_api_key') || ''
          : '',
      )
      setApiModalOpen(true)
      return
    }
    if (!pdfProveedor && !pdfAgente) {
      setPdfCapturaError('Adjunta al menos un PDF (proveedor o agente aduanal).')
      setPdfCapturaExito('')
      return
    }

    for (const f of [pdfProveedor, pdfAgente].filter(Boolean)) {
      if (f.size > MAX_PDF_BYTES) {
        setPdfCapturaError(
          `El archivo "${f.name}" supera el límite de ${MAX_PDF_BYTES / (1024 * 1024)} MB.`,
        )
        setPdfCapturaExito('')
        return
      }
    }

    setPdfCapturaLoading(true)
    setPdfCapturaError('')
    setPdfCapturaExito('')

    const instrucciones = `Eres un asistente de comercio exterior en México. Analiza los PDF adjuntos:
- Si hay factura comercial / packing list del PROVEEDOR: extrae cada línea de mercancía.
- Si hay factura o desglose del AGENTE ADUANAL: extrae montos en MXN de honorarios, fletes, aranceles (IGI, DTA), seguros, almacenaje, etc.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown ni texto fuera del JSON), con esta forma exacta en claves:
{
  "tipoCambio": número o null (tipo de cambio USD→MXN si aparece explícito),
  "productos": [
    {
      "descripcion": "texto",
      "cantidad": número entero o decimal,
      "precioUsd": número (precio UNITARIO en USD por pieza, no total de línea),
      "pesoKg": número (kg por pieza; 0 si no consta),
      "margenPct": número opcional (si no hay dato, omite la clave)
    }
  ],
  "gastos": {
    "flete": número en MXN,
    "seguro": número,
    "igi": número,
    "dta": número,
    "prv": número,
    "incrementables": número,
    "honorarios": número,
    "almacen": número,
    "documentacion": número,
    "flete_local": número,
    "cove": número
  }
}

Reglas:
- Incluye en "productos" una entrada por cada ítem de mercancía relevante.
- "gastos": solo incluye claves para las que encuentres monto en MXN en los PDFs; puedes omitir "gastos" si no hay datos.
- Claves de gastos permitidas (solo estas): ${COST_KEYS.join(', ')}.
- Si un dato numérico no está claro, usa 0 o null para tipoCambio.`

    try {
      const content = [{ type: 'text', text: instrucciones }]

      if (pdfProveedor) {
        const b64 = await readFileAsBase64(pdfProveedor)
        content.push({
          type: 'text',
          text: '--- PDF: FACTURA / DOCUMENTO DEL PROVEEDOR ---',
        })
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: b64,
          },
        })
      }

      if (pdfAgente) {
        const b64 = await readFileAsBase64(pdfAgente)
        content.push({
          type: 'text',
          text: '--- PDF: FACTURA O DESGLOSE DEL AGENTE ADUANAL ---',
        })
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: b64,
          },
        })
      }

      const res = await fetch(resolveAnthropicFetchUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': ANTHROPIC_BETA_PDFS,
          ...ANTHROPIC_BROWSER_ACCESS,
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 8192,
          messages: [{ role: 'user', content }],
        }),
      })
      if (!res.ok) {
        if (res.status === 404) throw new Error(hintAnthropic404())
        const detail = await readAnthropicErrorDetail(res)
        throw new Error(detail || `Error HTTP ${res.status}`)
      }
      const data = await res.json().catch(() => ({}))
      const text =
        data?.content?.map((b) => (b.text ? b.text : '')).join('\n') || ''
      const raw = extractJsonObjectFromText(text)
      const merged = mergeCapturedState(raw, { newId })

      if (merged.tipoCambio != null) {
        setTipoCambio(merged.tipoCambio)
      }
      if (merged.productos?.length) {
        setProductos(merged.productos)
      }
      if (merged.gastos) {
        setGastos((prev) => ({ ...prev, ...merged.gastos }))
      }

      const nProd = merged.productos?.length ?? 0
      const nGas = merged.gastos ? Object.keys(merged.gastos).length : 0
      if (!nProd && !merged.tipoCambio && !nGas) {
        throw new Error(
          'La IA no devolvió productos ni gastos reconocibles. Revisa los PDF o inténtalo de nuevo.',
        )
      }

      setPdfCapturaExito(
        `Captura aplicada: ${nProd} producto(s)` +
          (merged.tipoCambio != null ? `, tipo de cambio ${merged.tipoCambio}` : '') +
          (nGas ? `, ${nGas} concepto(s) de gasto actualizado(s)` : '') +
          '.',
      )
      setTab('productos')
    } catch (e) {
      setPdfCapturaError(
        e?.message || 'No se pudo extraer la información de los PDF.',
      )
    } finally {
      setPdfCapturaLoading(false)
    }
  }, [pdfProveedor, pdfAgente])

  const cycleCurrency = useCallback(() => {
    setDisplayCurrency((m) =>
      m === 'MXN' ? 'USD' : m === 'USD' ? 'ambas' : 'MXN',
    )
  }, [])

  return (
    <div className="min-h-screen bg-[#f8f8f7] text-gray-900">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              Costeo de importación
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Productos, gastos al costo, prorrateo automático y márgenes.
            </p>
          </div>
          <label className="flex flex-col gap-1 sm:items-end">
            <span className="text-xs font-medium uppercase text-gray-500">
              Tipo de cambio USD → MXN
            </span>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={tipoCambio === 0 ? '' : tipoCambio}
              onChange={(e) => {
                const raw = e.target.value
                setTipoCambio(raw === '' ? 0 : Number(raw))
              }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:w-44"
            />
          </label>
        </div>
      </header>

      {viteProxyOk === false && (
        <div className="border-b border-amber-400 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
          <strong>Esta página no la está sirviendo el Vite de este proyecto</strong> (no se
          alcanzó {ANTHROPIC_PROXY_CHECK_URL}). Las llamadas a IA darán 404. Cierra esta
          pestaña, en la carpeta <code className="rounded bg-white px-1">costeo-importacion</code>{' '}
          ejecuta <code className="rounded bg-white px-1">npm run dev</code> y abre la URL
          que muestre la terminal (p. ej. http://localhost:5173/).
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <section className="mb-6 rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">
            Facturas PDF (proveedor y agente aduanal)
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Sube la factura comercial del proveedor y/o la del agente aduanal. La IA
            leerá los PDF y rellenará productos (y gastos en MXN si constan en la
            documentación del agente). Requiere API Key y ejecutar la app con{' '}
            <code className="rounded bg-gray-100 px-1">npm run dev</code> o{' '}
            <code className="rounded bg-gray-100 px-1">npm run preview</code>{' '}
            desde esta carpeta del proyecto. Tras actualizar dependencias o
            vite.config.js, reinicia el servidor (Ctrl+C y otra vez «npm run dev»).
            Abre la URL de la terminal; Live Server u hosting estático sin Node dan
            404.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-gray-700">
              PDF proveedor
              <input
                ref={inputPdfProveedorRef}
                type="file"
                accept="application/pdf,.pdf"
                className="text-xs file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-blue-700"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setPdfProveedor(f || null)
                  setPdfCapturaError('')
                  setPdfCapturaExito('')
                }}
              />
              {pdfProveedor && (
                <span className="font-normal text-gray-500">
                  {pdfProveedor.name} (
                  {(pdfProveedor.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </label>
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-gray-700">
              PDF agente aduanal
              <input
                ref={inputPdfAgenteRef}
                type="file"
                accept="application/pdf,.pdf"
                className="text-xs file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-blue-700"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setPdfAgente(f || null)
                  setPdfCapturaError('')
                  setPdfCapturaExito('')
                }}
              />
              {pdfAgente && (
                <span className="font-normal text-gray-500">
                  {pdfAgente.name} ({(pdfAgente.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </label>
            <button
              type="button"
              onClick={capturarDesdeFacturasPdf}
              disabled={pdfCapturaLoading || (!pdfProveedor && !pdfAgente)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfCapturaLoading
                ? 'Extrayendo con IA…'
                : 'Capturar desde PDFs'}
            </button>
          </div>
          {pdfCapturaError && (
            <p className="mt-2 text-sm text-red-600">{pdfCapturaError}</p>
          )}
          {pdfCapturaExito && (
            <p className="mt-2 text-sm text-green-700">{pdfCapturaExito}</p>
          )}
        </section>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={cycleCurrency}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Divisas:{' '}
            {displayCurrency === 'ambas'
              ? 'MXN + USD'
              : displayCurrency}
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={loadSample}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Cargar ejemplo
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Limpiar todo
          </button>
          <button
            type="button"
            onClick={() => {
              setApiKeyDraft(
                localStorage.getItem('anthropic_api_key') || '',
              )
              setApiModalOpen(true)
            }}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            API Key Anthropic
          </button>
          <button
            type="button"
            onClick={analyzeWithIa}
            disabled={iaLoading}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {iaLoading ? 'Analizando…' : 'Analizar con IA'}
          </button>
        </div>

        {(iaText || iaError) && (
          <section className="mb-6 rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800">
              Análisis (Claude)
            </h2>
            {iaError ? (
              <p className="mt-2 text-sm text-red-600">{iaError}</p>
            ) : (
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap font-sans text-sm text-gray-800">
                {iaText}
              </pre>
            )}
          </section>
        )}

        {tab === 'productos' && (
          <Productos
            productos={productos}
            onChangeProducto={changeProducto}
            onAddRow={addProducto}
            onDeleteRow={deleteProducto}
            tipoCambio={tipoCambio}
            displayCurrency={displayCurrency}
          />
        )}
        {tab === 'gastos' && (
          <GastosCosto
            productos={productos}
            tipoCambio={tipoCambio}
            gastos={gastos}
            onGastoChange={(key, val) =>
              setGastos((g) => ({ ...g, [key]: val }))
            }
            ivaImp={ivaImp}
            ivaServ={ivaServ}
            onIvaImpChange={setIvaImp}
            onIvaServChange={setIvaServ}
            gastosAdicionales={gastosAdicionales}
            onAddAdicional={addAdicional}
            onChangeAdicional={changeAdicional}
            onDeleteAdicional={deleteAdicional}
            descuento={descuento}
            onDescuentoChange={setDescuento}
          />
        )}
        {tab === 'resumen' && (
          <Resumen
            productos={productos}
            gastos={gastos}
            tipoCambio={tipoCambio}
            ivaImp={ivaImp}
            ivaServ={ivaServ}
            gastosAdicionales={gastosAdicionales}
            descuento={descuento}
          />
        )}
        {tab === 'margen' && (
          <Margen
            productos={productos}
            onChangeProducto={changeProducto}
            gastos={gastos}
            tipoCambio={tipoCambio}
            ivaImp={ivaImp}
            ivaServ={ivaServ}
            gastosAdicionales={gastosAdicionales}
            descuento={descuento}
            displayCurrency={displayCurrency}
          />
        )}
      </div>

      {apiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-modal-title"
          >
            <h2
              id="api-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              API Key de Anthropic
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Se guarda solo en el navegador (localStorage). La misma clave se usa
              para el análisis del costeo y para leer facturas PDF (Anthropic con
              soporte de documentos). En desarrollo, las peticiones pasan por el
              proxy de Vite hacia la API de Anthropic.
            </p>
            <input
              type="password"
              autoComplete="off"
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              className="mt-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              placeholder="sk-ant-api03-..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApiModalOpen(false)}
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveApiKey}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
