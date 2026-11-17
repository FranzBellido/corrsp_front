<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { PoaFormulacionDetalleResponse } from '~/types/poa/formulacion'
import { backendService } from '~/services/backend.service'

const props = withDefaults(
  defineProps<{
    formulacionId: string | null
    apiResource?: string
  }>(),
  { apiResource: 'poa-formulacion' },
)

const open = defineModel<boolean>('open', { default: false })

const loading = ref(false)
const detalle = ref<PoaFormulacionDetalleResponse | null>(null)

const subtitulo = computed(() => {
  const f = detalle.value?.formulacion
  if (!f) return 'Cambios registrados en poa_estado_log.'
  const gestion = f.poa_version?.gestion ?? f.version_id
  const area = f.areas?.nombre
  return [f.nombre, area ? `· ${area}` : '', `· Gestión ${gestion}`]
    .filter(Boolean)
    .join(' ')
})

const formatFecha = (value?: string | null) => {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

const cargar = async () => {
  if (!props.formulacionId) return
  loading.value = true
  try {
    const res = await backendService.getById<PoaFormulacionDetalleResponse>(
      props.apiResource,
      props.formulacionId,
    )
    detalle.value = ((res as { data?: PoaFormulacionDetalleResponse })?.data ||
      res) as PoaFormulacionDetalleResponse
  } catch {
    detalle.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.formulacionId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) cargar()
    if (!isOpen) detalle.value = null
  },
)
</script>

<template>
  <UModal
    v-model:open="open"
    title="Historial de estados"
    :description="subtitulo"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <USkeleton v-if="loading" class="h-48 w-full rounded-md" />

      <div v-else-if="detalle?.formulacion" class="space-y-3">
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted">Estado actual:</span>
          <PoaEstadoBadge :estado="detalle.formulacion.poa_estado" size="sm" />
        </div>

        <ul
          v-if="detalle.historial_estado?.length"
          class="space-y-3 max-h-[min(24rem,60vh)] overflow-y-auto pr-1"
        >
          <li
            v-for="row in detalle.historial_estado"
            :key="row.id"
            class="rounded-md border border-default p-3 bg-elevated/30"
          >
            <p class="text-xs text-muted">
              {{ formatFecha(row.created_at) }}
              <span v-if="row.nombre"> · {{ row.nombre }}</span>
            </p>
            <div class="mt-0.5">
              <PoaEstadoBadge
                :estado="row.poa_estado"
                :nombre="row.poa_estado?.nombre || `Estado #${row.estado_id ?? '—'}`"
              />
            </div>
            <p class="text-default mt-1 text-sm whitespace-pre-wrap">{{ row.observaciones }}</p>
          </li>
        </ul>
        <p v-else class="text-muted text-sm">Sin registros en el historial.</p>
      </div>

      <UAlert
        v-else
        color="warning"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Sin datos"
        description="No se pudo cargar el historial."
      />
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton label="Cerrar" color="neutral" variant="ghost" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>