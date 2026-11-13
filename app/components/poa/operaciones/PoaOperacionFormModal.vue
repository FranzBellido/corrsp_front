<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  CreatePoaOperacionPayload,
  PoaOperacion,
  UpdatePoaOperacionPayload,
} from '~/types/poa/poa-operacion'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  operacion?: PoaOperacion | null
  resultadoId: string
  resultadoNombre?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const schema = z.object({
  descripcion: z.string().trim().min(1).max(4000),
  ponderacion: z
    .number({ invalid_type_error: 'La ponderación es obligatoria' })
    .int()
    .min(1, 'Mayor a 0')
    .max(100, 'No puede superar 100'),
  meta: z.string().trim().min(1).max(1000),
  indicador: z.string().trim().min(1).max(1000),
})

type SchemaType = z.infer<typeof schema>

const form = ref<SchemaType>({
  descripcion: '',
  ponderacion: 1,
  meta: '',
  indicador: '',
})

const numeroCorrelativo = ref<number | null>(null)
const isEditing = computed(() => !!props.operacion?.id)

watch(
  () => props.operacion,
  (val) => {
    if (val) {
      numeroCorrelativo.value = val.numero ?? null
      form.value = {
        descripcion: val.descripcion || '',
        ponderacion: val.ponderacion > 0 ? val.ponderacion : 1,
        meta: val.meta || '',
        indicador: val.indicador || '',
      }
    } else {
      numeroCorrelativo.value = null
      form.value = {
        descripcion: '',
        ponderacion: 1,
        meta: '',
        indicador: '',
      }
    }
  },
  { immediate: true },
)

const handleSave = async (event?: FormSubmitEvent<SchemaType>) => {
  const data = event?.data || form.value
  if (!props.resultadoId) return

  saving.value = true
  try {
    const base = {
      descripcion: data.descripcion.trim(),
      ponderacion: Number(data.ponderacion),
      meta: data.meta.trim(),
      indicador: data.indicador.trim(),
    }

    if (isEditing.value && props.operacion?.id) {
      await backendService.patch<PoaOperacion>(
        'poa-operaciones',
        props.operacion.id,
        base as UpdatePoaOperacionPayload,
      )
      toast.add({
        title: 'Operación actualizada',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      const payload: CreatePoaOperacionPayload = {
        ...base,
        resultado_id: props.resultadoId,
      }
      await backendService.post<PoaOperacion>('poa-operaciones', payload)
      toast.add({
        title: 'Operación registrada',
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
        'No se pudo guardar la operación',
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
    :title="isEditing ? 'Editar operación' : 'Nueva operación'"
    :description="resultadoNombre ? `Resultado: ${resultadoNombre}` : 'Registre una operación asociada al resultado.'"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <UForm
        id="poa-operacion-form"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <UFormField
          v-if="isEditing"
          label="Número correlativo"
          help="Por resultado, asignado automáticamente."
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
          help="Entre 1 y 100. La suma por resultado no debe superar 100."
        >
          <UInput v-model.number="form.ponderacion" type="number" min="1" max="100" class="w-full" />
        </UFormField>

        <UFormField label="Meta" name="meta" required>
          <UInput v-model="form.meta" class="w-full" />
        </UFormField>

        <UFormField label="Indicador" name="indicador" required>
          <UInput v-model="form.indicador" class="w-full" />
        </UFormField>
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
          form="poa-operacion-form"
        />
      </div>
    </template>
  </UModal>
</template>
