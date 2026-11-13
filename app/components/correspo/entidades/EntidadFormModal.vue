<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CreateEntidadPayload, Entidad, UpdateEntidadPayload } from '~/types/entidad'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  entidad?: Entidad | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const schema = z.object({
  nombre_ent: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  estado: z.number().int(),
})

type SchemaType = z.infer<typeof schema>

const form = ref<SchemaType>({
  nombre_ent: '',
  estado: 1,
})

const isEditing = computed(() => !!props.entidad?.id)

const estadoActivo = computed({
  get: () => form.value.estado === 1,
  set: (val: boolean) => {
    form.value.estado = val ? 1 : 0
  },
})

watch(
  () => props.entidad,
  (val) => {
    if (val) {
      form.value = {
        nombre_ent: val.nombre_ent?.trim() || '',
        estado: val.estado ?? 1,
      }
    } else {
      form.value = {
        nombre_ent: '',
        estado: 1,
      }
    }
  },
  { immediate: true },
)

const handleSave = async (event?: FormSubmitEvent<SchemaType>) => {
  const data = event?.data || form.value
  saving.value = true
  try {
    const payload: CreateEntidadPayload = {
      nombre_ent: data.nombre_ent.trim(),
      estado: Number(data.estado),
    }

    if (isEditing.value && props.entidad?.id) {
      await backendService.patch<Entidad>('entidades', props.entidad.id, payload as UpdateEntidadPayload)
      toast.add({
        title: 'Entidad actualizada',
        description: 'Los cambios fueron guardados exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      await backendService.post<Entidad>('entidades', payload)
      toast.add({
        title: 'Entidad creada',
        description: 'La entidad fue registrada exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }

    open.value = false
    emit('guardado')
  } catch (error: any) {
    toast.add({
      title: 'Error al guardar',
      description:
        error?.data?.message ||
        (Array.isArray(error?.data?.message) ? error.data.message.join(', ') : null) ||
        error?.message ||
        'No se pudo guardar la entidad',
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
    :title="isEditing ? 'Editar Entidad' : 'Nueva Entidad'"
    :description="isEditing ? 'Modifique los datos de la entidad externa.' : 'Registre una entidad externa para correspondencia.'"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <UForm
        id="entidad-form"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <UFormField label="Nombre de la entidad" name="nombre_ent" required>
          <UInput
            v-model="form.nombre_ent"
            placeholder="Ej. Ministerio de Desarrollo Productivo"
            icon="i-lucide-landmark"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField label="Estado" name="estado">
          <UCheckbox
            v-model="estadoActivo"
            label="Entidad activa"
            description="Solo las entidades activas podrán seleccionarse en trámites."
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" :disabled="saving" @click="open = false" />
        <UButton
          :label="isEditing ? 'Guardar Cambios' : 'Registrar Entidad'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="entidad-form"
        />
      </div>
    </template>
  </UModal>
</template>
