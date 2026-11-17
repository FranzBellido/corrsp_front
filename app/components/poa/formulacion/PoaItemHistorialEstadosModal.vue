<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { PoaItemHistorialEstadoResponse } from '~/types/poa/formulacion'
import type { RespuestaApi } from '~/types/shared/respuestas'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  itemId: string | null
  /** Recurso API sin barra final, p. ej. acp-resultados o poa-operaciones-admin */
  apiResource: string | null
  tituloModal?: string
}>()

const open = defineModel<boolean>('open', { default: false })

const loading = ref(false)
const datos = ref<PoaItemHistorialEstadoResponse | null>(null)

const descripcion = computed(() => {
  const t = datos.value?.item?.titulo
  return t ? t.slice(0, 160) + (t.length > 160 ? '…' : '') : 'Registro de cambios de estado'
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
  if (!props.itemId || !props.apiResource) return
  loading.value = true
  datos.value = null
  try {
    const res = await backendService.get<PoaItemHistorialEstadoResponse>(
      `${props.apiResource}/${props.itemId}/historial-estado`,
    )
    datos.value =
      (res as RespuestaApi<PoaItemHistorialEstadoResponse>)?.data ??
      (res as PoaItemHistorialEstadoResponse)
  } catch {
    datos.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.itemId, props.apiResource] as const,
  ([isOpen, id, api]) => {
    if (isOpen && id && api) cargar()
    if (!isOpen) datos.value = null
  },
)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="tituloModal || 'Historial de estados'"
    :description="descripcion"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <USkeleton v-if="loading" class="h-48 w-full rounded-md" />

      <div v-else-if="datos?.item" class="space-y-3">
        <div class="flex items-center gap-2 text-sm flex-wrap">
          <span class="text-muted">Estado actual:</span>
          <PoaEstadoBadge :estado="datos.item.estado_actual" size="sm" />
        </div>

        <ul
          v-if="datos.historial_estado?.length"
          class="space-y-3 max-h-[min(24rem,60vh)] overflow-y-auto pr-1"
        >
          <li
            v-for="row in datos.historial_estado"
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