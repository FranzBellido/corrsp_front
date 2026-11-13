import type { PoaActividad } from './poa-actividad'

export interface PoaEstadoPermisos {
  id: number
  nombre: string
  permite_editar?: boolean
  permite_eliminar?: boolean
}

export interface PoaOperacion {
  id: string
  resultado_id: string
  numero: number
  descripcion: string
  ponderacion: number
  estado_id: number
  meta: string
  indicador: string
  poa_estado?: PoaEstadoPermisos | null
  poa_actividades?: PoaActividad[]
  _count?: {
    poa_actividades?: number
  }
}

export interface CreatePoaOperacionPayload {
  resultado_id: string
  descripcion: string
  ponderacion: number
  meta: string
  indicador: string
  estado_id?: number
}

export interface UpdatePoaOperacionPayload
  extends Partial<Omit<CreatePoaOperacionPayload, 'resultado_id'>> {}
