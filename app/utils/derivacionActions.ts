import type { DropdownMenuItem } from '@nuxt/ui'
import { enriquecerItemMenuAcciones } from '~/utils/acciones-menu'
import type { ActionMenuItem } from '~/utils/correpondenciaActions'

export type AccionDerivacionCodigo =
  | 'RECEPCIONAR'
  | 'RECHAZAR'
  | 'HISTORIAL'
  | 'ASOCIAR'
  | 'LEGALIZAR'
  | 'DERIVAR'
  | 'ARCHIVAR'
  | 'TRANSFERIR_BAJA'
  | 'EDITAR'
  | 'ELIMINAR'

export interface DerivacionActionContext {
  /** Códigos visibles según matriz del backend. */
  accionesDisponibles: string[]
  tieneDocumento: boolean
  puedeTransferirPorBaja: boolean
  yaTransferidoBaja: boolean
  puedeDerivarCorresp: boolean
  mensajeNoDerivar?: string
  tieneHojaRuta: boolean
  /** Si false, HISTORIAL no va en el menú ⋮ (p. ej. botón dedicado en ingreso/salida). */
  omitHistorialDelMenu?: boolean
  onHistorial?: () => void
  onRecepcionar: () => void
  onRechazar: () => void
  onDerivar: () => void
  onArchivar: () => void
  onTransferirBaja: () => void
  onEditar: () => void
  onEliminar: () => void
  onResponderCorrespondencia: () => void
  onLegalizacion?: () => void
}

/**
 * Catálogo UI local (handlers / labels / orden). La visibilidad la manda la API.
 */
export const CATALOGO_ACCIONES_DERIVACION: Record<
  AccionDerivacionCodigo,
  {
    label: string
    icon: string
    order: number
    class?: string
  }
> = {
  RECEPCIONAR: {
    label: 'Recepcionar',
    icon: 'i-lucide-inbox',
    order: 10,
  },
  RECHAZAR: {
    label: 'Rechazar',
    icon: 'i-lucide-ban',
    order: 15,
    class: 'text-error',
  },
  HISTORIAL: {
    label: 'Historial de estados',
    icon: 'i-lucide-history',
    order: 20,
  },
  ASOCIAR: {
    label: 'Asociar / responder correspondencia',
    icon: 'i-lucide-reply',
    order: 25,
  },
  LEGALIZAR: {
    label: 'Registrar legalización',
    icon: 'i-lucide-stamp',
    order: 28,
  },
  DERIVAR: {
    label: 'Derivar',
    icon: 'i-lucide-share-2',
    order: 30,
  },
  ARCHIVAR: {
    label: 'Archivar',
    icon: 'i-lucide-archive',
    order: 40,
  },
  TRANSFERIR_BAJA: {
    label: 'Transferir por baja',
    icon: 'i-lucide-user-minus',
    order: 50,
    class: 'text-error',
  },
  EDITAR: {
    label: 'Editar derivación',
    icon: 'i-lucide-pencil',
    order: 55,
  },
  ELIMINAR: {
    label: 'Eliminar derivación',
    icon: 'i-lucide-trash-2',
    order: 60,
    class: 'text-error',
  },
}

/** @deprecated Usar CATALOGO_ACCIONES_DERIVACION[].order */
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

function tieneAccion(disponibles: string[], codigo: AccionDerivacionCodigo): boolean {
  return disponibles.includes(codigo)
}

