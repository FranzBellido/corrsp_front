<script setup lang="ts">
import { ref, watch } from 'vue'
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
    if (isOpen && id) {
      cargar()
    } else if (!isOpen) {
      detalle.value = null
    }
  },
)
</script>

<template>
  <UModal
    v-model:open="open"
    title="Detalle de la formulación"
    description="Datos de la formulación POA de su área e historial de cambios de estado."
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <USkeleton v-if="loading" class="h-40 w-full rounded-md" />

      <div v-else-if="detalle?.formulacion" class="space-y-6 text-sm">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <div class="sm:col-span-2">
            <dt class="text-xs text-muted">Nombre</dt>
            <dd class="font-medium">{{ detalle.formulacion.nombre }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Gestión</dt>
            <dd class="font-medium">
              {{ detalle.formulacion.poa_version?.gestion ?? detalle.formulacion.version_id }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Estado</dt>
            <dd class="font-medium">{{ detalle.formulacion.poa_estado?.nombre || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Área</dt>
            <dd class="font-medium">
              {{ detalle.formulacion.areas?.nombre || '—' }}
              <span v-if="detalle.formulacion.areas?.codigo" class="text-muted text-xs font-mono">
                [{{ detalle.formulacion.areas.codigo }}]
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Creado</dt>
            <dd class="font-medium">{{ formatFecha(detalle.formulacion.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Última actualización</dt>
            <dd class="font-medium">{{ formatFecha(detalle.formulacion.updated_at) }}</dd>
          </div>
        </dl>

        <div class="border-t border-default pt-4 space-y-2">
          <p class="text-sm font-medium">Historial de estado</p>
          <ul
            v-if="detalle.historial_estado?.length"
            class="space-y-3 max-h-56 overflow-y-auto pr-1"
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
              <p class="font-medium text-sm mt-0.5">
                {{ row.poa_estado?.nombre || `Estado #${row.estado_id ?? '—'}` }}
              </p>
              <p class="text-default mt-1 whitespace-pre-wrap">{{ row.observaciones }}</p>
            </li>
          </ul>
          <p v-else class="text-muted text-xs">Sin registros en poa_estado_log.</p>
        </div>
      </div>

      <UAlert
        v-else
        color="warning"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Sin datos"
        description="No se pudo cargar el detalle de la formulación."
      />
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton label="Cerrar" color="neutral" variant="ghost" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>