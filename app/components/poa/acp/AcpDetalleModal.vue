<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Acp } from '~/types/poa/acp'
import type { RespuestaApi } from '~/types/shared/respuestas'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  acpId?: string | null
}>()

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const loading = ref(false)
const detalle = ref<Acp | null>(null)

const titulo = computed(() => {
  if (!detalle.value) return 'Detalle del ACP'
  return `ACP Nº ${detalle.value.numero} — Gestión ${detalle.value.version_id}`
})

const cargar = async (id: string) => {
  loading.value = true
  detalle.value = null
  try {
    const res = await backendService.getById<Acp>('acp', id)
    const data = (res as RespuestaApi<Acp>)?.data ?? (res as Acp)
    detalle.value = data
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo cargar el detalle',
      description: err?.data?.message || err?.message || 'Error al consultar el ACP.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    open.value = false
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.acpId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) cargar(id)
    if (!isOpen) detalle.value = null
  },
)

const formatoArea = (codigo: string | undefined, nombre: string) => {
  const c = codigo?.trim()
  return c ? `${nombre} [${c}]` : nombre
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="titulo"
    :description="detalle?.descripcion?.slice(0, 160) || 'Acción de corto plazo'"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="size-8 text-primary animate-spin" />
      </div>

      <div v-else-if="detalle" class="space-y-6">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt class="text-xs text-muted font-medium">Ponderación</dt>
            <dd class="font-semibold">{{ detalle.ponderacion }}%</dd>
          </div>
          <div v-if="detalle.aei">
            <dt class="text-xs text-muted font-medium">AEI</dt>
            <dd>
              <span class="font-mono text-xs text-muted">Nº {{ detalle.aei.numero }}</span>
              <span class="block text-sm line-clamp-2">{{ detalle.aei.descripcion }}</span>
            </dd>
          </div>
        </dl>

        <div class="space-y-2">
          <p class="text-sm font-semibold">Áreas asignadas al ACP</p>
          <div v-if="detalle.areas?.length" class="flex flex-wrap gap-2">
            <UBadge
              v-for="area in detalle.areas"
              :key="area.id"
              color="neutral"
              variant="subtle"
              class="font-normal"
            >
              {{ formatoArea(area.codigo, area.nombre) }}
            </UBadge>
          </div>
          <p v-else class="text-sm text-muted">Sin áreas asignadas.</p>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-semibold">
            Resultados
            <span class="text-muted font-normal">({{ detalle.resultados?.length ?? 0 }})</span>
          </p>
          <div
            v-if="detalle.resultados?.length"
            class="rounded-lg border border-default overflow-hidden"
          >
            <table class="min-w-full text-sm">
              <thead class="bg-elevated/50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th class="text-start py-2 px-3 w-12">Nº</th>
                  <th class="text-start py-2 px-3">Nombre</th>
                  <th class="text-start py-2 px-3 w-20">Pond.</th>
                  <th class="text-start py-2 px-3 w-28">Estado</th>
                  <th class="text-start py-2 px-3">Área (formulación)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="r in detalle.resultados" :key="r.id">
                  <td class="py-2 px-3 font-mono text-xs">{{ r.numero }}</td>
                  <td class="py-2 px-3">
                    <span class="font-medium line-clamp-2">{{ r.nombre }}</span>
                    <span
                      v-if="r.formulacion_nombre"
                      class="block text-[11px] text-muted line-clamp-1"
                    >
                      {{ r.formulacion_nombre }}
                    </span>
                  </td>
                  <td class="py-2 px-3">{{ r.ponderacion }}%</td>
                  <td class="py-2 px-3">
                    <PoaEstadoBadge
                      :estado="r.estado"
                      :nombre="r.estado_nombre"
                    />
                  </td>
                  <td class="py-2 px-3 text-xs">
                    <template v-if="r.area">
                      {{ formatoArea(r.area.codigo, r.area.nombre) }}
                    </template>
                    <span v-else class="text-muted">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm text-muted">Este ACP no tiene resultados registrados.</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton label="Cerrar" color="neutral" variant="ghost" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>