export function getAccionesDerivacionBandeja(ctx: DerivacionActionContext): DropdownMenuItem[] {
  const items: ActionMenuItem[] = []
  const disponibles = ctx.accionesDisponibles ?? []

  if (tieneAccion(disponibles, 'RECEPCIONAR')) {
    const meta = CATALOGO_ACCIONES_DERIVACION.RECEPCIONAR
    agregarAccion(items, {
      label: meta.label,
      icon: meta.icon,
      order: meta.order,
      onSelect: ctx.onRecepcionar,
    })
  }

  if (tieneAccion(disponibles, 'RECHAZAR')) {
    const meta = CATALOGO_ACCIONES_DERIVACION.RECHAZAR
    agregarAccion(items, {
      label: meta.label,
      icon: meta.icon,
      class: meta.class,
      order: meta.order,
      onSelect: ctx.onRechazar,
    })
  }

  if (!ctx.omitHistorialDelMenu && tieneAccion(disponibles, 'HISTORIAL') && ctx.onHistorial) {
    const meta = CATALOGO_ACCIONES_DERIVACION.HISTORIAL
    agregarAccion(
      items,
      {
        label: meta.label,
        icon: meta.icon,
        disabled: !ctx.tieneDocumento,
        order: meta.order,
        onSelect: ctx.onHistorial,
      },
      !ctx.tieneDocumento ? 'No hay documento asociado a esta fila.' : undefined,
    )
  }

  if (tieneAccion(disponibles, 'ASOCIAR')) {
    const meta = CATALOGO_ACCIONES_DERIVACION.ASOCIAR
    agregarAccion(
      items,
      {
        label: meta.label,
        icon: meta.icon,
        disabled: !ctx.tieneHojaRuta,
        order: meta.order,
        onSelect: ctx.onResponderCorrespondencia,
      },
      !ctx.tieneHojaRuta
        ? 'El documento no tiene Hoja de Ruta. No se puede registrar una respuesta asociada.'
        : undefined,
    )
  }

  if (tieneAccion(disponibles, 'LEGALIZAR') && ctx.onLegalizacion) {
    const meta = CATALOGO_ACCIONES_DERIVACION.LEGALIZAR
    agregarAccion(items, {
      label: meta.label,
      icon: meta.icon,
      order: meta.order,
      onSelect: ctx.onLegalizacion,
    })
  }

  if (tieneAccion(disponibles, 'DERIVAR')) {
    const meta = CATALOGO_ACCIONES_DERIVACION.DERIVAR
    agregarAccion(
      items,
      {
        label: meta.label,
        icon: meta.icon,
        disabled: !ctx.puedeDerivarCorresp,
        order: meta.order,
        onSelect: ctx.onDerivar,
      },
      !ctx.puedeDerivarCorresp
        ? ctx.mensajeNoDerivar || 'No se puede derivar esta correspondencia.'
        : undefined,
    )
  }

  if (tieneAccion(disponibles, 'ARCHIVAR')) {
    const meta = CATALOGO_ACCIONES_DERIVACION.ARCHIVAR
    agregarAccion(items, {
      label: meta.label,
      icon: meta.icon,
      order: meta.order,
      onSelect: ctx.onArchivar,
    })
  }

  if (
    tieneAccion(disponibles, 'TRANSFERIR_BAJA') &&
    ctx.puedeTransferirPorBaja &&
    !ctx.yaTransferidoBaja
  ) {
    const meta = CATALOGO_ACCIONES_DERIVACION.TRANSFERIR_BAJA
    agregarAccion(items, {
      label: meta.label,
      icon: meta.icon,
      class: meta.class,
      order: meta.order,
      onSelect: ctx.onTransferirBaja,
    })
  }

  if (tieneAccion(disponibles, 'EDITAR')) {
    const meta = CATALOGO_ACCIONES_DERIVACION.EDITAR
    agregarAccion(items, {
      label: meta.label,
      icon: meta.icon,
      order: meta.order,
      onSelect: ctx.onEditar,
    })
  }

  if (tieneAccion(disponibles, 'ELIMINAR')) {
    const meta = CATALOGO_ACCIONES_DERIVACION.ELIMINAR
    agregarAccion(items, {
      label: meta.label,
      icon: meta.icon,
      class: meta.class,
      order: meta.order,
      onSelect: ctx.onEliminar,
    })
  }

  return items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
}
