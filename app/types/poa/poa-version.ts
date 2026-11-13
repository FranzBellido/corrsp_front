export interface PoaVersion {
  gestion: number
  nombre: string
  f_seguimiento?: string | null
  trimestre_activo: number
  f_formulacion?: string | null
  activaalertasformulacion: boolean
  activaalertasseguimiento: boolean
  _count?: {
    acp?: number
    poa_formulacion?: number
  }
}

export interface PoaVersionLookup {
  gestion: number
  nombre: string
  trimestre_activo: number
}

export interface CreatePoaVersionPayload {
  gestion: number
  nombre: string
  f_seguimiento?: string | null
  trimestre_activo?: number
  f_formulacion?: string | null
  activaalertasformulacion?: boolean
  activaalertasseguimiento?: boolean
}

export interface UpdatePoaVersionPayload
  extends Partial<Omit<CreatePoaVersionPayload, 'gestion'>> {}

export interface FiltroPoaVersion {
  gestion?: number
  pagina?: number
  limite?: number
}

export interface VistaPoaVersion {
  datos: PoaVersion[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export type RespuestaBusquedaPoaVersion = VistaPoaVersion
