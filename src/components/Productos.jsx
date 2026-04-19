import {
  fmtMoneyMXN,
  fmtMoneyUsd,
  totalValorMercanciaMxn,
  totalValorMercanciaUsd,
  valorMercanciaMxnLinea,
  valorMercanciaUsdLinea,
} from '../utils/calculos.js'

function ValorCell({ mode, usd, mxn }) {
  if (mode === 'USD') {
    return <span className="tabular-nums">{fmtMoneyUsd(usd)}</span>
  }
  if (mode === 'MXN') {
    return <span className="tabular-nums">{fmtMoneyMXN(mxn)}</span>
  }
  return (
    <div className="flex flex-col gap-0.5 text-xs sm:text-sm">
      <span className="tabular-nums text-gray-700">{fmtMoneyUsd(usd)}</span>
      <span className="tabular-nums text-gray-500">{fmtMoneyMXN(mxn)}</span>
    </div>
  )
}

export default function Productos({
  productos,
  onChangeProducto,
  onAddRow,
  onDeleteRow,
  tipoCambio,
  displayCurrency,
}) {
  const tc = Number(tipoCambio) || 0
  const totalUsd = totalValorMercanciaUsd(productos)
  const totalMxn = totalValorMercanciaMxn(productos, tc)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-300 text-left text-sm">
          <thead className="bg-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Cantidad</th>
              <th className="px-3 py-2">Precio USD</th>
              <th className="px-3 py-2">Peso (kg / pza)</th>
              <th className="px-3 py-2">Valor línea</th>
              <th className="w-24 px-3 py-2 text-center">Eliminar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {productos.map((p) => {
              const vUsd = valorMercanciaUsdLinea(p)
              const vMxn = valorMercanciaMxnLinea(p, tc)
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={p.descripcion}
                      onChange={(e) =>
                        onChangeProducto(p.id, { descripcion: e.target.value })
                      }
                      className="w-full min-w-[10rem] rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      placeholder="Producto"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={p.cantidad === 0 ? '' : p.cantidad}
                      onChange={(e) => {
                        const raw = e.target.value
                        onChangeProducto(p.id, {
                          cantidad: raw === '' ? 0 : Number(raw),
                        })
                      }}
                      className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.precioUsd === 0 ? '' : p.precioUsd}
                      onChange={(e) => {
                        const raw = e.target.value
                        onChangeProducto(p.id, {
                          precioUsd: raw === '' ? 0 : Number(raw),
                        })
                      }}
                      className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={p.pesoKg === 0 ? '' : p.pesoKg}
                      onChange={(e) => {
                        const raw = e.target.value
                        onChangeProducto(p.id, {
                          pesoKg: raw === '' ? 0 : Number(raw),
                        })
                      }}
                      className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <ValorCell
                      mode={displayCurrency}
                      usd={vUsd}
                      mxn={vMxn}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRow(p.id)}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td colSpan={4} className="px-3 py-2 text-right text-gray-800">
                Total mercancía
              </td>
              <td className="px-3 py-2">
                <ValorCell
                  mode={displayCurrency}
                  usd={totalUsd}
                  mxn={totalMxn}
                />
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddRow}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Agregar producto
        </button>
        <p className="w-full text-xs text-gray-600 sm:w-auto sm:self-center">
          Peso por pieza: el prorrateo de flete usa cantidad × peso (kg).
        </p>
      </div>
    </div>
  )
}
