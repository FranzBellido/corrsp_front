<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  SeguimientoActividad,
  UpdateSeguimientoActividadPayload,
} from '~/types/poa/seguimiento-actividad'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  item?: SeguimientoActividad | null
  permiteEditar?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const actividad = computed(() => props.item?.poa_actividades ?? null)
const porcentual = computed(() => actividad.value?.porcentual ?? false)
const cantProgramada = computed(() => props.item?.cant_programada ?? 0)

const schema = computed(() => {
  const cant = z
    .number({ invalid_type_error: 'Ingrese la cantidad ejecutada' })
    .int()
    .min(0, 'Mayor o igual a 0')
  return z.object({
    descripcion: z.string().trim().max(5000).optional().nullable(),
    justificacion: z.string().trim().max(1000).optional().nullable(),
    cant_ejecutada: porcentual.value
      ? cant.max(100, 'En modo porcentual no puede superar 100')
      : cant,
  })
})

type SchemaType = {
  descripcion?: string | null
  justificacion?: string | null
  cant_ejecutada: number
}

const form = ref<SchemaType>({
  descripcion: '',
  justificacion: '',
  cant_ejecutada: 0,
})

const incumplimiento = computed(() => {
  const ej = Number(form.value.cant_ejecutada) || 0
  return ej < cantProgramada.value
})

const soloLectura = computed(() => props.permiteEditar === false)

const tituloModal = computed(() =>
  soloLectura.value
    ? 'Detalle del avance'
    : 'Registrar avance del trimestre',
)

const etiquetaArea = computed(() => {
  const a = actividad.value?.poa_operacion?.areas
  if (!a?.nombre) return '—'
  return a.codigo ? `[${a.codigo}] ${a.nombre}` : a.nombre
})

watch(
  () => props.item,
  (val) => {
    if (!val) {
      form.value = { descripcion: '', justificacion: '', cant_ejecutada: 0 }
      return
    }
    form.value = {
      descripcion: val.descripcion || '',
      justificacion: val.justificacion || '',
      cant_ejecutada:
        val.cant_ejecutada != null ? Number(val.cant_ejecutada) : 0,
    }
  },
  { immediate: true },
)

const handleSave = async (event?: FormSubmitEvent<SchemaType>) => {
  const data = event?.data || form.value
  if (!props.item?.id || props.permiteEditar === false) return

  saving.value = true
  try {
    const payload: UpdateSeguimientoActividadPayload = {
      descripcion: data.descripcion?.trim() || null,
      justificacion: data.justificacion?.trim() || null,
      cant_ejecutada: Number(data.cant_ejecutada),
    }
    await backendService.patch<SeguimientoActividad>(
      'seguimiento-actividades',
      props.item.id,
      payload,
    )
    toast.add({
      title: 'Avance registrado',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
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
        'No se pudo guardar el avance',
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
    :title="tituloModal"
    :description="actividad?.descripcion || (soloLectura
      ? 'Consulta del avance registrado en el trimestre.'
      : 'Actualice la ejecución de la actividad.')"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div
        v-if="actividad"
        class="mb-4 rounded-md border border-default bg-elevated/40 p-3 space-y-2 text-sm"
      >
        <p class="text-xs text-muted font-medium uppercase tracking-wide">
          Referencia de formulación
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <p class="text-xs text-muted">Actividad</p>
            <p class="font-semibold">
              {{ actividad.numero }}. {{ actividad.descripcion || '—' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">Área</p>
            <p class="font-medium">{{ etiquetaArea }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">Ponderación</p>
            <p class="font-medium">{{ actividad.ponderacion }}%</p>
          </div>
          <div>
            <p class="text-xs text-muted">Programado (T{{ item?.seguimiento?.trimestre }})</p>
            <p class="font-medium font-mono">
              {{ cantProgramada }}{{ porcentual ? '%' : '' }}
            </p>
          </div>
          <div class="sm:col-span-2">
            <p class="text-xs text-muted">Medios</p>
            <p class="text-default whitespace-pre-wrap">{{ actividad.medios?.trim() || '—' }}</p>
          </div>
        </div>
      </div>

      <UForm
        id="seguimiento-actividad-form"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <UFormField
          :label="porcentual ? 'Cantidad ejecutada (%)' : 'Cantidad ejecutada'"
          name="cant_ejecutada"
          required
          :help="porcentual ? 'Máximo 100% en modo porcentual.' : 'Unidades ejecutadas en el trimestre.'"
        >
          <UInput
            v-model.number="form.cant_ejecutada"
            type="number"
            min="0"
            :max="porcentual ? 100 : undefined"
            class="w-full"
            :disabled="permiteEditar === false"
          />
        </UFormField>

        <UFormField
          label="Descripción de actividades realizadas"
          name="descripcion"
          help="Detalle del avance ejecutado en el trimestre."
        >
          <UTextarea
            v-model="form.descripcion"
            :rows="4"
            class="w-full"
            :disabled="permiteEditar === false"
          />
        </UFormField>

        <UFormField
          label="Justificación"
          name="justificacion"
          :help="incumplimiento
            ? 'Recomendada: la ejecución es menor a lo programado.'
            : 'Opcional. Use si hay incumplimiento o desviación.'"
        >
          <UTextarea
            v-model="form.justificacion"
            :rows="3"
            class="w-full"
            :disabled="permiteEditar === false"
          />
        </UFormField>

        <UAlert
          v-if="incumplimiento"
          color="warning"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Ejecución por debajo de lo programado"
          description="Complete la justificación si corresponde."
        />
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          :label="soloLectura ? 'Cerrar' : 'Cancelar'"
          color="neutral"
          variant="ghost"
          :disabled="saving"
          @click="open = false"
        />
        <UButton
          v-if="permiteEditar !== false"
          label="Guardar avance"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="seguimiento-actividad-form"
        />
      </div>
    </template>
  </UModal>
</template>
