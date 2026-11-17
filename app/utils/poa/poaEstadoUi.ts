import type { PoaEstadoBadgeColor, PoaEstadoVista } from '~/types/poa/poa-estado'
import {
  POA_FORMULACION_ESTADO_ENVIADO_ID,
  POA_FORMULACION_ESTADO_OBSERVADO_ID,
  POA_FORMULACION_ESTADO_VALIDADO_ID,
} from '~/types/poa/formulacion'

const BADGE_COLORS = new Set<string>([
  'primary',
  'secondary',
  'success',
  'info',
  'warning',
  'error',
  'neutral',
])

const POR_ID: Record<number, { color: PoaEstadoBadgeColor; icono: string }> = {
  1: { color: 'neutral', icono: 'i-lucide-file-pen-line' },
  [POA_FORMULACION_ESTADO_ENVIADO_ID]: { color: 'primary', icono: 'i-lucide-send' },
  [POA_FORMULACION_ESTADO_OBSERVADO_ID]: {
    color: 'warning',
    icono: 'i-lucide-message-square-warning',
  },
  [POA_FORMULACION_ESTADO_VALIDADO_ID]: {
    color: 'success',
    icono: 'i-lucide-circle-check',
  },
}

const POR_NOMBRE: Record<string, { color: PoaEstadoBadgeColor; icono: string }> = {
  creado: { color: 'neutral', icono: 'i-lucide-file-pen-line' },
  borrador: { color: 'neutral', icono: 'i-lucide-file-pen-line' },
  enviado: { color: 'primary', icono: 'i-lucide-send' },
  observado: { color: 'warning', icono: 'i-lucide-message-square-warning' },
  validado: { color: 'success', icono: 'i-lucide-circle-check' },
}

function normalizarNombre(nombre?: string | null) {
  return (nombre ?? '').trim().toLowerCase()
}

function colorValido(value?: string | null): PoaEstadoBadgeColor | undefined {
  const v = value?.trim().toLowerCase()
  if (v && BADGE_COLORS.has(v)) return v as PoaEstadoBadgeColor
  return undefined
}

export interface PoaEstadoUiResuelto {
  nombre: string
  color: PoaEstadoBadgeColor
  icono: string
}

export function resolverPoaEstadoUi(
  estado?: PoaEstadoVista | null,
  fallbackNombre?: string,
): PoaEstadoUiResuelto {
  const nombre = estado?.nombre?.trim() || fallbackNombre?.trim() || '—'
  const keyNom = normalizarNombre(estado?.nombre ?? fallbackNombre)
  const porId = estado?.id != null ? POR_ID[estado.id] : undefined
  const porNom = keyNom ? POR_NOMBRE[keyNom] : undefined
  const fallback = porId ?? porNom ?? { color: 'neutral' as const, icono: 'i-lucide-circle' }

  return {
    nombre,
    color: colorValido(estado?.color) ?? fallback.color,
    icono: estado?.icono?.trim() || fallback.icono,
  }
}