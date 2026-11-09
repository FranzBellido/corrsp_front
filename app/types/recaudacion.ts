export interface RecDepositoCorrespondenciaResumen {
  id: string
  referencia: string
  fecha_emision?: string | null
  cite_origen?: string | null
  hoja_ruta?: {
    numero: number | null
    anio: number
  } | null
}

export interface RecDepositoItem {
  id: string
  numero: string
  importe: number
  fecha_deposito: string
  observacion?: string | null
  verificado: boolean
  created_at?: string
  updated_at?: string | null
  correspondencia?: RecDepositoCorrespondenciaResumen | null
}

export interface FiltroRecDeposito {
  criterio?: string
  verificado?: boolean
  pagina?: number
  limite?: number
}

export interface UpdateRecDepositoPayload {
  numero?: string
  importe?: number
  fecha_deposito?: string
  observacion?: string | null
  verificado?: boolean
}

export interface VistaRecDepositos {
  datos: RecDepositoItem[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export type RespuestaBusquedaRecDeposito = VistaRecDepositos

export interface FiltroRecDashboard {
  gestion: number
  mes?: number
  proc_id?: number
}

export interface RecDashboardResumen {
  total_importe: number
  total_boletas: number
  verificados: number
  pendientes: number
}

export interface RecDashboardPorMes {
  mes: number
  label: string
  importe: number
  cantidad: number
  verificados: number
}

export interface RecDashboardPorProceso {
  proc_id: number | null
  proceso: string
  codigo: string | null
  importe: number
  cantidad: number
  verificados: number
}

export interface RecDashboardDetalle {
  mes: number
  mes_label: string
  proc_id: number | null
  proceso: string
  codigo: string | null
  cantidad: number
  importe: number
  verificados: number
  pendientes: number
}

export interface RecDashboardData {
  filtros: {
    gestion: number
    mes: number | null
    proc_id: number | null
  }
  resumen: RecDashboardResumen
  por_mes: RecDashboardPorMes[]
  por_proceso: RecDashboardPorProceso[]
  detalle: RecDashboardDetalle[]
}
