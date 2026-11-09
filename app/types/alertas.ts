export type AlertaNivel = 'roja' | 'amarilla'
export type AlertaTipo = 'plazo_critico' | 'plazo_advertencia' | 'no_leida'
export type AlertaAmbito = 'cargo' | 'area'

/** Valor especial del filtro UI para consultar toda el área. */
export const ALERTAS_AMBITO_AREA = '__area__'

export interface AlertaItem {
  id: string
  tipo: AlertaTipo
  nivel: AlertaNivel
  titulo: string
  descripcion: string
  derivacion_id: string
  documento_id: string
  referencia: string | null
  cite: string | null
  proceso: string | null
  fecha_plazo: string | null
  fecha_envio: string | null
  dias_restantes: number | null
  leido: boolean
  cargo_destino_id?: string | null
  cargo_destino_nombre?: string | null
}

export interface AlertasDashboard {
  ambito: AlertaAmbito
  cargo: { id: string; nombre: string } | null
  area: { id: string; codigo: string; nombre: string } | null
  resumen: {
    total: number
    rojas: number
    amarillas: number
    plazos_criticos: number
    plazos_advertencia: number
    no_leidas: number
  }
  items: AlertaItem[]
}
