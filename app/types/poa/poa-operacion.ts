import type { PoaActividad } from './poa-actividad'
import type { PoaEstadoVista } from './poa-estado'

export type PoaEstadoPermisos = PoaEstadoVista & {
  id: number
  nombre: string
}

export interface PoaOperacion {
  id: string
  resultado_id: string
  area_id?: string
  areas?: {
    id: string
    codigo: string
    nombre: string
  } | null
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
  area_id: string
  descripcion: string
  ponderacion: number
  meta: string
  indicador: string
  estado_id?: number
}

export interface UpdatePoaOperacionPayload
  extends Partial<Omit<CreatePoaOperacionPayload, 'resultado_id'>> {}
