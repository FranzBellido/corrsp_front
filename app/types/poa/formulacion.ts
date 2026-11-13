export interface PoaFormulacionResumen {
  id: string
  area_id: string
  poa_estado_id: number
  nombre: string
  pre_estado_id: number
  fecha_informe?: string | null
  version_id: number
  areas?: {
    id: string
    codigo: string
    nombre: string
  }
  poa_version?: {
    gestion: number
    nombre: string
    trimestre_activo: number
  }
  poa_estado?: {
    id: number
    nombre: string
    permite_editar?: boolean
  }
}

export interface AcpDisponibleFormulacion {
  id: string
  numero: number
  descripcion: string
  ponderacion: number
  version_id: number
}

export interface PoaFormulacionContexto {
  formulacion: PoaFormulacionResumen
  area_cargo: {
    id: string
    nombre: string
    codigo: string | null
  }
  cargo_id: string
  acps_disponibles: AcpDisponibleFormulacion[]
  trimestre_activo?: number
}
