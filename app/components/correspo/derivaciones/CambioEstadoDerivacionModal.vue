<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CambiarEstadoPayload } from '~/types/estado'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  derivacionId: string | null
  estadoId: number | null
  titulo: string
  descripcion?: string
  confirmLabel?: string
  confirmIcon?: string
  confirmColor?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'secondary'
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'cambiado'): void
}>()

const toast = useToast()
const { resolveCargoOrigenId } = useProfile()
const saving = ref(false)

const schema = z.object({
  observaciones: z
    .string()
    .trim()
    .max(500, 'No puede exceder 500 caracteres'),
})

type FormState = z.infer<typeof schema>

const form = ref<FormState>({ observaciones: '' })

const canSubmit = computed(
  () => Boolean(props.derivacionId && props.estadoId),
)

watch(open, (isOpen) => {
  if (isOpen) {
    form.value = { observaciones: '' }
  }
})

const onSubmit = async (event: FormSubmitEvent<FormState>) => {
  if (!props.derivacionId || !props.estadoId) return

  saving.value = true
  try {
    const cargoId = resolveCargoOrigenId()
    const payload: CambiarEstadoPayload = {
      estado_id: props.estadoId,
      observaciones: event.data.observaciones.trim(),
      ...(cargoId ? { cargo_id: cargoId } : {}),
    }
    await backendService.patch(`derivaciones`, `${props.derivacionId}/estado`, payload)
    toast.add({
      title: 'Estado actualizado',
      description: 'El cambio de estado se registró correctamente.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    open.value = false
    emit('cambiado')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string | string[] }; message?: string }
    const msg = err?.data?.message
    toast.add({
      title: 'No se pudo cambiar el estado',
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
    :title="titulo"
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
            :color="confirmColor || 'primary'"
            :loading="saving"
            :disabled="!canSubmit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
