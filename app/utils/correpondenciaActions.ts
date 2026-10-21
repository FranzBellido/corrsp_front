// ~/utils/correspondenceActions.ts
import type { DropdownMenuItem } from '@nuxt/ui'

// Extendemos la interfaz propia del ítem del menú agregando 'order'
export interface ActionMenuItem extends DropdownMenuItem {
  order?: number
}

export interface ActionContext {
  modo: 'borrador' | 'archivo' | 'compartidos'
  tieneDocumento: boolean
  tienePlantilla: boolean
  tieneCite: boolean
  esSoloLectura: boolean
  esCompartidoEnviado: boolean
  compartidosCount: number
  isBusyGenerar: boolean
  isBusyEditor: boolean
  onEditarDoc: () => void
  onGenerarDoc: () => void
  onAdjuntos: () => void
  onDerivar: () => void
  onCompartir: () => void
  onEditarInfo: () => void
  onEliminar: () => void
}

/**
 * Mapa global de prioridades/orden por defecto.
 * Números menores aparecen primero en el menú.
 */
export const ACTION_ORDER = {
  DOCUMENTO: 10,   // Generar / Editar Documento OnlyOffice
  DERIVAR: 20,     // Derivar a otra área/persona
  COMPARTIR: 30,   // Compartir acceso
  ADJUNTOS: 40,    // Ver / Subir adjuntos
  EDITAR_INFO: 50, // Editar metadatos/información del formulario
  ELIMINAR: 90,    // Eliminar (acciones destructivas al final)
} as const

export function getAccionesBandeja(ctx: ActionContext): ActionMenuItem[] {
  const items: ActionMenuItem[] = []

  if (ctx.modo === 'borrador') {
    // 1. Acción de Documento
    const docLabel = ctx.isBusyGenerar
      ? 'Generando documento…'
      : ctx.isBusyEditor
        ? 'Abriendo editor…'
        : ctx.tieneDocumento
          ? 'Editar contenido del documento'
          : 'Generar documento'

    items.push({
      label: docLabel,
      icon: ctx.tieneDocumento ? 'i-lucide-file-pen-line' : 'i-lucide-file-output',
      disabled: (!ctx.tieneDocumento && !ctx.tienePlantilla) || ctx.isBusyGenerar || ctx.isBusyEditor,
      order: ACTION_ORDER.DOCUMENTO,
      onSelect: () => {
        if (ctx.tieneDocumento) ctx.onEditarDoc()
        else ctx.onGenerarDoc()
      },
    })

    // 2. Derivar correspondencia
    items.push({
      label: 'Derivar correspondencia',
      icon: 'i-lucide-send',
      order: ACTION_ORDER.DERIVAR,
      onSelect: ctx.onDerivar,
    })

    // 3. Compartir documento
    items.push({
      label: ctx.compartidosCount > 0 
        ? `Compartir (${ctx.compartidosCount} usuario${ctx.compartidosCount === 1 ? '' : 's'})` 
        : 'Compartir documento',
      icon: 'i-lucide-share-2',
      order: ACTION_ORDER.COMPARTIR,
      onSelect: ctx.onCompartir,
    })

    // 4. Ver / Gestionar Adjuntos
    items.push({
      label: 'Adjuntos',
      icon: 'i-lucide-paperclip',
      order: ACTION_ORDER.ADJUNTOS,
      onSelect: ctx.onAdjuntos,
    })

    // 5. Editar información básica
    items.push({
      label: 'Editar',
      icon: 'i-lucide-pencil',
      order: ACTION_ORDER.EDITAR_INFO,
      onSelect: ctx.onEditarInfo,
    })

    // 6. Eliminar (Acción destructiva)
    if (!ctx.tieneCite) {
      items.push({
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        class: 'text-error',
        order: ACTION_ORDER.ELIMINAR,
        onSelect: ctx.onEliminar,
      })
    }
  } else if (ctx.modo === 'compartidos') {
    if (ctx.esCompartidoEnviado) {
      items.push({
        label:
          ctx.compartidosCount > 0
            ? `Gestionar compartidos (${ctx.compartidosCount})`
            : 'Compartir documento',
        icon: 'i-lucide-share-2',
        order: ACTION_ORDER.COMPARTIR,
        onSelect: ctx.onCompartir,
      })

      if (ctx.tieneDocumento) {
        items.push({
          label: ctx.isBusyEditor ? 'Abriendo editor…' : 'Editar contenido del documento',
          icon: 'i-lucide-file-pen-line',
          disabled: ctx.isBusyEditor,
          order: ACTION_ORDER.DOCUMENTO,
          onSelect: ctx.onEditarDoc,
        })
      }
    } else if (ctx.tieneDocumento) {
      items.push({
        label: ctx.isBusyEditor
          ? 'Abriendo documento…'
          : ctx.esSoloLectura
            ? 'Ver contenido del documento (solo lectura)'
            : 'Editar contenido del documento',
        icon: ctx.esSoloLectura ? 'i-lucide-file-text' : 'i-lucide-file-pen-line',
        disabled: ctx.isBusyEditor,
        order: ACTION_ORDER.DOCUMENTO,
        onSelect: ctx.onEditarDoc,
      })
    }
  } else if (ctx.modo === 'archivo') {
    items.push({
      label: 'Editar',
      icon: 'i-lucide-pencil',
      order: ACTION_ORDER.EDITAR_INFO,
      onSelect: ctx.onEditarInfo,
    })

    if (!ctx.tieneCite) {
      items.push({
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        class: 'text-error',
        order: ACTION_ORDER.ELIMINAR,
        onSelect: ctx.onEliminar,
      })
    }
  }

  // Ordenamos automáticamente los ítems por la propiedad 'order' antes de devolverlos
  return items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
}