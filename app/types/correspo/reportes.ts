export interface ReporteCorrespProceso {
  id: number | null
  codigo: string | null
  nombre: string
  cantidad: number
}

export interface ReporteCorrespCooperativa {
  id: number | null
  nombre: string
  nro_registro: string | null
  cantidad: number
}

export interface ReporteRecaudacionProceso {
  id: number | null
  codigo: string | null
  nombre: string
  cantidad_boletas: number
  importe: number
}

export interface ReporteRecaudacionCooperativa {
  id: number | null
  nombre: string
  nro_registro: string | null
  cantidad_boletas: number
  importe: number
}

export interface ReporteChartCategory {
  key: string
  label: string
}

/** Fila mensual: `month` + una clave numérica por cooperativa (`c0`…`c9`). */
export type ReporteMesChartRow = Record<string, string | number> & {
  month: string
  mes: number
}

export interface ReporteSerieCooperativaMensual<TRanking> {
  ranking: TRanking[]
  categories: ReporteChartCategory[]
  por_mes: ReporteMesChartRow[]
}

export interface ReportesResumen {
  gestion: number
  top: number
  corresp_por_proceso: ReporteCorrespProceso[]
  corresp_por_cooperativa: ReporteSerieCooperativaMensual<ReporteCorrespCooperativa>
  recaudacion_por_proceso: ReporteRecaudacionProceso[]
  recaudacion_por_cooperativa: ReporteSerieCooperativaMensual<ReporteRecaudacionCooperativa>
}
