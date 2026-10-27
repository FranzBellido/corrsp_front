export interface Proceso {
  id: number
  nombre: string
  codigo: string
  ndias_plazo?: number | null
  requiere_cooperativa: boolean
  plantilla?: string | null
  interna: boolean
  requiere_entidad: boolean
  requiere_pago: boolean
  requiere_corelativo: boolean
  requiere_destinatario: boolean
  referencia?: string | null
  requiere_documento?: boolean | null
  requiere_legalizacion?: boolean | null
  flujo_definido?: boolean
  _count?: {
    correspondencia?: number
    area_proceso?: number
  }
}

export interface CreateProcesoPayload {
  nombre: string
  codigo: string
  ndias_plazo?: number
  requiere_cooperativa?: boolean
  plantilla?: string
  interna?: boolean
  requiere_entidad?: boolean
  requiere_pago?: boolean
  requiere_corelativo?: boolean
  requiere_destinatario?: boolean
  referencia?: string
  requiere_documento?: boolean
  requiere_legalizacion?: boolean
  flujo_definido?: boolean
}

export interface UpdateProcesoPayload extends Partial<CreateProcesoPayload> {}

export interface FiltroProceso {
  criterio?: string
  interna?: boolean
  requiere_cooperativa?: boolean
  pagina?: number
  limite?: number
}

export interface VistaProceso {
  datos: Proceso[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export type RespuestaBusquedaProceso = VistaProceso
