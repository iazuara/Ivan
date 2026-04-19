import { useCallback, useMemo, useState } from 'react'
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

const TABS = [
  { id: 'productos', label: 'Productos' },
  { id: 'gastos', label: 'Gastos al Costo' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'margen', label: 'Márgenes' },
]

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'

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

      const res = await fetch('/anthropic-api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          data?.error?.message ||
          data?.message ||
          `Error HTTP ${res.status}`
        throw new Error(msg)
      }
      const text =
        data?.content?.map((b) => (b.text ? b.text : '')).join('\n') || ''
      setIaText(text || 'Sin contenido en la respuesta.')
    } catch (e) {
      setIaError(e?.message || 'No se pudo completar el análisis.')
    } finally {
      setIaLoading(false)
    }
  }, [snapshotForIa])

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
              Se guarda solo en el navegador (localStorage). No se envía a ningún
              servidor distinto de la API de Anthropic a través del proxy de
              desarrollo de Vite.
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
