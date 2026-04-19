/** Claves de gastos al costo (MXN) en orden de captura */
export const COST_KEYS = [
  'flete',
  'seguro',
  'igi',
  'dta',
  'prv',
  'incrementables',
  'honorarios',
  'almacen',
  'documentacion',
  'flete_local',
  'cove',
]

export const GASTOS_POR_PESO_KEYS = ['flete']

export const GASTOS_POR_PIEZAS_KEYS = [
  'honorarios',
  'documentacion',
  'cove',
  'almacen',
  'flete_local',
  'incrementables',
  'prv',
]

export const GASTOS_POR_VALOR_MXN_KEYS = ['igi', 'dta', 'seguro']

export const GASTOS_LABELS = {
  flete: 'Flete internacional',
  seguro: 'Seguro',
  igi: 'IGI',
  dta: 'DTA',
  prv: 'PRV',
  incrementables: 'Incrementables',
  honorarios: 'Honorarios',
  almacen: 'Almacén',
  documentacion: 'Documentación',
  flete_local: 'Flete local',
  cove: 'COVE',
}

/** Claves que entran en la base de IVA servicios (misma lógica que prorrateo + flete) */
export const BASE_IVA_SERV_KEYS = [
  'flete',
  'honorarios',
  'almacen',
  'documentacion',
  'flete_local',
  'cove',
  'incrementables',
  'prv',
]

export const emptyGastos = () =>
  Object.fromEntries(COST_KEYS.map((k) => [k, 0]))

export const SAMPLE_DATA = {
  tipoCambio: 18.35,
  productos: [
    {
      id: 'p1',
      descripcion: 'GPS Tracker vehicular 4G (magnético)',
      cantidad: 120,
      precioUsd: 28.5,
      pesoKg: 0.095,
      margenPct: 42,
    },
    {
      id: 'p2',
      descripcion: 'GPS Tracker OBD-II con diagnóstico',
      cantidad: 80,
      precioUsd: 31.9,
      pesoKg: 0.048,
      margenPct: 38,
    },
    {
      id: 'p3',
      descripcion: 'GPS Tracker portátil con batería extendida',
      cantidad: 40,
      precioUsd: 44.0,
      pesoKg: 0.156,
      margenPct: 45,
    },
  ],
  gastos: {
    flete: 12450,
    seguro: 2850,
    igi: 98500,
    dta: 15200,
    prv: 4200,
    incrementables: 3600,
    honorarios: 18500,
    almacen: 6200,
    documentacion: 4100,
    flete_local: 8900,
    cove: 2200,
  },
  iva_imp: 16,
  iva_serv: 16,
  gastosAdicionales: [
    { id: 'ga1', concepto: 'Revalidación / reconocimiento aduanal', monto: 3500 },
    { id: 'ga2', concepto: 'Maniobras en recinto fiscal', monto: 1800 },
  ],
  descuento: 1500,
}
