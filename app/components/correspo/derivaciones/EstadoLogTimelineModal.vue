<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { TimelineItem } from '@nuxt/ui'
import type { EstadoLogItem } from '~/types/estado'
import { EstadoDerivacionEnum } from '~/types/estado'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  documentoId: string | null
}>()

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const loading = ref(false)
const items = ref<EstadoLogItem[]>([])

const formatFecha = (valor?: string | null) => {
  if (!valor) return '—'
  try {
    return new Date(valor).toLocaleString('es-BO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return valor
  }
}

const iconForEstado = (estadoId?: number | null) => {
  switch (estadoId) {
    case EstadoDerivacionEnum.PENDIENTE:
      return 'i-lucide-send'
    case EstadoDerivacionEnum.RECEPCIONADO:
      return 'i-lucide-inbox'
    case EstadoDerivacionEnum.ARCHIVADO:
      return 'i-lucide-archive'
    case EstadoDerivacionEnum.TRANSFERIDO_BAJA:
      return 'i-lucide-user-minus'
    case EstadoDerivacionEnum.RECHAZADO:
      return 'i-lucide-ban'
    default:
      return 'i-lucide-circle-dot'
  }
}

const timelineItems = computed<TimelineItem[]>(() =>
  items.value.map((log, index) => ({
    value: log.id || String(index),
    date: formatFecha(log.created_at),
    title: log.estado?.nombre || `Estado #${log.estado_id ?? '—'}`,
    description: [log.observaciones, log.nombre ? `Por: ${log.nombre}` : null]
      .filter(Boolean)
      .join(' · '),
    icon: iconForEstado(log.estado_id ?? log.estado?.id),
  })),
)

const fetchLog = async () => {
  if (!props.documentoId) {
    items.value = []
    return
  }
  loading.value = true
  try {
    const res = await backendService.getById<EstadoLogItem[]>(
      'derivaciones/estado-log',
      props.documentoId,
    )
    const data = ((res as { data?: EstadoLogItem[] })?.data || res) as EstadoLogItem[]
    items.value = Array.isArray(data) ? data : []
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'Error al cargar historial',
      description: err?.data?.message || err?.message || 'No se pudo obtener el log de estados.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.documentoId] as const,
  ([isOpen]) => {
    if (isOpen) fetchLog()
  },
)
</script>

<template>
  <UModal
    v-model:open="open"
    title="Historial de estados"
    description="Cambios de estado registrados sobre esta correspondencia."
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
      </div>

      <div v-else-if="timelineItems.length === 0" class="py-10 text-center text-sm text-muted">
        No hay cambios de estado registrados.
      </div>

      <UTimeline
        v-else
        :items="timelineItems"
        :default-value="timelineItems.length - 1"
        color="primary"
        class="w-full"
      />
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton label="Cerrar" color="neutral" variant="outline" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
