export interface TipoCodificador {
  id: number
  nombre: string
  descripcion?: string | null
}

export interface CodificadorAdmin {
  codificadorId: number
  nombre?: string | null
  descripcion?: string | null
  tipo_id?: number | null
  tipo_codificador?: TipoCodificador | null
  _count?: {
    correspondencia?: number
    derivaciones?: number
  }
}

export interface CreateCodificadorPayload {
  nombre: string
  descripcion?: string
  tipo_id?: number
}

export interface UpdateCodificadorPayload extends Partial<CreateCodificadorPayload> {}

export interface FiltroCodificadorAdmin {
  criterio?: string
  tipo_id?: number
  pagina?: number
  limite?: number
}

export interface VistaCodificadorAdmin {
  datos: CodificadorAdmin[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export type RespuestaBusquedaCodificadorAdmin = VistaCodificadorAdmin
