import type { DropdownMenuItem } from '@nuxt/ui'
import { enriquecerItemMenuAcciones } from '~/utils/acciones-menu'
import type { ActionMenuItem } from '~/utils/correpondenciaActions'

export interface DerivacionActionContext {
  modo: 'salida' | 'ingreso' | 'con_copia'
  tieneDocumento: boolean
  permiteRecepcionar: boolean
  permiteRechazar: boolean
  permiteDerivar: boolean
  permiteArchivar: boolean
  puedeTransferirPorBaja: boolean
  yaTransferidoBaja: boolean
  puedeDerivarCorresp: boolean
  mensajeNoDerivar?: string
  permiteEditar: boolean
  permiteEliminar: boolean
  permiteAsociar: boolean
  onHistorial: () => void
  onRecepcionar: () => void
  onRechazar: () => void
  onDerivar: () => void
  onArchivar: () => void
  onTransferirBaja: () => void
  onEditar: () => void
  onEliminar: () => void
  tieneHojaRuta: boolean
  onResponderCorrespondencia: () => void
  requiereLegalizacion?: boolean
  onLegalizacion?: () => void
}

/**
 * Orden del menú ⋮ en bandejas de derivación (ingreso, salida, con copia).
 * Números menores aparecen primero.
 */
export const DERIVACION_ACTION_ORDER = {
  HISTORIAL: 20,
  RECEPCIONAR: 10,
  RECHAZAR: 15,
  RESPONDER: 25,
  LEGALIZACION: 28,
  DERIVAR: 30,
  ARCHIVAR: 40,
  TRANSFERIR_BAJA: 50,
  EDITAR: 55,
  ELIMINAR: 60,
} as const

function agregarAccion(
  items: ActionMenuItem[],
  item: ActionMenuItem,
  motivoDeshabilitado?: string,
) {
  const enriquecido = enriquecerItemMenuAcciones(item, motivoDeshabilitado)
  items.push({ ...enriquecido, order: item.order })
}

export function getAccionesDerivacionBandeja(ctx: DerivacionActionContext): DropdownMenuItem[] {
  const items: ActionMenuItem[] = []

  agregarAccion(
    items,
    {
      label: 'Historial de estados',
      icon: 'i-lucide-history',
      disabled: !ctx.tieneDocumento,
      order: DERIVACION_ACTION_ORDER.HISTORIAL,
      onSelect: ctx.onHistorial,
    },
    !ctx.tieneDocumento ? 'No hay documento asociado a esta fila.' : undefined,
  )

  if (ctx.modo === 'ingreso') {
    if (ctx.permiteRecepcionar) {
      agregarAccion(items, {
        label: 'Recepcionar',
        icon: 'i-lucide-inbox',
        order: DERIVACION_ACTION_ORDER.RECEPCIONAR,
        onSelect: ctx.onRecepcionar,
      })
    }

    if (ctx.permiteRechazar) {
      agregarAccion(items, {
        label: 'Rechazar',
        icon: 'i-lucide-ban',
        class: 'text-error',
        order: DERIVACION_ACTION_ORDER.RECHAZAR,
        onSelect: ctx.onRechazar,
      })
    }

    if (ctx.permiteAsociar) {
      agregarAccion(
        items,
        {
          label: 'Asociar / responder correspondencia',
          icon: 'i-lucide-reply',
          disabled: !ctx.tieneHojaRuta,
          order: DERIVACION_ACTION_ORDER.RESPONDER,
          onSelect: ctx.onResponderCorrespondencia,
        },
        !ctx.tieneHojaRuta
          ? 'El documento no tiene Hoja de Ruta. No se puede registrar una respuesta asociada.'
          : undefined,
      )
    }

    if (ctx.requiereLegalizacion && ctx.onLegalizacion) {
      agregarAccion(items, {
        label: 'Registrar legalización',
        icon: 'i-lucide-stamp',
        order: DERIVACION_ACTION_ORDER.LEGALIZACION,
        onSelect: ctx.onLegalizacion,
      })
    }

    if (ctx.permiteDerivar) {
      agregarAccion(
        items,
        {
          label: 'Derivar',
          icon: 'i-lucide-share-2',
          disabled: !ctx.puedeDerivarCorresp,
          order: DERIVACION_ACTION_ORDER.DERIVAR,
          onSelect: ctx.onDerivar,
        },
        !ctx.puedeDerivarCorresp
          ? ctx.mensajeNoDerivar || 'No se puede derivar esta correspondencia.'
          : undefined,
      )
    }

    if (ctx.permiteArchivar) {
      agregarAccion(items, {
        label: 'Archivar',
        icon: 'i-lucide-archive',
        order: DERIVACION_ACTION_ORDER.ARCHIVAR,
        onSelect: ctx.onArchivar,
      })
    }

    if (ctx.puedeTransferirPorBaja && !ctx.yaTransferidoBaja) {
      agregarAccion(items, {
        label: 'Transferir por baja',
        icon: 'i-lucide-user-minus',
        class: 'text-error',
        order: DERIVACION_ACTION_ORDER.TRANSFERIR_BAJA,
        onSelect: ctx.onTransferirBaja,
      })
    }
  }

  if (ctx.modo === 'salida') {
    if (ctx.permiteEditar) {
      agregarAccion(items, {
        label: 'Editar derivación',
        icon: 'i-lucide-pencil',
        order: DERIVACION_ACTION_ORDER.EDITAR,
        onSelect: ctx.onEditar,
      })
    }

    if (ctx.permiteEliminar) {
      agregarAccion(items, {
        label: 'Eliminar derivación',
        icon: 'i-lucide-trash-2',
        class: 'text-error',
        order: DERIVACION_ACTION_ORDER.ELIMINAR,
        onSelect: ctx.onEliminar,
      })
    }
  }

  return items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
}
