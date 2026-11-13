<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  AcpResultado,
  CreateAcpResultadoPayload,
  UpdateAcpResultadoPayload,
} from '~/types/poa/acp-resultado'
import type { AcpDisponibleFormulacion } from '~/types/poa/formulacion'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  resultado?: AcpResultado | null
  poaFormulacionId: string
  acpsDisponibles: AcpDisponibleFormulacion[]
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const schema = z.object({
  acp_id: z.string().uuid('Seleccione un ACP'),
  nombre: z.string().trim().min(1).max(500),
  indicador: z.string().trim().max(500).optional().nullable(),
  ponderacion: z
    .number({ invalid_type_error: 'La ponderación es obligatoria' })
    .int()
    .min(1, 'Mayor a 0')
    .max(100, 'No puede superar 100'),
})

type SchemaType = z.infer<typeof schema>

const form = ref<SchemaType>({
  acp_id: '',
  nombre: '',
  indicador: '',
  ponderacion: 1,
})

const numeroCorrelativo = ref<number | null>(null)
const isEditing = computed(() => !!props.resultado?.id)

const acpOptions = computed(() => {
  const opts = props.acpsDisponibles.map((a) => ({
    label: `ACP ${a.numero} — ${a.descripcion}`,
    value: a.id,
  }))
  const resultado = props.resultado
  if (
    resultado?.acp_id &&
    !opts.some((o) => o.value === resultado.acp_id) &&
    resultado.acp
  ) {
    opts.unshift({
      label: `ACP ${resultado.acp.numero} — ${resultado.acp.descripcion}`,
      value: resultado.acp_id,
    })
  }
  return opts
})

watch(
  () => props.resultado,
  (val) => {
    if (val) {
      numeroCorrelativo.value = val.numero ?? null
      form.value = {
        acp_id: val.acp_id,
        nombre: val.nombre || '',
        indicador: val.indicador || '',
        ponderacion: val.ponderacion > 0 ? val.ponderacion : 1,
      }
    } else {
      numeroCorrelativo.value = null
      form.value = {
        acp_id: props.acpsDisponibles[0]?.id || '',
        nombre: '',
        indicador: '',
        ponderacion: 1,
      }
    }
  },
  { immediate: true },
)

const handleSave = async (event?: FormSubmitEvent<SchemaType>) => {
  const data = event?.data || form.value
  if (!props.poaFormulacionId) return

  saving.value = true
  try {
    const basePayload = {
      acp_id: data.acp_id,
      nombre: data.nombre.trim(),
      indicador: data.indicador?.trim() || null,
      ponderacion: Number(data.ponderacion),
    }

    if (isEditing.value && props.resultado?.id) {
      await backendService.patch<AcpResultado>(
        'acp-resultados',
        props.resultado.id,
        basePayload as UpdateAcpResultadoPayload,
      )
      toast.add({
        title: 'Resultado actualizado',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      const payload: CreateAcpResultadoPayload = {
        ...basePayload,
        poa_formulacion_id: props.poaFormulacionId,
      }
      await backendService.post<AcpResultado>('acp-resultados', payload)
      toast.add({
        title: 'Resultado registrado',
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
        'No se pudo guardar el resultado',
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
    :title="isEditing ? 'Editar resultado' : 'Nuevo resultado'"
    :description="isEditing ? 'Modifique el resultado del ACP.' : 'Registre un resultado para un ACP asignado a su área.'"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <UForm
        id="acp-resultado-form"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <UFormField label="ACP" name="acp_id" required>
          <USelect
            v-model="form.acp_id"
            :items="acpOptions"
            :disabled="acpOptions.length === 0"
            placeholder="Seleccione ACP..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="isEditing"
          label="Número correlativo"
          help="Por ACP, asignado automáticamente."
        >
          <UInput
            :model-value="numeroCorrelativo != null ? String(numeroCorrelativo) : '—'"
            disabled
            class="w-full"
          />
        </UFormField>

        <UFormField label="Nombre" name="nombre" required>
          <UInput v-model="form.nombre" class="w-full" />
        </UFormField>

        <UFormField label="Indicador" name="indicador">
          <UInput v-model="form.indicador" class="w-full" />
        </UFormField>

        <UFormField
          label="Ponderación (%)"
          name="ponderacion"
          required
          help="Entre 1 y 100. La suma por ACP no debe superar 100."
        >
          <UInput v-model.number="form.ponderacion" type="number" min="1" max="100" class="w-full" />
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
          form="acp-resultado-form"
          :disabled="acpOptions.length === 0"
        />
      </div>
    </template>
  </UModal>
</template>
