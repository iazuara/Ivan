import {
  BASE_IVA_SERV_KEYS,
  COST_KEYS,
  GASTOS_POR_PESO_KEYS,
  GASTOS_POR_PIEZAS_KEYS,
  GASTOS_POR_VALOR_MXN_KEYS,
} from './constantes.js'

const nfMoney = (currency) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const nfQty = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const nfWeight = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
})

export function fmtMoneyUsd(n) {
  return nfMoney('USD').format(Number(n) || 0)
}

export function fmtMoneyMXN(n) {
  return nfMoney('MXN').format(Number(n) || 0)
}

export function fmtQty(n) {
  return nfQty.format(Number(n) || 0)
}

export function fmtWeight(n) {
  return nfWeight.format(Number(n) || 0)
}

export function sumAdicionales(gastosAdicionales) {
  return (gastosAdicionales || []).reduce(
    (s, g) => s + (Number(g.monto) || 0),
    0,
  )
}

export function sumGastosCosto(gastos) {
  return COST_KEYS.reduce((s, key) => s + (Number(gastos[key]) || 0), 0)
}

export function totalGastosCosto(gastos, gastosAdicionales, descuento) {
  return (
    sumGastosCosto(gastos) +
    sumAdicionales(gastosAdicionales) -
    (Number(descuento) || 0)
  )
}

export function lineWeights(productos) {
  return productos.map((p) => {
    const q = Number(p.cantidad) || 0
    const w = Number(p.pesoKg) || 0
    return q * w
  })
}

export function totalWeightKg(productos) {
  return lineWeights(productos).reduce((a, b) => a + b, 0)
}

export function totalPiezas(productos) {
  return productos.reduce((s, p) => s + (Number(p.cantidad) || 0), 0)
}

export function valorMercanciaUsdLinea(p) {
  const q = Number(p.cantidad) || 0
  const price = Number(p.precioUsd) || 0
  return q * price
}

export function totalValorMercanciaUsd(productos) {
  return productos.reduce((s, p) => s + valorMercanciaUsdLinea(p), 0)
}

export function valorMercanciaMxnLinea(p, tipoCambio) {
  const tc = Number(tipoCambio) || 0
  return valorMercanciaUsdLinea(p) * tc
}

export function totalValorMercanciaMxn(productos, tipoCambio) {
  return productos.reduce(
    (s, p) => s + valorMercanciaMxnLinea(p, tipoCambio),
    0,
  )
}

/** Prorrateo de un monto total entre líneas según peso total (cantidad × peso unitario). */
export function prorrateoPorPeso(productos, montoTotal) {
  const lineW = lineWeights(productos)
  const tot = lineW.reduce((a, b) => a + b, 0)
  const m = Number(montoTotal) || 0
  if (tot <= 0) return productos.map(() => 0)
  return lineW.map((w) => m * (w / tot))
}

/** Prorrateo por número de piezas (cantidad). */
export function prorrateoPorPiezas(productos, montoTotal) {
  const piezas = productos.map((p) => Number(p.cantidad) || 0)
  const tot = piezas.reduce((a, b) => a + b, 0)
  const m = Number(montoTotal) || 0
  if (tot <= 0) return productos.map(() => 0)
  return piezas.map((q) => m * (q / tot))
}

/** Prorrateo por valor de mercancía en MXN. */
export function prorrateoPorValorMxn(productos, tipoCambio, montoTotal) {
  const vals = productos.map((p) => valorMercanciaMxnLinea(p, tipoCambio))
  const tot = vals.reduce((a, b) => a + b, 0)
  const m = Number(montoTotal) || 0
  if (tot <= 0) return productos.map(() => 0)
  return vals.map((v) => m * (v / tot))
}

