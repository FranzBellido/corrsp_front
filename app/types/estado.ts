/** Catálogo correspo.estado para derivaciones */
export enum EstadoDerivacionEnum {
  PENDIENTE = 1,
  RECEPCIONADO = 2,
  ARCHIVADO = 3,
  TRANSFERIDO_BAJA = 4,
  RECHAZADO = 5,
}

export const ENTIDAD_ESTADO_LOG_CORRESPONDENCIA = 'correspondencia'

export type PermisoEstadoDerivacion =
  | 'permite_derivar'
  | 'permite_archivar'
  | 'permite_recepcionar'
  | 'permite_asociar'
  | 'permite_editar'
  | 'permite_eliminar'

export interface EstadoDerivacion {
  id: number
  nombre: string
  descripcion?: string | null
  permite_derivar?: boolean
  permite_archivar?: boolean
  permite_recepcionar?: boolean
  permite_asociar?: boolean
  permite_editar?: boolean | null
  permite_eliminar?: boolean | null
}

/** Bandeja ingreso: acciones gobernadas por flags de correspo.estado (derivación). */
export const estadoPermite = (
  estado: EstadoDerivacion | null | undefined,
  permiso: PermisoEstadoDerivacion,
): boolean => estado?.[permiso] === true

export interface EstadoLogItem {
  id: string
  item_id: string
  observaciones: string
  created_at?: string | null
  updated_at?: string | null
  nombre?: string | null
  entidad?: string | null
  estado_id?: number | null
  estado?: {
    id: number
    nombre: string
    descripcion?: string | null
  } | null
}

export interface CambiarEstadoPayload {
  estado_id: number
  observaciones: string
  /** Cargo con el que opera el usuario en bandeja (debe coincidir con destino de la derivación). */
  cargo_id?: string
}
