import * as XLSX from 'xlsx'
import {
  fmtMoneyMXN,
  fmtMoneyUsd,
  fmtQty,
  gastosProrrateadosPorLineaResultados,
  valorMercanciaMxnLinea,
  valorMercanciaUsdLinea,
} from '../utils/calculos.js'

function Th({ children, className = '' }) {
  return (
    <th
      className={`border-b border-gray-300 bg-gray-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 ${className}`}
    >
      {children}
    </th>
  )
}

function TdMoney({ children, className = '' }) {
  return (
    <td
      className={`border-b border-gray-200 px-3 py-2 text-right tabular-nums text-gray-900 ${className}`}
    >
      {children}
    </td>
  )
}

function TdText({ children, className = '' }) {
  return (
    <td
      className={`border-b border-gray-200 px-3 py-2 text-gray-800 ${className}`}
    >
      {children}
    </td>
  )
}

export default function Resultados({
  productos,
  gastos,
  tipoCambio,
  gastosAdicionales,
  descuento,
}) {
  const tc = Number(tipoCambio) || 0
  const gastosLines = gastosProrrateadosPorLineaResultados(
    productos,
    gastos,
    tc,
    gastosAdicionales,
    descuento,
  )

  const rows = productos.map((p, i) => {
    const q = Number(p.cantidad) || 0
    const puUsd = Number(p.precioUsd) || 0
    const valUsd = valorMercanciaUsdLinea(p)
    const valMxn = valorMercanciaMxnLinea(p, tc)
    const gastosMxn = gastosLines[i] ?? 0
    const costoTotMxn = valMxn + gastosMxn
    const costoUnitMxn = q > 0 ? costoTotMxn / q : 0
    const costoUnitUsd = tc > 0 ? costoUnitMxn / tc : 0
    return {
      p,
      q,
      puUsd,
      valUsd,
      valMxn,
      gastosMxn,
      costoTotMxn,
      costoUnitMxn,
      costoUnitUsd,
    }
  })

  const totCant = rows.reduce((s, r) => s + r.q, 0)
  const totValUsd = rows.reduce((s, r) => s + r.valUsd, 0)
  const totValMxn = rows.reduce((s, r) => s + r.valMxn, 0)
  const totGastosMxn = rows.reduce((s, r) => s + r.gastosMxn, 0)
  const totCostoMxn = rows.reduce((s, r) => s + r.costoTotMxn, 0)

  const exportExcel = () => {
    const data = rows.map((r) => ({
      Producto: r.p.descripcion,
      Cantidad: r.q,
      'P.U. USD': r.puUsd,
      'Valor total USD': r.valUsd,
      'Valor total MXN': r.valMxn,
      'Gastos prorrateados MXN': r.gastosMxn,
      'Costo total MXN': r.costoTotMxn,
      'Costo unit. MXN': r.costoUnitMxn,
      'Costo unit. USD': r.costoUnitUsd,
    }))
    data.push({
      Producto: 'TOTALES',
      Cantidad: totCant,
      'P.U. USD': '',
      'Valor total USD': totValUsd,
      'Valor total MXN': totValMxn,
      'Gastos prorrateados MXN': totGastosMxn,
      'Costo total MXN': totCostoMxn,
      'Costo unit. MXN': '',
      'Costo unit. USD': '',
    })
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados')
    const stamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `resultados-costeo-${stamp}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-gray-900">Resultados</h2>
        <button
          type="button"
          onClick={exportExcel}
          className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
        >
          Exportar a Excel
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-[56rem] w-full border-collapse text-sm">
          <thead>
            <tr>
              <Th>Producto</Th>
              <Th className="text-right">Cantidad</Th>
              <Th className="text-right">P.U. USD</Th>
              <Th className="text-right">Valor total USD</Th>
              <Th className="text-right">Valor total MXN</Th>
              <Th className="text-right">Gastos prorrateados MXN</Th>
              <Th className="text-right">Costo total MXN</Th>
              <Th className="text-right">Costo unit. MXN</Th>
              <Th className="text-right">Costo unit. USD</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.p.id} className="hover:bg-gray-50">
                <TdText className="max-w-[14rem]">
                  {r.p.descripcion || '—'}
                </TdText>
                <TdMoney>{fmtQty(r.q)}</TdMoney>
                <TdMoney>{fmtMoneyUsd(r.puUsd)}</TdMoney>
                <TdMoney>{fmtMoneyUsd(r.valUsd)}</TdMoney>
                <TdMoney>{fmtMoneyMXN(r.valMxn)}</TdMoney>
                <TdMoney>{fmtMoneyMXN(r.gastosMxn)}</TdMoney>
                <TdMoney>{fmtMoneyMXN(r.costoTotMxn)}</TdMoney>
                <TdMoney>{fmtMoneyMXN(r.costoUnitMxn)}</TdMoney>
                <TdMoney>{fmtMoneyUsd(r.costoUnitUsd)}</TdMoney>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-white font-bold text-gray-900">
              <TdText>TOTALES</TdText>
              <TdMoney>{fmtQty(totCant)}</TdMoney>
              <TdMoney>—</TdMoney>
              <TdMoney>{fmtMoneyUsd(totValUsd)}</TdMoney>
              <TdMoney>{fmtMoneyMXN(totValMxn)}</TdMoney>
              <TdMoney>{fmtMoneyMXN(totGastosMxn)}</TdMoney>
              <TdMoney>{fmtMoneyMXN(totCostoMxn)}</TdMoney>
              <TdMoney>—</TdMoney>
              <TdMoney>—</TdMoney>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-gray-600">
        Gastos prorrateados (sin IVA): IGI por valor MXN de línea; DTA y PRV por piezas;
        flete, seguro, honorarios, almacén, documentación, flete local, COVE,
        incrementables, más gastos adicionales, menos descuento, prorrateados por
        piezas. Costo total MXN = valor mercancía MXN + esos gastos.
      </p>
    </div>
  )
}
