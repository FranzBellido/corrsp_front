<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { RecDepositoItem, UpdateRecDepositoPayload } from '~/types/recaudacion'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  deposito?: RecDepositoItem | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const schema = z.object({
  numero: z.string().trim().min(1, 'El número de boleta es obligatorio').max(200),
  importe: z.coerce.number().min(0.01, 'El importe debe ser mayor a 0'),
  fecha_deposito: z.string().min(1, 'La fecha de depósito es obligatoria'),
  observacion: z.string().max(500).optional().nullable(),
  verificado: z.boolean(),
})

type SchemaType = z.infer<typeof schema>

const form = ref<SchemaType>({
  numero: '',
  importe: 0,
  fecha_deposito: '',
  observacion: '',
  verificado: false,
})

const isEditing = computed(() => !!props.deposito?.id)

function toDateInputValue(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fechaToIso(dateOnly: string): string {
  if (!dateOnly) return dateOnly
  if (dateOnly.includes('T')) return dateOnly
  return `${dateOnly}T12:00:00.000Z`
}

watch(
  () => props.deposito,
  (val) => {
    if (val) {
      form.value = {
        numero: val.numero?.trim() || '',
        importe: Number(val.importe) || 0,
        fecha_deposito: toDateInputValue(val.fecha_deposito),
        observacion: val.observacion?.trim() || '',
        verificado: Boolean(val.verificado),
      }
    } else {
      form.value = {
        numero: '',
        importe: 0,
        fecha_deposito: '',
        observacion: '',
        verificado: false,
      }
    }
  },
  { immediate: true },
)

const handleSave = async (event?: FormSubmitEvent<SchemaType>) => {
  const data = event?.data || form.value
  if (!props.deposito?.id) return

  saving.value = true
  try {
    const payload: UpdateRecDepositoPayload = {
      numero: data.numero.trim(),
      importe: data.importe,
      fecha_deposito: fechaToIso(data.fecha_deposito),
      observacion: data.observacion?.trim() || null,
      verificado: data.verificado,
    }

    await backendService.patch<RecDepositoItem>(
      'recaudaciones',
      props.deposito.id,
      payload,
    )

    toast.add({
      title: 'Depósito actualizado',
      description: 'Los cambios fueron guardados correctamente.',
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
        (Array.isArray(err?.data?.message) ? err.data.message.join(', ') : err?.data?.message) ||
        err?.message ||
        'No se pudo actualizar el depósito',
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
    :title="isEditing ? 'Editar depósito' : 'Depósito'"
    description="Número, importe, fecha y observaciones del comprobante"
  >
    <template #body>
      <UForm :schema="schema" :state="form" class="space-y-4" @submit="handleSave">
        <UFormField label="Número de boleta" name="numero" required>
          <UInput v-model="form.numero" placeholder="Nº comprobante" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Importe (Bs.)" name="importe" required>
            <UInput v-model.number="form.importe" type="number" step="0.01" min="0.01" class="w-full" />
          </UFormField>
          <UFormField label="Fecha depósito" name="fecha_deposito" required>
            <UInput v-model="form.fecha_deposito" type="date" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Observaciones" name="observacion">
          <UTextarea
            v-model="form.observacion"
            placeholder="Notas opcionales"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Verificado" name="verificado">
          <USwitch v-model="form.verificado" />
        </UFormField>

        <div
          v-if="deposito?.correspondencia"
          class="rounded-md border border-default/60 bg-elevated/40 p-3 text-xs space-y-1"
        >
          <p class="font-semibold text-highlighted">Correspondencia vinculada</p>
          <p v-if="deposito.correspondencia.cite_origen" class="font-mono text-muted">
            CITE: {{ deposito.correspondencia.cite_origen }}
          </p>
          <p class="text-muted">Ref.: {{ deposito.correspondencia.referencia || '—' }}</p>
        </div>
      </UForm>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" :disabled="saving" @click="open = false" />
        <UButton
          label="Guardar"
          color="primary"
          icon="i-lucide-save"
          :loading="saving"
          @click="handleSave()"
        />
      </div>
    </template>
  </UModal>
</template>
