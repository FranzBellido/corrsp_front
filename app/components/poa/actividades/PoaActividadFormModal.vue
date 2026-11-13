<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  CreatePoaActividadPayload,
  PoaActividad,
  UpdatePoaActividadPayload,
} from '~/types/poa/poa-actividad'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  actividad?: PoaActividad | null
  operacionId: string
  operacionNombre?: string
  /** Trimestre vigente según configuración POA (resalta la columna Tn). */
  trimestreActivo?: number
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const trimestreActivoNorm = computed(() => {
  const t = props.trimestreActivo ?? 1
  return t >= 1 && t <= 4 ? t : 1
})

const cantProgramadaSchema = z.tuple([
  z.number({ invalid_type_error: 'Requerido' }).int().min(0),
  z.number({ invalid_type_error: 'Requerido' }).int().min(0),
  z.number({ invalid_type_error: 'Requerido' }).int().min(0),
  z.number({ invalid_type_error: 'Requerido' }).int().min(0),
])

const schema = z.object({
  descripcion: z.string().trim().min(1).max(1000),
  ponderacion: z
    .number({ invalid_type_error: 'La ponderación es obligatoria' })
    .int()
    .min(1, 'Mayor a 0')
    .max(100, 'No puede superar 100'),
  tareas: z.string().trim().max(2000).optional().nullable(),
  medios: z.string().trim().max(500).optional().nullable(),
  meta: z.number().int().min(0).optional().nullable(),
  linea_base: z.number().int().min(0).optional().nullable(),
  cant_programada_trimestres: cantProgramadaSchema,
})

type SchemaType = z.infer<typeof schema>

const cantidadesPorDefecto = (): SchemaType['cant_programada_trimestres'] => [0, 0, 0, 0]

const cantidadesDesdeActividad = (
  val?: PoaActividad | null,
): SchemaType['cant_programada_trimestres'] => {
  const out = cantidadesPorDefecto()
  for (const row of val?.seguimiento_actividades ?? []) {
    const t = row.seguimiento?.trimestre
    if (t != null && t >= 1 && t <= 4) {
      out[t - 1] = row.cant_programada
    }
  }
  return out
}

const form = ref<SchemaType>({
  descripcion: '',
  ponderacion: 1,
  tareas: '',
  medios: '',
  meta: null,
  linea_base: null,
  cant_programada_trimestres: cantidadesPorDefecto(),
})

const numeroCorrelativo = ref<number | null>(null)
const isEditing = computed(() => !!props.actividad?.id)

watch(
  () => props.actividad,
  (val) => {
    if (val) {
      numeroCorrelativo.value = val.numero ?? null
      form.value = {
        descripcion: val.descripcion || '',
        ponderacion: val.ponderacion > 0 ? val.ponderacion : 1,
        tareas: val.tareas || '',
        medios: val.medios || '',
        meta: val.meta ?? null,
        linea_base: val.linea_base ?? null,
        cant_programada_trimestres: cantidadesDesdeActividad(val),
      }
    } else {
      numeroCorrelativo.value = null
      form.value = {
        descripcion: '',
        ponderacion: 1,
        tareas: '',
        medios: '',
        meta: null,
        linea_base: null,
        cant_programada_trimestres: cantidadesPorDefecto(),
      }
    }
  },
  { immediate: true },
)

const buildCantTrimestres = (
  data: SchemaType,
): [number, number, number, number] =>
  data.cant_programada_trimestres.map((n) => Number(n)) as [
    number,
    number,
    number,
    number,
  ]

const handleSave = async (event?: FormSubmitEvent<SchemaType>) => {
  const data = event?.data || form.value
  if (!props.operacionId) return

  saving.value = true
  try {
    const cant_programada_trimestres = buildCantTrimestres(data)
    const base = {
      descripcion: data.descripcion.trim(),
      ponderacion: Number(data.ponderacion),
      tareas: data.tareas?.trim() || null,
      medios: data.medios?.trim() || null,
      meta: data.meta === null || data.meta === undefined || Number.isNaN(Number(data.meta))
        ? null
        : Number(data.meta),
      linea_base:
        data.linea_base === null ||
        data.linea_base === undefined ||
        Number.isNaN(Number(data.linea_base))
          ? null
          : Number(data.linea_base),
      cant_programada_trimestres,
    }

    if (isEditing.value && props.actividad?.id) {
      await backendService.patch<PoaActividad>(
        'poa-actividades',
        props.actividad.id,
        base as UpdatePoaActividadPayload,
      )
      toast.add({
        title: 'Actividad actualizada',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      const payload: CreatePoaActividadPayload = {
        ...base,
        oper_id: props.operacionId,
      }
      await backendService.post<PoaActividad>('poa-actividades', payload)
      toast.add({
        title: 'Actividad registrada',
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
        'No se pudo guardar la actividad',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    saving.value = false
  }
}

const trimestreFieldClass = (t: number) =>
  trimestreActivoNorm.value === t
    ? 'rounded-lg border border-primary/40 bg-primary/5 p-2 -mx-2'
    : ''
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? 'Editar actividad' : 'Nueva actividad'"
    :description="operacionNombre ? `Operación: ${operacionNombre}` : 'Registre una actividad asociada a la operación.'"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <UForm
        id="poa-actividad-form"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <UFormField
          v-if="isEditing"
          label="Número correlativo"
          help="Por operación, asignado automáticamente."
        >
          <UInput
            :model-value="numeroCorrelativo != null ? String(numeroCorrelativo) : '—'"
            disabled
            class="w-full"
          />
        </UFormField>

        <UFormField label="Descripción" name="descripcion" required>
          <UTextarea v-model="form.descripcion" :rows="3" class="w-full" />
        </UFormField>

        <UFormField
          label="Ponderación (%)"
          name="ponderacion"
          required
          help="Entre 1 y 100. La suma por operación no debe superar 100."
        >
          <UInput v-model.number="form.ponderacion" type="number" min="1" max="100" class="w-full" />
        </UFormField>

        <UFormField label="Tareas" name="tareas">
          <UTextarea v-model="form.tareas" :rows="2" class="w-full" />
        </UFormField>

        <UFormField label="Medios" name="medios">
          <UInput v-model="form.medios" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Meta" name="meta">
            <UInput v-model.number="form.meta" type="number" min="0" class="w-full" />
          </UFormField>
          <UFormField label="Línea base" name="linea_base">
            <UInput v-model.number="form.linea_base" type="number" min="0" class="w-full" />
          </UFormField>
        </div>

        <div class="space-y-2 pt-1 border-t border-default">
          <p class="text-sm font-medium">Cantidad programada por trimestre</p>
          <p class="text-xs text-muted">
            Se registran 4 filas en seguimiento de actividades (descripción, justificación y ejecutado en blanco).
            Trimestre activo: T{{ trimestreActivoNorm }}.
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <UFormField
              v-for="t in 4"
              :key="t"
              :label="`T${t}`"
              :name="`cant_programada_trimestres.${t - 1}`"
              :class="trimestreFieldClass(t)"
              required
            >
              <UInput
                v-model.number="form.cant_programada_trimestres[t - 1]"
                type="number"
                min="0"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" :disabled="saving" @click="open = false" />
        <UButton
          :label="isEditing ? 'Guardar' : 'Registrar'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="poa-actividad-form"
        />
      </div>
    </template>
  </UModal>
</template>
