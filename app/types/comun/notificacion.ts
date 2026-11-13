export type NotificacionTipo = 'derivacion' | 'copia' | 'compartido'

export interface NotificacionRealtime {
  id: string
  tipo: NotificacionTipo
  titulo: string
  mensaje: string
  documento_id?: string
  derivacion_id?: string
  created_at: string
  remitente?: string
  meta?: Record<string, string | number | boolean | null>
  leida?: boolean
}

export const NOTIFICACION_EVENT = 'nueva_notificacion' as const
