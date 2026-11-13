<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AeiLookup, Acp, CreateAcpPayload, UpdateAcpPayload } from '~/types/poa/acp'
import type { PoaVersionLookup } from '~/types/poa/poa-version'
import type { CodificadorDto } from '~/types/comun/codificador'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  acp?: Acp | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const aeis = ref<AeiLookup[]>([])
const versiones = ref<PoaVersionLookup[]>([])
const areasCatalogo = ref<CodificadorDto[]>([])
const loadingCatalogos = ref(false)
const loadingDetalle = ref(false)
const selectedAreasIds = ref<string[]>([])

const schema = z.object({
  ponderacion: z
    .number({ invalid_type_error: 'La ponderación es obligatoria' })
    .int('La ponderación debe ser un número entero')
    .min(1, 'La ponderación debe ser mayor a 0')
    .max(100, 'La ponderación no puede superar 100'),
  descripcion: z.string().trim().min(1, 'La descripción es obligatoria').max(1000),
  aei_id: z.string().uuid('Seleccione un AEI'),
  version_id: z.number().int().min(2000),
})

type SchemaType = z.infer<typeof schema>

const form = ref<SchemaType>({
  ponderacion: 1,
  descripcion: '',
  aei_id: '',
  version_id: new Date().getFullYear(),
})

const numeroCorrelativo = ref<number | null>(null)

const isEditing = computed(() => !!props.acp?.id)

const aeiOptions = computed(() =>
  aeis.value.map((a) => ({
    label: `${a.numero}. ${a.descripcion}`,
    value: a.id,
  })),
)

const versionOptions = computed(() =>
  versiones.value.map((v) => ({
    label: `${v.gestion} — ${v.nombre}`,
    value: v.gestion,
  })),
)

const cargarCatalogos = async () => {
  loadingCatalogos.value = true
  try {
    const [aeiRes, verRes, areasRes] = await Promise.all([
      backendService.get<AeiLookup[]>('acp/aeis'),
      backendService.get<PoaVersionLookup[]>('poa-versiones'),
      backendService.get<CodificadorDto[]>('comun/codificador/areas'),
    ])
    aeis.value = ((aeiRes as { data?: AeiLookup[] })?.data || aeiRes || []) as AeiLookup[]
    versiones.value = ((verRes as { data?: PoaVersionLookup[] })?.data || verRes || []) as PoaVersionLookup[]
    areasCatalogo.value = ((areasRes as { data?: CodificadorDto[] })?.data || areasRes || []) as CodificadorDto[]
  } catch {
    aeis.value = []
    versiones.value = []
    areasCatalogo.value = []
  } finally {
    loadingCatalogos.value = false
  }
}

const cargarDetalleAreas = async (acpId: string) => {
  loadingDetalle.value = true
  try {
    const res = await backendService.getById<Acp>('acp', acpId)
    const data = ((res as { data?: Acp })?.data ?? res) as Acp
    selectedAreasIds.value = data.areas_ids ?? data.areas?.map((a) => a.id) ?? []
  } catch {
    selectedAreasIds.value = []
  } finally {
    loadingDetalle.value = false
  }
}

const handleToggleArea = (areaId: string) => {
  if (selectedAreasIds.value.includes(areaId)) {
    selectedAreasIds.value = selectedAreasIds.value.filter((id) => id !== areaId)
  } else {
    selectedAreasIds.value = [...selectedAreasIds.value, areaId]
  }
}

const handleSelectAllAreas = () => {
  const all = areasCatalogo.value.map((a) => String(a.id))
  if (selectedAreasIds.value.length === all.length) {
    selectedAreasIds.value = []
  } else {
    selectedAreasIds.value = [...all]
  }
}

watch(
  () => props.acp,
  async (val) => {
    if (val) {
      numeroCorrelativo.value = val.numero ?? null
      form.value = {
        ponderacion: val.ponderacion && val.ponderacion > 0 ? val.ponderacion : 1,
        descripcion: val.descripcion || '',
        aei_id: val.aei_id || '',
        version_id: val.version_id || new Date().getFullYear(),
      }
      if (val.id) {
        await cargarDetalleAreas(val.id)
      }
    } else {
      numeroCorrelativo.value = null
      form.value = {
        ponderacion: 1,
        descripcion: '',
        aei_id: '',
        version_id: versiones.value[0]?.gestion ?? new Date().getFullYear(),
      }
      selectedAreasIds.value = []
    }
  },
  { immediate: true },
)

watch(open, (val) => {
  if (val) {
    cargarCatalogos()
  }
})

onMounted(() => {
  cargarCatalogos()
})

