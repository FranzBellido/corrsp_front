<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { TabsItem } from '@nuxt/ui'
import type { CorrespondenciaDetalle, Derivacion } from '~/types/derivacion'
import type { RespuestaApi } from '~/types/respuestas'
import { backendService } from '~/services/backend.service'
import { etiquetaNumeroCorrespondencia } from '~/utils/correspondencia'

const props = defineProps<{
  correspondenciaId?: string | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'leido'): void
}>()

const toast = useToast()
const loading = ref(false)
const detalle = ref<CorrespondenciaDetalle | null>(null)
const activeTab = ref('info')

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

const cargarDetalle = async (id: string) => {
  loading.value = true
  detalle.value = null
  try {
    const res = await backendService.get<CorrespondenciaDetalle>(`derivaciones/detalle/${id}`)
    const data = (res as RespuestaApi<CorrespondenciaDetalle>)?.data ?? (res as CorrespondenciaDetalle)
    detalle.value = data
    if (data.marcado_leido) {
      emit('leido')
    }
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo cargar el detalle',
      description: err?.data?.message || err?.message || 'Error al consultar la correspondencia.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    open.value = false
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.correspondenciaId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      activeTab.value = 'info'
      cargarDetalle(id)
    }
    if (!isOpen) {
      detalle.value = null
      activeTab.value = 'info'
    }
  },
)

const etiquetaDerivacion = (d: Derivacion) =>
  d.nombre || d.codificador?.nombre || 'Derivación'

const totalDerivaciones = computed(() => detalle.value?.derivaciones?.length ?? 0)

const tabItems = computed<TabsItem[]>(() => [
  {
    label: 'Información',
    icon: 'i-lucide-file-text',
    value: 'info',
    slot: 'info',
  },
  {
    label: 'Adjuntos',
    icon: 'i-lucide-paperclip',
    value: 'adjuntos',
    slot: 'adjuntos',
  },
  {
    label: 'Derivaciones',
    icon: 'i-lucide-git-branch',
    value: 'derivaciones',
    slot: 'derivaciones',
    badge: totalDerivaciones.value > 0 ? totalDerivaciones.value : undefined,
  },
])
</script>

<template>
  <UModal
    v-model:open="open"
    title="Detalle de correspondencia"
    description="Consulte datos del documento, adjuntos e historial de derivaciones."
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-3">
        <UIcon name="i-lucide-loader-circle" class="size-8 text-primary animate-spin" />
        <p class="text-sm text-muted">Cargando detalle...</p>
      </div>

      <div v-else-if="detalle" class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3 pb-1 border-b border-default">
          <div class="min-w-0">
            <p class="text-xs font-mono text-muted">
              {{ etiquetaNumeroCorrespondencia(detalle) }}
              <span v-if="detalle.hoja_ruta">
                · HR {{ detalle.hoja_ruta.numero }}/{{ detalle.hoja_ruta.anio }}
              </span>
            </p>
            <h3 class="text-base font-bold text-highlighted mt-1 leading-snug">
              {{ detalle.referencia }}
            </h3>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-if="detalle.estado"
              :color="detalle.estado.nombre?.toLowerCase().includes('borrador') ? 'neutral' : 'primary'"
              variant="subtle"
              size="xs"
            >
              {{ detalle.estado.nombre }}
            </UBadge>
            <UBadge
              v-if="detalle.confidencial"
              color="warning"
              variant="subtle"
              size="xs"
            >
              Confidencial
            </UBadge>
          </div>
        </div>

        <UTabs
          v-model="activeTab"
          :items="tabItems"
          variant="link"
          color="primary"
          class="w-full"
          :ui="{ list: 'border-b border-default' }"
        >
          <template #info>
            <div class="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div class="p-3 rounded-xl bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Proceso</p>
                <p class="text-default">{{ detalle.proceso?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Prioridad</p>
                <p class="text-default">{{ detalle.codificador?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Área origen</p>
                <p class="text-default">{{ detalle.areas?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Cargo origen</p>
                <p class="text-default">{{ detalle.cargo_origen?.nombre || detalle.cargos?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Remitente</p>
                <p class="text-default">{{ detalle.cargos?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Destinatario (doc.)</p>
                <p class="text-default">{{ detalle.cargo_destinatario?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Fecha emisión</p>
                <p class="text-default">{{ formatFecha(detalle.fecha_emision) }}</p>
              </div>
              <div class="p-3 rounded-xl bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Fecha plazo</p>
                <p class="text-default">{{ formatFecha(detalle.fecha_plazo) }}</p>
              </div>
              <div
                v-if="detalle.cite_origen"
                class="p-3 rounded-xl bg-elevated/50 border border-default sm:col-span-2"
              >
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">CITE origen</p>
                <p class="font-mono text-xs text-default">{{ detalle.cite_origen }}</p>
              </div>
            </div>
          </template>

          <template #adjuntos>
            <div class="pt-4">
              <CorrespondenciaAdjuntosPanel
                :correspondencia-id="detalle.id"
                :correspondencia="detalle"
                :solo-lectura="true"
                :active="activeTab === 'adjuntos'"
              />
            </div>
          </template>

          <template #derivaciones>
            <div class="pt-4">
              <div v-if="detalle.derivaciones?.length" class="space-y-2 max-h-[min(22rem,50vh)] overflow-y-auto pr-1">
                <div
                  v-for="d in detalle.derivaciones"
                  :key="d.id"
                  class="p-3 rounded-xl border border-default bg-default/50"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-sm font-semibold truncate text-highlighted">{{ etiquetaDerivacion(d) }}</p>
                      <p class="text-xs text-muted mt-0.5">
                        {{ d.codificador?.nombre || 'Instrucción' }} · {{ formatFecha(d.fecha_envio) }}
                      </p>
                    </div>
                    <UBadge
                      :color="d.leido ? 'success' : 'warning'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ d.leido ? 'Leído' : 'No leído' }}
                    </UBadge>
                  </div>
                  <p class="text-xs mt-2 text-default whitespace-pre-wrap">
                    {{ d.instruccion }}
                  </p>
                  <div
                    v-if="d.destinatarios_copia?.length"
                    class="mt-2 flex flex-wrap gap-1"
                  >
                    <UBadge
                      v-for="cc in d.destinatarios_copia"
                      :key="cc.id"
                      color="neutral"
                      variant="outline"
                      size="xs"
                    >
                      CC: {{ cc.nombre || cc.cargos?.nombre || '—' }}
                      <span class="opacity-70">({{ cc.leido ? 'leído' : 'pendiente' }})</span>
                    </UBadge>
                  </div>
                </div>
              </div>
              <div v-else class="py-10 text-center">
                <UIcon name="i-lucide-git-branch" class="size-10 text-dimmed mx-auto mb-2" />
                <p class="text-sm text-muted">Sin derivaciones registradas.</p>
              </div>
            </div>
          </template>
        </UTabs>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton label="Cerrar" color="neutral" variant="outline" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
