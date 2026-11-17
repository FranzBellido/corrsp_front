<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CambiarEstadoPoaFormulacionPayload } from '~/types/poa/formulacion'
import { backendService } from '~/services/backend.service'

const props = withDefaults(
  defineProps<{
    /** ID del registro (formulación, resultado u operación). */
    itemId: string | null
    estadoId: number
    /** Recurso API: poa-formulacion | poa-formulacion-admin | acp-resultados-admin | poa-operaciones-admin */
    apiResource?: string
    titulo?: string
    descripcion?: string
    confirmLabel?: string
    confirmIcon?: string
    confirmColor?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'secondary'
    successTitle?: string
    successDescription?: string
    errorTitle?: string
  }>(),
  {
    apiResource: 'poa-formulacion',
    confirmColor: 'primary',
  },
)

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'cambiado'): void
}>()

const toast = useToast()
const saving = ref(false)

const schema = z.object({
  observaciones: z
    .string()
    .trim()
    .max(500, 'No puede exceder 500 caracteres'),
})

type FormState = z.infer<typeof schema>

const form = ref<FormState>({ observaciones: '' })

const canSubmit = computed(() => Boolean(props.itemId && props.estadoId > 0))

watch(open, (isOpen) => {
  if (isOpen) {
    form.value = { observaciones: '' }
  }
})

const onSubmit = async (event: FormSubmitEvent<FormState>) => {
  if (!props.itemId || !props.estadoId) return

  saving.value = true
  try {
    const payload: CambiarEstadoPoaFormulacionPayload = {
      estado_id: props.estadoId,
      observaciones: event.data.observaciones.trim(),
    }
    await backendService.patch(
      props.apiResource,
      `${props.itemId}/estado`,
      payload,
    )
    toast.add({
      title: props.successTitle || 'Estado actualizado',
      description:
        props.successDescription ||
        'El cambio de estado se registró correctamente.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    open.value = false
    emit('cambiado')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string | string[] }; message?: string }
    const msg = err?.data?.message
    toast.add({
      title: props.errorTitle || 'No se pudo cambiar el estado',
      description: Array.isArray(msg) ? msg.join(', ') : msg || err?.message || 'Error inesperado.',
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
    :title="titulo || 'Cambio de estado'"
    :description="descripcion || 'Registre una observación para el cambio de estado.'"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <UForm :schema="schema" :state="form" class="space-y-4" @submit="onSubmit">
        <UFormField label="Observaciones" name="observaciones" optional>
          <UTextarea
            v-model="form.observaciones"
            :rows="4"
            placeholder="Motivo o detalle del cambio de estado..."
            class="w-full"
            autoresize
          />
        </UFormField>

        <div class="flex items-center justify-end gap-2 pt-2">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="outline"
            :disabled="saving"
            @click="open = false"
          />
          <UButton
            type="submit"
            :label="confirmLabel || 'Confirmar'"
            :icon="confirmIcon || 'i-lucide-check'"
            :color="confirmColor"
            :loading="saving"
            :disabled="!canSubmit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>