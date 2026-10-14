<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Area, CreateAreaPayload, UpdateAreaPayload } from '~/types/area'
import type { CodificadorDto } from '~/types/codificador'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  area?: Area | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

// Lista de procesos disponibles en el sistema
const procesosDisponibles = ref<CodificadorDto[]>([])
const loadingProcesos = ref(false)

// Esquema de validación con Zod
const areaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, 'El código del área es obligatorio')
    .max(50, 'No puede exceder 50 caracteres'),
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre del área es obligatorio')
    .max(150, 'No puede exceder 150 caracteres'),
  activo: z.boolean().default(true),
  id_anterior: z.number().int().optional(),
  area_padre_id: z.string().optional(),
  area_comunicacion_id: z.string().optional(),
})

type AreaSchemaType = z.infer<typeof areaSchema>

const form = ref<AreaSchemaType>({
  codigo: '',
  nombre: '',
  activo: true,
  id_anterior: undefined,
  area_padre_id: '',
  area_comunicacion_id: '',
})

// Selección múltiple de IDs de procesos para el control area_proceso
const selectedProcesosIds = ref<number[]>([])

const isEditing = computed(() => !!props.area?.id)

// Cargar catálogo de procesos
const cargarProcesos = async () => {
  loadingProcesos.value = true
  try {
    const res = await backendService.get<CodificadorDto[]>('comun/codificador/procesos')
    procesosDisponibles.value = (res as any)?.data || res || []
  } catch (error) {
    console.error('Error cargando procesos:', error)
  } finally {
    loadingProcesos.value = false
  }
}

watch(
  () => props.area,
  (val) => {
    if (val) {
      form.value = {
        codigo: val.codigo || '',
        nombre: val.nombre || '',
        activo: val.activo ?? true,
        id_anterior: val.id_anterior !== null && val.id_anterior !== undefined ? val.id_anterior : undefined,
        area_padre_id: val.area_padre_id || '',
        area_comunicacion_id: val.area_comunicacion_id || '',
      }
      // Inicializar procesos asociados
      selectedProcesosIds.value = val.area_proceso ? val.area_proceso.map((ap) => ap.proc_id) : []
    } else {
      form.value = {
        codigo: '',
        nombre: '',
        activo: true,
        id_anterior: undefined,
        area_padre_id: '',
        area_comunicacion_id: '',
      }
      selectedProcesosIds.value = []
    }
  },
  { immediate: true },
)

onMounted(() => {
  cargarProcesos()
})

const handleToggleProceso = (procId: number) => {
  const index = selectedProcesosIds.value.indexOf(procId)
  if (index > -1) {
    selectedProcesosIds.value.splice(index, 1)
  } else {
    selectedProcesosIds.value.push(procId)
  }
}

const handleSelectAllProcesos = () => {
  if (selectedProcesosIds.value.length === procesosDisponibles.value.length) {
    selectedProcesosIds.value = []
  } else {
    selectedProcesosIds.value = procesosDisponibles.value.map((p) => Number(p.id))
  }
}

