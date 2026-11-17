/** Color aceptado por UBadge en Nuxt UI. */
export type PoaEstadoBadgeColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral'

export interface PoaEstadoVista {
  id?: number
  nombre?: string | null
  color?: string | null
  icono?: string | null
  permite_editar?: boolean
  permite_eliminar?: boolean
  permite_enviar?: boolean
}