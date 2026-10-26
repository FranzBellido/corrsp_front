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