const handleSave = async (event?: FormSubmitEvent<AreaSchemaType>) => {
  const data = event?.data || form.value

  saving.value = true
  try {
    const payload: CreateAreaPayload = {
      codigo: data.codigo.trim(),
      nombre: data.nombre.trim(),
      activo: data.activo,
      id_anterior: data.id_anterior !== undefined ? Number(data.id_anterior) : undefined,
      area_padre_id: data.area_padre_id || undefined,
      area_comunicacion_id: data.area_comunicacion_id || undefined,
      procesos_ids: selectedProcesosIds.value,
    }

    if (isEditing.value && props.area?.id) {
      await backendService.patch<Area>('areas', props.area.id, payload as UpdateAreaPayload)
      toast.add({
        title: 'Área actualizada',
        description: 'El área organizacional ha sido modificada exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      await backendService.post<Area>('areas', payload)
      toast.add({
        title: 'Área creada',
        description: 'La nueva área fue registrada exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }

    open.value = false
    emit('guardado')
  } catch (error: any) {
    const errorMsg =
      error?.data?.message ||
      (Array.isArray(error?.data?.message) ? error.data.message.join(', ') : null) ||
      error?.message ||
      'Ocurrió un error al procesar el área'

    toast.add({
      title: 'Error al guardar',
      description: errorMsg,
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
    :title="isEditing ? 'Editar Área / Unidad' : 'Nueva Área / Unidad'"
    :description="isEditing ? 'Modifique los datos organizacionales y los procesos asignados.' : 'Complete los campos para registrar una nueva unidad organizacional y sus procesos.'"
    :ui="{
      content: 'sm:max-w-2xl',
    }"
  >
    <template #body>
      <UForm
        id="area-form"
        :schema="areaSchema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <!-- Código y Nombre del Área -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UFormField
            label="Código"
            name="codigo"
            required
            help="Sigla o código único."
          >
            <UInput
              v-model="form.codigo"
              placeholder="Ej. DAF, UAI, PRE"
              icon="i-lucide-tag"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UFormField
            label="Nombre del Área"
            name="nombre"
            required
            class="sm:col-span-2"
            help="Denominación formal de la unidad o dirección."
          >
            <UInput
              v-model="form.nombre"
              placeholder="Ej. DIRECCIÓN GENERAL DE ADMINISTRACIÓN"
              icon="i-lucide-building-2"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Área Superior (Padre) y Área Comunicación -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            label="Área Superior (Padre)"
            name="area_padre_id"
            help="Dependencia jerárquica superior (opcional)."
          >
            <CodificadorSelect
              v-model="form.area_padre_id"
              endpoint="comun/codificador/areas"
              placeholder="Sin dependencia (Nivel raíz)..."
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Área de Comunicación"
            name="area_comunicacion_id"
            help="Área vía para correspondencia oficial (opcional)."
          >
            <CodificadorSelect
              v-model="form.area_comunicacion_id"
              endpoint="comun/codificador/areas"
              placeholder="Seleccionar área de enlace..."
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- ID Anterior y Estado Activo -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <UFormField
            label="ID Anterior (Migración)"
            name="id_anterior"
            help="Opcional. Código del sistema legado."
          >
            <UInput
              v-model.number="form.id_anterior"
              type="number"
              placeholder="Ej. 10"
              icon="i-lucide-hash"
              class="w-full"
            />
          </UFormField>

          <div class="flex items-center gap-3 pt-4 sm:pt-0">
            <USwitch
              v-model="form.activo"
              label="Área Activa"
              color="primary"
            />
            <span class="text-xs text-neutral-500">
              {{ form.activo ? 'Habilitada para trámites y cargos' : 'Deshabilitada temporalmente' }}
            </span>
          </div>
        </div>

        <!-- CONTROL PARA REGISTRAR PROCESOS (area_proceso) -->
        <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-git-branch" class="size-4 text-primary-500" />
              <span class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Procesos Asociados (Área Proceso)
              </span>
              <UBadge
                size="xs"
                color="primary"
                variant="subtle"
                class="rounded-full font-bold"
              >
                {{ selectedProcesosIds.length }} seleccionados
              </UBadge>
            </div>

            <UButton
              v-if="procesosDisponibles.length > 0"
              size="xs"
              color="neutral"
              variant="ghost"
              :label="selectedProcesosIds.length === procesosDisponibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'"
              @click="handleSelectAllProcesos"
            />
          </div>

          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            Seleccione los tipos de procesos y trámites que esta área está facultada para atender y despachar:
          </p>

          <!-- Skeleton si carga -->
          <div v-if="loadingProcesos" class="flex gap-2">
            <USkeleton class="h-8 w-28 rounded-lg" />
            <USkeleton class="h-8 w-36 rounded-lg" />
            <USkeleton class="h-8 w-32 rounded-lg" />
          </div>

          <!-- Cuadrícula / Etiquetas interactivas de procesos -->
          <div v-else-if="procesosDisponibles.length > 0" class="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
            <button
              v-for="proc in procesosDisponibles"
              :key="proc.id"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border cursor-pointer select-none"
              :class="[
                selectedProcesosIds.includes(Number(proc.id))
                  ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-700 dark:text-primary-300 shadow-xs'
                  : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
              ]"
              @click="handleToggleProceso(Number(proc.id))"
            >
              <UIcon
                :name="selectedProcesosIds.includes(Number(proc.id)) ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                :class="selectedProcesosIds.includes(Number(proc.id)) ? 'text-primary-500 size-3.5' : 'text-neutral-400 size-3.5'"
              />
              <span>{{ proc.nombre }}</span>
            </button>
          </div>

          <div v-else class="text-xs text-neutral-400 italic py-2">
            No se encontraron procesos registrados en el catálogo.
          </div>
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          :disabled="saving"
          @click="open = false"
        />
        <UButton
          :label="isEditing ? 'Guardar Cambios' : 'Registrar Área'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="area-form"
        />
      </div>
    </template>
  </UModal>
</template>
