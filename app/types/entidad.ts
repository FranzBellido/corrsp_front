export interface Entidad {
  id: number
  nombre_ent?: string | null
  estado: number
  creado: string
  _count?: {
    corresp_entidad?: number
  }
}

export interface CreateEntidadPayload {
  nombre_ent: string
  estado?: number
}

export interface UpdateEntidadPayload extends Partial<CreateEntidadPayload> {}

export interface FiltroEntidad {
  criterio?: string
  estado?: number
  pagina?: number
  limite?: number
}

export interface VistaEntidad {
  datos: Entidad[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export type RespuestaBusquedaEntidad = VistaEntidad
