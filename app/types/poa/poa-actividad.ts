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
  linea_base?: number | null
  porcentual: boolean
  /** Suma de cant_programada por trimestre (calculada en API o localmente). */
  meta_programada?: number
  seguimiento_actividades?: PoaActividadSeguimiento[]
  _count?: {
    seguimiento_actividades?: number
  }
}

export function metaProgramadaDeActividad(act: PoaActividad): number {
  if (act.meta_programada != null) return act.meta_programada
  return (act.seguimiento_actividades ?? []).reduce(
    (acc, s) => acc + (Number(s.cant_programada) || 0),
    0,
  )
}

export interface CreatePoaActividadPayload {
  oper_id: string
  descripcion: string
  ponderacion: number
  tareas?: string | null
  medios?: string | null
  linea_base?: number | null
  porcentual: boolean
  cant_programada_trimestres: [number, number, number, number]
}

export interface UpdatePoaActividadPayload
  extends Partial<Omit<CreatePoaActividadPayload, 'oper_id'>> {
  cant_programada_trimestres?: [number, number, number, number]
}