/** Suma de gastos prorrateados asignados a cada línea (solo líneas principales del costeo). */
export function gastosPrincipalesPorLinea(productos, gastos, tipoCambio) {
  const n = productos.length
  const acc = Array(n).fill(0)

  const add = (arr) => {
    arr.forEach((v, i) => {
      acc[i] += v
    })
  }

  for (const key of GASTOS_POR_PESO_KEYS) {
    add(prorrateoPorPeso(productos, gastos[key]))
  }
  for (const key of GASTOS_POR_PIEZAS_KEYS) {
    add(prorrateoPorPiezas(productos, gastos[key]))
  }
  for (const key of GASTOS_POR_VALOR_MXN_KEYS) {
    add(prorrateoPorValorMxn(productos, tipoCambio, gastos[key]))
  }

  return acc
}

export function baseIvaImportacion(productos, gastos, tipoCambio) {
  const vm = totalValorMercanciaMxn(productos, tipoCambio)
  let aranceles = 0
  for (const k of GASTOS_POR_VALOR_MXN_KEYS) {
    aranceles += Number(gastos[k]) || 0
  }
  return vm + aranceles
}

export function baseIvaServicios(gastos) {
  return BASE_IVA_SERV_KEYS.reduce((s, k) => s + (Number(gastos[k]) || 0), 0)
}

/** Contribución de cada línea a la base de IVA servicios (misma mezcla que prorrateo de gastos). */
export function baseIvaServiciosPorLinea(productos, gastos) {
  const n = productos.length
  const acc = Array(n).fill(0)
  const add = (arr) => {
    arr.forEach((v, i) => {
      acc[i] += v
    })
  }
  add(prorrateoPorPeso(productos, gastos.flete))
  for (const key of GASTOS_POR_PIEZAS_KEYS) {
    add(prorrateoPorPiezas(productos, gastos[key]))
  }
  return acc
}

export function montoIvaImportacion(productos, gastos, tipoCambio, ivaImpPct) {
  return (
    (baseIvaImportacion(productos, gastos, tipoCambio) *
      (Number(ivaImpPct) || 0)) /
    100
  )
}

export function montoIvaServicios(gastos, ivaServPct) {
  return (
    (baseIvaServicios(gastos) * (Number(ivaServPct) || 0)) / 100
  )
}

export function ivaImportacionPorLinea(
  productos,
  gastos,
  tipoCambio,
  ivaImpPct,
) {
  const total = montoIvaImportacion(productos, gastos, tipoCambio, ivaImpPct)
  const totVal = totalValorMercanciaMxn(productos, tipoCambio)
  const igi = Number(gastos.igi) || 0
  const dta = Number(gastos.dta) || 0
  const seg = Number(gastos.seguro) || 0
  const baseTot = baseIvaImportacion(productos, gastos, tipoCambio)
  if (baseTot <= 0) return productos.map(() => 0)

  return productos.map((p) => {
    const lv = valorMercanciaMxnLinea(p, tipoCambio)
    const lineBase =
      totVal > 0
        ? lv + ((igi + dta + seg) * lv) / totVal
        : lv
    return total * (lineBase / baseTot)
  })
}

export function ivaServiciosPorLinea(productos, gastos, ivaServPct) {
  const total = montoIvaServicios(gastos, ivaServPct)
  const parts = baseIvaServiciosPorLinea(productos, gastos)
  const s = parts.reduce((a, b) => a + b, 0)
  if (s <= 0) return productos.map(() => 0)
  return parts.map((x) => total * (x / s))
}

export function getResumen(
  productos,
  gastos,
  tipoCambio,
  ivaImp,
  ivaServ,
  gastosAdicionales,
  descuento,
) {
  const tc = Number(tipoCambio) || 0
  const valorMercanciaUsd = totalValorMercanciaUsd(productos)
  const valorMercanciaMxn = valorMercanciaUsd * tc
  const totalGastosAlCosto = totalGastosCosto(
    gastos,
    gastosAdicionales,
    descuento,
  )
  const montoIvaImp = montoIvaImportacion(productos, gastos, tc, ivaImp)
  const montoIvaServ = montoIvaServicios(gastos, ivaServ)
  const totalIvas = montoIvaImp + montoIvaServ
  const totalConIva =
    valorMercanciaMxn + totalGastosAlCosto + totalIvas
  return {
    tipoCambio: tc,
    valorMercanciaUsd,
    valorMercanciaMxn,
    totalGastosAlCosto,
    montoIvaImp,
    montoIvaServ,
    totalIvas,
    totalConIva,
    costoTotalImportacion: totalConIva,
  }
}

