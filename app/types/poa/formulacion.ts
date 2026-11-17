import type { PoaEstadoVista } from './poa-estado'

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
  poa_estado?: PoaEstadoVista & {
    id: number
    nombre: string
    permite_editar?: boolean
    permite_enviar?: boolean
    permite_eliminar?: boolean
  }
  created_at?: string | null
  updated_at?: string | null
  created_by?: string
  updated_by?: string | null
}

export interface PoaEstadoLogEntry {
  id: string
  observaciones: string
  created_at?: string | null
  nombre?: string | null
  estado_id?: number | null
  poa_estado?: PoaEstadoVista & {
    id: number
    nombre: string
  }
}

export interface PoaFormulacionDetalleResponse {
  formulacion: PoaFormulacionResumen
  historial_estado: PoaEstadoLogEntry[]
}

/** Historial de poa_estado_log para resultado u operación (GET …/historial-estado). */
export interface PoaItemHistorialEstadoResponse {
  item: {
    id: string
    titulo: string
    estado_actual?: PoaEstadoVista | null
  }
  historial_estado: PoaEstadoLogEntry[]
}

export interface CambiarEstadoPoaFormulacionPayload {
  estado_id: number
  observaciones: string
}

export interface PoaFormulacionValidacionEnvio {
  valido: boolean
  observaciones: string[]
}

/** Estado catálogo: formulación enviada. */
export const POA_FORMULACION_ESTADO_ENVIADO_ID = 2
export const POA_FORMULACION_ESTADO_OBSERVADO_ID = 4
export const POA_FORMULACION_ESTADO_VALIDADO_ID = 5

export interface FiltroPoaFormulacionAdmin {
  pagina?: number
  limite?: number
  version_id?: number
  area_id?: string
  poa_estado_id?: number
  texto?: string
}

export interface RespuestaBusquedaPoaFormulacionAdmin {
  datos: PoaFormulacionResumen[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export interface AcpDisponibleFormulacion {
  id: string
  numero: number
  descripcion: string
  ponderacion: number
  version_id: number
}

/** Área de formulación + subáreas dependientes (registra_poa = false). */
export interface PoaAreaOperacionOption {
  id: string
  codigo: string
  nombre: string
}

export interface PoaFormulacionContexto {
  formulacion: PoaFormulacionResumen
  /** Unidad de formulación POA (usuarios.area_poa_id), no el área del cargo. */
  area_cargo: {
    id: string
    nombre: string
    codigo: string | null
  }
  cargo_id: string | null
  acps_disponibles: AcpDisponibleFormulacion[]
  areas_operacion?: PoaAreaOperacionOption[]
  trimestre_activo?: number
  modo_admin?: boolean
}
