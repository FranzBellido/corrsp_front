export interface PoaActividadSeguimiento {
  id: string
  cant_programada: number
  seguimiento?: {
    trimestre: number
  }
}

export interface PoaActividad {
  id: string
  oper_id: string
  descripcion?: string | null
  numero: number
  ponderacion: number
  tareas?: string | null
  medios?: string | null
  meta?: number | null
  linea_base?: number | null
  seguimiento_actividades?: PoaActividadSeguimiento[]
  _count?: {
    seguimiento_actividades?: number
  }
}

export interface CreatePoaActividadPayload {
  oper_id: string
  descripcion: string
  ponderacion: number
  tareas?: string | null
  medios?: string | null
  meta?: number | null
  linea_base?: number | null
  cant_programada_trimestres: [number, number, number, number]
}

export interface UpdatePoaActividadPayload
  extends Partial<Omit<CreatePoaActividadPayload, 'oper_id'>> {
  cant_programada_trimestres?: [number, number, number, number]
}
