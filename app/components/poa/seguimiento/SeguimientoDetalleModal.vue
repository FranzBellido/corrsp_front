<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SeguimientoDetalleResponse } from '~/types/poa/seguimiento-actividad'
import { backendService } from '~/services/backend.service'

const props = withDefaults(
  defineProps<{
    seguimientoId: string | null
    apiResource?: string
  }>(),
  { apiResource: 'seguimiento' },
)

const open = defineModel<boolean>('open', { default: false })

const loading = ref(false)
const detalle = ref<SeguimientoDetalleResponse | null>(null)

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
  if (!props.seguimientoId) return
  loading.value = true
  try {
    const res = await backendService.getById<SeguimientoDetalleResponse>(
      props.apiResource,
      props.seguimientoId,
    )
    detalle.value = ((res as { data?: SeguimientoDetalleResponse })?.data ||
      res) as SeguimientoDetalleResponse
  } catch {
    detalle.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.seguimientoId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      void cargar()
    } else if (!isOpen) {
      detalle.value = null
    }
  },
)
</script>

<template>
  <UModal
    v-model:open="open"
    title="Detalle del seguimiento"
    description="Informe trimestral, área y historial de cambios de estado."
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <USkeleton v-if="loading" class="h-40 w-full rounded-md" />

      <div v-else-if="detalle?.seguimiento" class="space-y-6 text-sm">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <div class="sm:col-span-2">
            <dt class="text-xs text-muted">Nombre</dt>
            <dd class="font-medium">{{ detalle.seguimiento.nombre }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Gestión</dt>
            <dd class="font-medium">
              {{
                detalle.seguimiento.poa_formulacion?.poa_version?.gestion
                  ?? detalle.seguimiento.poa_formulacion?.version_id
                  ?? '—'
              }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Trimestre</dt>
            <dd class="font-medium">T{{ detalle.seguimiento.trimestre }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Estado</dt>
            <dd>
              <PoaEstadoBadge :estado="detalle.seguimiento.poa_estado" size="sm" />
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Área</dt>
            <dd class="font-medium">
              {{ detalle.seguimiento.poa_formulacion?.areas?.nombre || '—' }}
              <span
                v-if="detalle.seguimiento.poa_formulacion?.areas?.codigo"
                class="text-muted text-xs font-mono"
              >
                [{{ detalle.seguimiento.poa_formulacion.areas.codigo }}]
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Formulación</dt>
            <dd class="font-medium line-clamp-2">
              {{ detalle.seguimiento.poa_formulacion?.nombre || '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Fecha de envío</dt>
            <dd class="font-medium">{{ formatFecha(detalle.seguimiento.f_envio) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Última actualización</dt>
            <dd class="font-medium">{{ formatFecha(detalle.seguimiento.updated_at) }}</dd>
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
              <div class="mt-0.5">
                <PoaEstadoBadge
                  :estado="row.poa_estado"
                  :nombre="row.poa_estado?.nombre || `Estado #${row.estado_id ?? '—'}`"
                />
              </div>
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
        description="No se pudo cargar el detalle del seguimiento."
      />
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton label="Cerrar" color="neutral" variant="ghost" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
