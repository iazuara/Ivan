import {
  fmtMoneyMXN,
  fmtMoneyUsd,
  getResumen,
  sumAdicionales,
  sumGastosCosto,
} from '../utils/calculos.js'
import { COST_KEYS, GASTOS_LABELS } from '../utils/constantes.js'

function Row({ label, value, strong }) {
  return (
    <tr className={strong ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}>
      <td className="border-b border-gray-200 px-3 py-2 text-gray-800">{label}</td>
      <td className="border-b border-gray-200 px-3 py-2 text-right tabular-nums text-gray-900">
        {value}
      </td>
    </tr>
  )
}

export default function Resumen({
  productos,
  gastos,
  tipoCambio,
  ivaImp,
  ivaServ,
  gastosAdicionales,
  descuento,
}) {
  const r = getResumen(
    productos,
    gastos,
    tipoCambio,
    ivaImp,
    ivaServ,
    gastosAdicionales,
    descuento,
  )
  const subGastos = sumGastosCosto(gastos)
  const subAdic = sumAdicionales(gastosAdicionales)

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <tbody>
            <Row
              label="Tipo de cambio (USD → MXN)"
              value={new Intl.NumberFormat('es-MX', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              }).format(r.tipoCambio || 0)}
            />
            <Row
              label="Valor mercancía (USD)"
              value={fmtMoneyUsd(r.valorMercanciaUsd)}
            />
            <Row
              label="Valor mercancía (MXN)"
              value={fmtMoneyMXN(r.valorMercanciaMxn)}
            />
            <Row
              label="Subtotal gastos al costo (captura)"
              value={fmtMoneyMXN(subGastos)}
            />
            <Row
              label="Gastos adicionales"
              value={fmtMoneyMXN(subAdic)}
            />
            <Row
              label="Descuento (ajuste)"
              value={`− ${fmtMoneyMXN(descuento)}`}
            />
            <Row
              label="Total gastos al costo"
              value={fmtMoneyMXN(r.totalGastosAlCosto)}
              strong
            />
            <Row
              label={`IVA importación (${ivaImp}%)`}
              value={fmtMoneyMXN(r.montoIvaImp)}
            />
            <Row
              label={`IVA servicios (${ivaServ}%)`}
              value={fmtMoneyMXN(r.montoIvaServ)}
            />
            <Row label="Total IVAs" value={fmtMoneyMXN(r.totalIvas)} strong />
            <Row
              label="Total con IVA (mercancía + gastos + IVAs)"
              value={fmtMoneyMXN(r.totalConIva)}
              strong
            />
            <Row
              label="Costo total de importación"
              value={fmtMoneyMXN(r.costoTotalImportacion)}
              strong
            />
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-gray-800">
          Desglose de gastos capturados
        </h3>
        <ul className="grid gap-1 text-sm text-gray-700 sm:grid-cols-2">
          {COST_KEYS.map((k) => (
            <li key={k} className="flex justify-between border-b border-gray-100 py-1">
              <span>{GASTOS_LABELS[k]}</span>
              <span className="tabular-nums">{fmtMoneyMXN(gastos[k])}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
