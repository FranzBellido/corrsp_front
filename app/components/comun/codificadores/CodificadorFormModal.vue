<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  CodificadorAdmin,
  CreateCodificadorPayload,
  UpdateCodificadorPayload,
} from '~/types/codificador-admin'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  codificador?: CodificadorAdmin | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const schema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  descripcion: z.string().max(200).optional(),
  tipo_id: z.union([z.number(), z.null(), z.undefined()]).optional(),
})

type SchemaType = z.infer<typeof schema>

const form = ref<SchemaType>({
  nombre: '',
  descripcion: '',
  tipo_id: undefined,
})

const isEditing = computed(() => !!props.codificador?.codificadorId)

watch(
  () => props.codificador,
  (val) => {
    if (val) {
      form.value = {
        nombre: val.nombre?.trim() || '',
        descripcion: val.descripcion?.trim() || '',
        tipo_id: val.tipo_id ?? undefined,
      }
    } else {
      form.value = {
        nombre: '',
        descripcion: '',
        tipo_id: undefined,
      }
    }
  },
  { immediate: true },
)

const handleSave = async (event?: FormSubmitEvent<SchemaType>) => {
  const data = event?.data || form.value
  saving.value = true
  try {
    const payload: CreateCodificadorPayload = {
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || undefined,
      tipo_id: data.tipo_id != null ? Number(data.tipo_id) : undefined,
    }

    if (isEditing.value && props.codificador?.codificadorId) {
      await backendService.patch<CodificadorAdmin>(
        'codificadores',
        props.codificador.codificadorId,
        payload as UpdateCodificadorPayload,
      )
      toast.add({
        title: 'Codificador actualizado',
        description: 'Los cambios fueron guardados exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      await backendService.post<CodificadorAdmin>('codificadores', payload)
      toast.add({
        title: 'Codificador creado',
        description: 'El registro fue creado exitosamente.',
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
        'No se pudo guardar el codificador',
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
    :title="isEditing ? 'Editar Codificador' : 'Nuevo Codificador'"
    :description="isEditing ? 'Modifique el valor del catálogo.' : 'Registre un nuevo valor del catálogo institucional.'"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <UForm
        id="codificador-form"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <UFormField label="Tipo" name="tipo_id" help="Clasificación del catálogo (prioridad, instrucción, etc.).">
          <CodificadorSelect
            v-model="form.tipo_id"
            endpoint="comun/codificador/tipos"
            placeholder="Seleccione tipo..."
            class="w-full"
          />
        </UFormField>

        <UFormField label="Nombre" name="nombre" required>
          <UInput
            v-model="form.nombre"
            placeholder="Ej. Urgente"
            icon="i-lucide-tags"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField label="Descripción" name="descripcion">
          <UTextarea
            v-model="form.descripcion"
            placeholder="Descripción opcional del valor"
            class="w-full"
            :rows="3"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" :disabled="saving" @click="open = false" />
        <UButton
          :label="isEditing ? 'Guardar Cambios' : 'Registrar'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="codificador-form"
        />
      </div>
    </template>
  </UModal>
</template>
