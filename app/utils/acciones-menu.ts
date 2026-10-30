import type { DropdownMenuItem } from '@nuxt/ui'
import type { Component, VNode } from 'vue'

type ComponentLike = Component | string
import { h } from 'vue'

const CLASE_HABILITADO = 'text-highlighted font-medium'
const CLASE_DESHABILITADO = 'opacity-40 cursor-not-allowed text-muted'

/**
 * Muestra el motivo en description/tooltip y refuerza el contraste habilitado vs deshabilitado.
 */
export function enriquecerItemMenuAcciones(
  item: DropdownMenuItem,
  motivoDeshabilitado?: string,
): DropdownMenuItem {
  if (!item.disabled) {
    return {
      ...item,
      class: [item.class, CLASE_HABILITADO].filter(Boolean).join(' '),
    }
  }

  const motivo =
    motivoDeshabilitado?.trim() ||
    'Esta acción no está disponible en el estado actual del registro.'

  return {
    ...item,
    description: motivo,
    title: motivo,
    class: [item.class, CLASE_DESHABILITADO].filter(Boolean).join(' '),
  }
}

/** Meta TanStack para columna ⋮ (ancho mínimo, contenido al borde derecho). */
export const META_COLUMNA_ACCIONES_TABLA = {
  class: {
    th: 'w-0 px-2! text-right',
    td: 'w-0 px-2! whitespace-nowrap align-middle text-right',
  },
}

export const CLASE_CONTENEDOR_ACCIONES_CELDA =
  'flex w-full min-w-0 items-center justify-end gap-0'

export const CONTENT_DROPDOWN_ACCIONES_TABLA = {
  align: 'end' as const,
  side: 'bottom' as const,
  collisionPadding: 8,
  class: 'min-w-[14rem] max-w-sm',
}

export interface MenuAccionesTablaOptions {
  onOpenChange?: (open: boolean) => void
  loading?: boolean
}

/** Menú ⋮ en celda de tabla (solo el botón en el DOM; ítems en portal). */
export function hMenuAccionesTabla(
  UDropdownMenu: ComponentLike,
  UButton: ComponentLike,
  children: DropdownMenuItem[],
  options?: MenuAccionesTablaOptions,
): VNode {
  const menuItems = options?.loading
    ? [[{ label: 'Cargando acciones…', disabled: true, icon: 'i-lucide-loader-circle' }]]
    : children.length
      ? [children]
      : [[{ label: 'Sin acciones disponibles', disabled: true }]]

  return h(
    UDropdownMenu,
    {
      items: menuItems,
      content: CONTENT_DROPDOWN_ACCIONES_TABLA,
      'onUpdate:open': options?.onOpenChange,
    },
    () =>
      h(UButton, {
        icon: 'i-lucide-ellipsis-vertical',
        color: 'neutral',
        variant: 'ghost',
        size: 'xs',
        class: 'shrink-0',
        title: 'Acciones',
        loading: options?.loading,
        disabled: options?.loading,
      }),
  )
}
