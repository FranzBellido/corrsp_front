import type { PoaEstadoVista } from './poa-estado'

export type PoaEstadoSeguimiento = PoaEstadoVista & {
  id: number
  nombre: string
  permite_editar?: boolean
  permite_eliminar?: boolean
  permite_enviar?: boolean
}

export interface SeguimientoActividadActividadRef {
  id: string
  numero: number
  descripcion?: string | null
  ponderacion: number
  medios?: string | null
  porcentual: boolean
  tareas?: string | null
  poa_operacion?: {
    id: string
    numero: number
    descripcion: string
    area_id?: string
    areas?: { id: string; codigo: string; nombre: string } | null
    acp_resultados?: {
      id: string
      numero: number
      nombre: string
      poa_formulacion_id?: string | null
    } | null
  } | null
}

export interface SeguimientoActividad {
  id: string
  descripcion?: string | null
  justificacion?: string | null
  cant_programada: number
  cant_ejecutada?: number | null
  actividad_id: string
  seguimiento_id: string
  estado_id: number
  created_at?: string | null
  updated_at?: string | null
  poa_estado?: PoaEstadoSeguimiento | null
  poa_actividades?: SeguimientoActividadActividadRef | null
  seguimiento?: {
    id: string
    nombre: string
    trimestre: number
    formulacion_id: string
    estado_id: number
    poa_estado?: PoaEstadoSeguimiento | null
  } | null
}

export interface SeguimientoActividadContexto {
  formulacion: {
    id: string
    nombre: string
    version_id: number
    areas?: { id: string; codigo: string; nombre: string } | null
    poa_estado?: PoaEstadoSeguimiento | null
  }
  area_cargo: {
    id: string
    nombre: string
    codigo: string | null
  }
  seguimiento: {
    id: string
    nombre: string
    trimestre: number
    estado_id: number
    f_envio?: string | null
    poa_estado?: PoaEstadoSeguimiento | null
  }
  trimestre_activo: number
  nombre_seguimiento?: string
  permite_editar: boolean
  permite_enviar?: boolean
  modo_admin?: boolean
}

export interface SeguimientoResumen {
  id: string
  nombre: string
  trimestre: number
  formulacion_id: string
  estado_id: number
  f_envio?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string
  updated_by?: string | null
  poa_estado?: PoaEstadoSeguimiento | null
  poa_formulacion?: {
    id: string
    nombre: string
    version_id: number
    area_id: string
    areas?: { id: string; codigo: string; nombre: string } | null
    poa_version?: { gestion: number; nombre: string } | null
  } | null
}

export interface SeguimientoDetalleResponse {
  seguimiento: SeguimientoResumen
  historial_estado: Array<{
    id: string
    observaciones: string
    created_at?: string | null
    nombre?: string | null
    estado_id?: number | null
    poa_estado?: PoaEstadoSeguimiento | null
  }>
}

export interface FiltroSeguimientoAdmin {
  pagina?: number
  limite?: number
  version_id?: number
  trimestre?: number
  area_id?: string
  poa_estado_id?: number
  texto?: string
}

export interface RespuestaBusquedaSeguimientoAdmin {
  datos: SeguimientoResumen[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}

export interface SeguimientoValidacionEnvio {
  valido: boolean
  observaciones: string[]
}

export interface SeguimientoActividadListadoResponse {
  contexto: SeguimientoActividadContexto
  datos: SeguimientoActividad[]
}

export interface UpdateSeguimientoActividadPayload {
  descripcion?: string | null
  justificacion?: string | null
  cant_ejecutada?: number | null
}

export interface CreateSeguimientoActividadPayload {
  actividad_id: string
  descripcion?: string | null
  justificacion?: string | null
  cant_ejecutada?: number | null
  cant_programada?: number
}