/** Costo total MXN por línea (mercancía + gastos prorrateados + IVAs por línea + adicionales − descuento). */
export function costoTotalMxnPorLinea(
  productos,
  gastos,
  tipoCambio,
  ivaImp,
  ivaServ,
  gastosAdicionales,
  descuento,
) {
  const tc = Number(tipoCambio) || 0
  const main = gastosPrincipalesPorLinea(productos, gastos, tc)
  const addi = prorrateoPorValorMxn(productos, tc, sumAdicionales(gastosAdicionales))
  const desc = prorrateoPorValorMxn(productos, tc, Number(descuento) || 0)
  const ivI = ivaImportacionPorLinea(productos, gastos, tc, ivaImp)
  const ivS = ivaServiciosPorLinea(productos, gastos, ivaServ)

  return productos.map((p, i) => {
    const val = valorMercanciaMxnLinea(p, tc)
    return val + main[i] + addi[i] - desc[i] + ivI[i] + ivS[i]
  })
}

export function costoUnitarioMxnPorLinea(
  productos,
  gastos,
  tipoCambio,
  ivaImp,
  ivaServ,
  gastosAdicionales,
  descuento,
) {
  const totals = costoTotalMxnPorLinea(
    productos,
    gastos,
    tipoCambio,
    ivaImp,
    ivaServ,
    gastosAdicionales,
    descuento,
  )
  return productos.map((p, i) => {
    const q = Number(p.cantidad) || 0
    if (q <= 0) return 0
    return totals[i] / q
  })
}

export function precioVentaPorLinea(costoUnitMxn, margenPct) {
  const c = Number(costoUnitMxn) || 0
  const m = Number(margenPct) || 0
  return c * (1 + m / 100)
}

export function margenMxnPorPieza(precioVenta, costoUnitMxn) {
  return (Number(precioVenta) || 0) - (Number(costoUnitMxn) || 0)
}

/**
 * Claves de gasto que en "Resultados" se prorratean por piezas (pool agencia + fletes/seguro).
 * No incluye IGI, DTA ni PRV (van aparte). IVA no entra.
 */
export const RESULTADOS_AGENCY_POOL_KEYS = [
  'flete',
  'seguro',
  'honorarios',
  'almacen',
  'documentacion',
  'flete_local',
  'cove',
  'incrementables',
]

/**
 * Gastos prorrateados por línea para la pestaña Resultados (sin IVA):
 * - IGI: proporcional al valor MXN de mercancía de la línea.
 * - DTA y PRV: entre total de piezas.
 * - Pool agencia (flete, seguro, honorarios, almacén, documentación, flete local, COVE,
 *   incrementables) + gastos adicionales − descuento; luego entre total de piezas.
 */
export function gastosProrrateadosPorLineaResultados(
  productos,
  gastos,
  tipoCambio,
  gastosAdicionales,
  descuento,
) {
  const tc = Number(tipoCambio) || 0
  const totalValMxn = totalValorMercanciaMxn(productos, tc)
  const igi = Number(gastos.igi) || 0
  const dta = Number(gastos.dta) || 0
  const prv = Number(gastos.prv) || 0

  const lineIgi =
    totalValMxn > 0
      ? productos.map((p) => valorMercanciaMxnLinea(p, tc) * (igi / totalValMxn))
      : productos.map(() => 0)

  const lineDta = prorrateoPorPiezas(productos, dta)
  const linePrv = prorrateoPorPiezas(productos, prv)

  let pool = RESULTADOS_AGENCY_POOL_KEYS.reduce(
    (s, k) => s + (Number(gastos[k]) || 0),
    0,
  )
  pool += sumAdicionales(gastosAdicionales)
  pool -= Number(descuento) || 0
  if (pool < 0) pool = 0

  const lineAgency = prorrateoPorPiezas(productos, pool)

  return productos.map((_, i) => lineIgi[i] + lineDta[i] + linePrv[i] + lineAgency[i])
}
