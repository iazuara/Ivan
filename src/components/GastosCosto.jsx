import {
  fmtMoneyMXN,
  prorrateoPorPiezas,
  prorrateoPorPeso,
  prorrateoPorValorMxn,
  sumGastosCosto,
} from '../utils/calculos.js'
import {
  COST_KEYS,
  GASTOS_LABELS,
  GASTOS_POR_PESO_KEYS,
  GASTOS_POR_PIEZAS_KEYS,
  GASTOS_POR_VALOR_MXN_KEYS,
} from '../utils/constantes.js'

function Badge({ children }) {
  return (
    <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-700">
      {children}
    </span>
  )
}

function prorrateoLabel(key) {
  if (GASTOS_POR_PESO_KEYS.includes(key)) return <Badge>peso</Badge>
  if (GASTOS_POR_PIEZAS_KEYS.includes(key)) return <Badge>piezas</Badge>
  if (GASTOS_POR_VALOR_MXN_KEYS.includes(key)) return <Badge>valor MXN</Badge>
  return null
}

export default function GastosCosto({
  productos,
  tipoCambio,
  gastos,
  onGastoChange,
  ivaImp,
  ivaServ,
  onIvaImpChange,
  onIvaServChange,
  gastosAdicionales,
  onAddAdicional,
  onChangeAdicional,
  onDeleteAdicional,
  descuento,
  onDescuentoChange,
}) {
  const tc = Number(tipoCambio) || 0
  const subtotal = sumGastosCosto(gastos)

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-300 text-left text-sm">
          <thead className="bg-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-2">Concepto</th>
              <th className="px-3 py-2">Monto (MXN)</th>
              <th className="px-3 py-2">Prorrateo (referencia)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {COST_KEYS.map((key) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-800">
                  {GASTOS_LABELS[key]}
                  {prorrateoLabel(key)}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={gastos[key] === 0 ? '' : gastos[key]}
                    onChange={(e) => {
                      const raw = e.target.value
                      onGastoChange(key, raw === '' ? 0 : Number(raw))
                    }}
                    className="w-36 rounded border border-gray-300 px-2 py-1.5 text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">
                  <ProrrateoPreview
                    productos={productos}
                    tipoCambio={tc}
                    gastoKey={key}
                    monto={gastos[key]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td className="px-3 py-2">Subtotal gastos capturados</td>
              <td className="px-3 py-2 tabular-nums" colSpan={2}>
                {fmtMoneyMXN(subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
          <span className="text-sm font-medium text-gray-800">
            IVA importación (%)
          </span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={ivaImp === 0 ? '' : ivaImp}
            onChange={(e) => {
              const raw = e.target.value
              onIvaImpChange(raw === '' ? 0 : Number(raw))
            }}
            className="mt-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <p className="mt-1 text-xs text-gray-500">
            Base: valor mercancía MXN + IGI + DTA + seguro.
          </p>
        </label>
        <label className="block rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
          <span className="text-sm font-medium text-gray-800">
            IVA servicios (%)
          </span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={ivaServ === 0 ? '' : ivaServ}
            onChange={(e) => {
              const raw = e.target.value
              onIvaServChange(raw === '' ? 0 : Number(raw))
            }}
            className="mt-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <p className="mt-1 text-xs text-gray-500">
            Base: flete, honorarios, almacén, documentación, flete local, COVE,
            incrementables, PRV.
          </p>
        </label>
      </div>

      <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900">
            Gastos adicionales
          </h3>
          <button
            type="button"
            onClick={onAddAdicional}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Agregar concepto
          </button>
        </div>
        <div className="space-y-2">
          {gastosAdicionales.length === 0 && (
            <p className="text-sm text-gray-500">Sin gastos adicionales.</p>
          )}
          {gastosAdicionales.map((g) => (
            <div
              key={g.id}
              className="flex flex-wrap items-end gap-2 border-b border-gray-100 py-2 last:border-0"
            >
              <label className="min-w-[12rem] flex-1">
                <span className="text-xs text-gray-500">Concepto</span>
                <input
                  type="text"
                  value={g.concepto}
                  onChange={(e) =>
                    onChangeAdicional(g.id, { concepto: e.target.value })
                  }
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </label>
              <label>
                <span className="text-xs text-gray-500">Monto MXN</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={g.monto === 0 ? '' : g.monto}
                  onChange={(e) => {
                    const raw = e.target.value
                    onChangeAdicional(g.id, {
                      monto: raw === '' ? 0 : Number(raw),
                    })
                  }}
                  className="mt-0.5 w-32 rounded border border-gray-300 px-2 py-1.5 text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </label>
              <button
                type="button"
                onClick={() => onDeleteAdicional(g.id)}
                className="rounded bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Prorrateo de gastos adicionales: por valor de mercancía en MXN.
        </p>
      </div>

      <label className="block max-w-md rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
        <span className="text-sm font-semibold text-gray-800">
          Ajustes — descuento (MXN)
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={descuento === 0 ? '' : descuento}
          onChange={(e) => {
            const raw = e.target.value
            onDescuentoChange(raw === '' ? 0 : Number(raw))
          }}
          className="mt-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
        <p className="mt-1 text-xs text-gray-500">
          Se prorratea entre productos por valor MXN (resta del costo).
        </p>
      </label>
    </div>
  )
}

function ProrrateoPreview({ productos, tipoCambio, gastoKey, monto }) {
  if (!productos.length) return <span>Sin productos</span>
  let parts
  if (GASTOS_POR_PESO_KEYS.includes(gastoKey)) {
    parts = prorrateoPorPeso(productos, monto)
  } else if (GASTOS_POR_PIEZAS_KEYS.includes(gastoKey)) {
    parts = prorrateoPorPiezas(productos, monto)
  } else if (GASTOS_POR_VALOR_MXN_KEYS.includes(gastoKey)) {
    parts = prorrateoPorValorMxn(productos, tipoCambio, monto)
  } else {
    parts = []
  }
  const head = productos.slice(0, 3).map((p, i) => (
    <span key={p.id} className="block">
      {p.descripcion?.slice(0, 28) || 'Sin nombre'}: {fmtMoneyMXN(parts[i] ?? 0)}
    </span>
  ))
  return (
    <div className="max-h-24 overflow-y-auto">
      {head}
      {productos.length > 3 && (
        <span className="text-gray-400">+{productos.length - 3} más…</span>
      )}
    </div>
  )
}
