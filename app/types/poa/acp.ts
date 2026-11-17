import type { PoaEstadoVista } from './poa-estado'

export interface AeiLookup {
  id: string
  descripcion: string
  numero: number
  indicador?: string | null
}

export interface AcpAreaItem {
  id: string
  codigo: string
  nombre: string
  activo?: boolean
}

/** Resultado vinculado al ACP (detalle GET `acp/:id`). */
export interface AcpResultadoEnDetalle {
  id: string
  numero: number
  nombre: string
  indicador?: string | null
  ponderacion: number
  poa_formulacion_id?: string | null
  estado_nombre?: string | null
  estado?: PoaEstadoVista | null
  formulacion_nombre?: string | null
  area?: AcpAreaItem | null
}

export interface Acp {
  id: string
  ponderacion: number
  descripcion: string
  aei_id: string
  numero: number
  version_id: number
  aei?: {
    id: string
    descripcion: string
    numero: number
  } | null
  areas?: AcpAreaItem[]
  areas_ids?: string[]
  resultados?: AcpResultadoEnDetalle[]
  _count?: {
    acp_area?: number
    acp_resultados?: number
  }
}

export interface CreateAcpPayload {
  ponderacion: number
  descripcion: string
  aei_id: string
  numero?: number
  version_id: number
  areas_ids?: string[]
}

export interface UpdateAcpPayload extends Partial<CreateAcpPayload> {}

export interface FiltroAcp {
  gestion?: number
  pagina?: number
  limite?: number
}

export interface VistaAcp {
  datos: Acp[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export type RespuestaBusquedaAcp = VistaAcp
