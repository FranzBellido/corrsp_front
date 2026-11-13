<script setup lang="ts">
import { computed, h, resolveComponent } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Correspondencia } from '~/types/correspondencia'
import {
  observacionesPendientesCorrespondencia,
  textoTooltipObservacionesCorrespondencia,
} from '~/utils/correspondencia'
import {
  CLASE_CONTENEDOR_ACCIONES_CELDA,
  hMenuAccionesTabla,
} from '~/utils/acciones-menu'
import { getAccionesBandeja } from '~/utils/correpondenciaActions'
import CorAlertaDepositoPendiente from '~/components/correspondencia/CorAlertaDepositoPendiente.vue'

const props = defineProps<{
  correspondencia: Correspondencia
  modo: 'borrador' | 'archivo' | 'compartidos'
  generandoId?: string | null
  abriendoEditorId?: string | null
}>()

const emit = defineEmits<{
  (e: 'ver-detalle', c: Correspondencia): void
  (e: 'editar-doc', c: Correspondencia, soloLectura: boolean): void
  (e: 'generar-doc', c: Correspondencia): void
  (e: 'adjuntos', c: Correspondencia): void
  (e: 'derivar', c: Correspondencia): void
  (e: 'compartir', c: Correspondencia): void
  (e: 'editar-info', c: Correspondencia): void
  (e: 'eliminar', c: Correspondencia): void
}>()

const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UTooltip = resolveComponent('UTooltip')

const obtenerRutaDocumento = (c: Correspondencia): string =>
  (c.url_documento || c.contenido)?.trim() || ''

// Renderizado de Alerta de Pendientes (específico para borrador)
const renderAlertaPendientes = () => {
  if (props.modo !== 'borrador') return null
  const observaciones = observacionesPendientesCorrespondencia(props.correspondencia)
  if (!observaciones.length) return null

  return h(
    UTooltip,
    {
      text: textoTooltipObservacionesCorrespondencia(observaciones),
      content: { side: 'left', align: 'center' },
    },
    {
      default: () =>
        h(
          'span',
          {
            class: 'inline-flex size-7 items-center justify-center shrink-0',
            'aria-label': 'Pendientes antes de derivar',
          },
          [
            h(UIcon, {
              name: 'i-lucide-triangle-alert',
              class: 'size-4 text-warning',
            }),
          ],
        ),
    },
  )
}

// Generación de los ítems del menú usando nuestra utilidad centralizada
const menuItems = computed<DropdownMenuItem[]>(() => {
  const c = props.correspondencia
  const tienePlantilla = Boolean(c.proceso?.plantilla?.trim())
  const tieneDocumento = Boolean(obtenerRutaDocumento(c))
  const esSoloLectura = c.acceso_compartido?.solo_lectura ?? false
  const esCompartidoEnviado =
    props.modo === 'compartidos' && c.compartido_contexto === 'enviado'

  return getAccionesBandeja({
    modo: props.modo,
    flujoDefinido: Boolean(c.proceso?.flujo_definido),
    tieneDocumento,
    tienePlantilla,
    tieneDerivaciones: (c._count?.derivaciones ?? 0) > 0,
    esSoloLectura: esCompartidoEnviado ? false : esSoloLectura,
    esCompartidoEnviado,
    compartidosCount: c._count?.corresp_usuario || c.corresp_usuario?.length || 0,
    isBusyGenerar: props.generandoId === c.id,
    isBusyEditor: props.abriendoEditorId === c.id,
    onEditarDoc: () =>
      emit('editar-doc', c, esCompartidoEnviado ? false : esSoloLectura),
    onGenerarDoc: () => emit('generar-doc', c),
    onAdjuntos: () => emit('adjuntos', c),
    onDerivar: () => emit('derivar', c),
    onCompartir: () => emit('compartir', c),
    onEditarInfo: () => emit('editar-info', c),
    onEliminar: () => emit('eliminar', c),
  })
})
</script>

<template>
  <div :class="CLASE_CONTENEDOR_ACCIONES_CELDA">
    <UButton
      icon="i-lucide-eye"
      color="neutral"
      variant="ghost"
      size="xs"
      class="shrink-0"
      title="Ver detalle"
      @click="emit('ver-detalle', correspondencia)"
    />

    <!-- Alerta condicional -->
    <component :is="renderAlertaPendientes()" v-if="renderAlertaPendientes()" />

    <CorAlertaDepositoPendiente
      v-if="modo === 'archivo'"
      :correspondencia="correspondencia"
    />

    <!-- Menú desplegable encapsulado -->
    <component
      :is="hMenuAccionesTabla(UDropdownMenu, UButton, menuItems)"
    />
  </div>
</template>