const handleSave = async (event?: FormSubmitEvent<SchemaType>) => {
  const data = event?.data || form.value
  saving.value = true
  try {
    const payload: CreateAcpPayload = {
      ponderacion: Number(data.ponderacion),
      descripcion: data.descripcion.trim(),
      aei_id: data.aei_id,
      version_id: Number(data.version_id),
    }

    if (isEditing.value && props.acp?.id) {
      const updatePayload: UpdateAcpPayload = {
        ...payload,
        areas_ids: [...selectedAreasIds.value],
      }
      await backendService.patch<Acp>('acp', props.acp.id, updatePayload)
      toast.add({
        title: 'ACP actualizado',
        description: 'Los cambios y áreas asignadas fueron guardados.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      await backendService.post<Acp>('acp', payload)
      toast.add({
        title: 'ACP creado',
        description: 'El ACP fue registrado. Asigne áreas al editarlo.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }

    open.value = false
    emit('guardado')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string | string[] }; message?: string }
    toast.add({
      title: 'Error al guardar',
      description:
        (Array.isArray(err?.data?.message)
          ? err.data.message.join(', ')
          : err?.data?.message) ||
        err?.message ||
        'No se pudo guardar el ACP',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? 'Editar ACP' : 'Nuevo ACP'"
    :description="isEditing ? 'Modifique el ACP y asigne las áreas responsables.' : 'Registre un nuevo Acción de Corto Plazo.'"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <UForm
        id="acp-form"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UFormField label="Gestión / Versión" name="version_id" required>
            <USelect
              v-model="form.version_id"
              :items="versionOptions"
              :loading="loadingCatalogos"
              placeholder="Seleccione gestión..."
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Número correlativo"
            help="Se asigna automáticamente por gestión."
          >
            <UInput
              :model-value="isEditing && numeroCorrelativo != null ? String(numeroCorrelativo) : 'Automático'"
              disabled
              class="w-full"
            />
          </UFormField>

          <UFormField label="Ponderación (%)" name="ponderacion" required help="Entre 1 y 100. La suma por gestión no debe superar 100.">
            <UInput v-model.number="form.ponderacion" type="number" min="1" max="100" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="AEI" name="aei_id" required>
          <USelect
            v-model="form.aei_id"
            :items="aeiOptions"
            :loading="loadingCatalogos"
            placeholder="Seleccione AEI..."
            class="w-full"
          />
        </UFormField>

        <UFormField label="Descripción" name="descripcion" required>
          <UTextarea
            v-model="form.descripcion"
            :rows="3"
            placeholder="Descripción del ACP..."
            class="w-full"
          />
        </UFormField>

        <!-- Asignación de áreas solo en edición (acp_area) -->
        <div
          v-if="isEditing"
          class="border border-default rounded-md p-4 bg-elevated/30 space-y-3"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-lucide-building-2" class="size-4 text-primary shrink-0" />
              <span class="text-sm font-semibold text-highlighted">
                Áreas asignadas (ACP Área)
              </span>
              <UBadge size="xs" color="primary" variant="subtle" class="rounded-full font-bold shrink-0">
                {{ selectedAreasIds.length }} área(s)
              </UBadge>
            </div>

            <UButton
              v-if="areasCatalogo.length > 0"
              size="xs"
              color="neutral"
              variant="ghost"
              :label="selectedAreasIds.length === areasCatalogo.length ? 'Quitar todas' : 'Seleccionar todas'"
              @click="handleSelectAllAreas"
            />
          </div>

          <p class="text-xs text-muted">
            Seleccione las áreas responsables vinculadas a este ACP mediante
            <span class="font-mono text-[11px]">acp_area</span>.
          </p>

          <div v-if="loadingCatalogos || loadingDetalle" class="flex gap-2">
            <USkeleton class="h-8 w-32 rounded-md" />
            <USkeleton class="h-8 w-40 rounded-md" />
          </div>

          <div
            v-else-if="areasCatalogo.length > 0"
            class="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1"
          >
            <button
              v-for="areaItem in areasCatalogo"
              :key="String(areaItem.id)"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border cursor-pointer select-none"
              :class="[
                selectedAreasIds.includes(String(areaItem.id))
                  ? 'bg-primary/10 border-primary text-primary shadow-xs'
                  : 'bg-default border-default text-muted hover:border-muted',
              ]"
              @click="handleToggleArea(String(areaItem.id))"
            >
              <UIcon
                :name="
                  selectedAreasIds.includes(String(areaItem.id))
                    ? 'i-lucide-check-circle-2'
                    : 'i-lucide-circle'
                "
                :class="
                  selectedAreasIds.includes(String(areaItem.id))
                    ? 'text-primary size-3.5'
                    : 'text-dimmed size-3.5'
                "
              />
              <span class="font-mono font-bold">[{{ areaItem.codigo || '—' }}]</span>
              <span class="truncate max-w-[200px]">{{ areaItem.nombre }}</span>
            </button>
          </div>

          <div v-else class="text-xs text-muted italic py-2">
            No hay áreas disponibles en el catálogo.
          </div>
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" :disabled="saving" @click="open = false" />
        <UButton
          :label="isEditing ? 'Guardar Cambios' : 'Registrar ACP'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="acp-form"
        />
      </div>
    </template>
  </UModal>
</template>
