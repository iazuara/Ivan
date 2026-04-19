import {
  costoUnitarioMxnPorLinea,
  fmtMoneyMXN,
  fmtMoneyUsd,
  fmtQty,
  margenMxnPorPieza,
  precioVentaPorLinea,
} from '../utils/calculos.js'

function MoneyCell({ mode, mxn, usd }) {
  if (mode === 'MXN') {
    return <span className="tabular-nums">{fmtMoneyMXN(mxn)}</span>
  }
  if (mode === 'USD') {
    return <span className="tabular-nums">{fmtMoneyUsd(usd)}</span>
  }
  return (
    <div className="flex flex-col gap-0.5 text-xs sm:text-sm">
      <span className="tabular-nums">{fmtMoneyMXN(mxn)}</span>
      <span className="tabular-nums text-gray-500">{fmtMoneyUsd(usd)}</span>
    </div>
  )
}

export default function Margen({
  productos,
  onChangeProducto,
  gastos,
  tipoCambio,
  ivaImp,
  ivaServ,
  gastosAdicionales,
  descuento,
  displayCurrency,
}) {
  const tc = Number(tipoCambio) || 0
  const costoUnitMxn = costoUnitarioMxnPorLinea(
    productos,
    gastos,
    tc,
    ivaImp,
    ivaServ,
    gastosAdicionales,
    descuento,
  )

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-300 text-left text-sm">
        <thead className="bg-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-3 py-2">Producto</th>
            <th className="px-3 py-2">Cant.</th>
            <th className="px-3 py-2">Costo unitario</th>
            <th className="px-3 py-2">Margen %</th>
            <th className="px-3 py-2">Margen / pza</th>
            <th className="px-3 py-2">Precio venta / pza</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {productos.map((p, i) => {
            const cuMxn = costoUnitMxn[i] ?? 0
            const cuUsd = tc > 0 ? cuMxn / tc : 0
            const mPct = Number(p.margenPct) || 0
            const pVentaMxn = precioVentaPorLinea(cuMxn, mPct)
            const pVentaUsd = tc > 0 ? pVentaMxn / tc : 0
            const margenMxn = margenMxnPorPieza(pVentaMxn, cuMxn)
            const margenUsd = tc > 0 ? margenMxn / tc : 0
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="max-w-xs px-3 py-2 text-gray-800">
                  {p.descripcion || '—'}
                </td>
                <td className="px-3 py-2 tabular-nums">{fmtQty(p.cantidad)}</td>
                <td className="px-3 py-2">
                  <MoneyCell
                    mode={displayCurrency}
                    mxn={cuMxn}
                    usd={cuUsd}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={p.margenPct === 0 ? '' : p.margenPct}
                    onChange={(e) => {
                      const raw = e.target.value
                      onChangeProducto(p.id, {
                        margenPct: raw === '' ? 0 : Number(raw),
                      })
                    }}
                    className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </td>
                <td className="px-3 py-2">
                  <MoneyCell
                    mode={displayCurrency}
                    mxn={margenMxn}
                    usd={margenUsd}
                  />
                </td>
                <td className="px-3 py-2">
                  <MoneyCell
                    mode={displayCurrency}
                    mxn={pVentaMxn}
                    usd={pVentaUsd}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        Costo unitario incluye prorrateo de gastos al costo, gastos adicionales,
        descuento y IVAs. Use el conmutador de divisas para ver MXN, USD o ambos.
      </p>
    </div>
  )
}
