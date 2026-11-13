<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  CreatePoaVersionPayload,
  PoaVersion,
  UpdatePoaVersionPayload,
} from '~/types/poa/poa-version'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  version?: PoaVersion | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const schema = z.object({
  gestion: z.number().int().min(2000).max(2100),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(500),
  trimestre_activo: z.number().int().min(1).max(4),
  f_formulacion: z.string().optional().nullable(),
  f_seguimiento: z.string().optional().nullable(),
  activaalertasformulacion: z.boolean(),
  activaalertasseguimiento: z.boolean(),
})

type SchemaType = z.infer<typeof schema>

const form = ref<SchemaType>({
  gestion: new Date().getFullYear(),
  nombre: '',
  trimestre_activo: 1,
  f_formulacion: null,
  f_seguimiento: null,
  activaalertasformulacion: false,
  activaalertasseguimiento: false,
})

const isEditing = computed(() => !!props.version?.gestion)

const toInputDate = (value?: string | null) => {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

watch(
  () => props.version,
  (val) => {
    if (val) {
      form.value = {
        gestion: val.gestion,
        nombre: val.nombre || '',
        trimestre_activo: val.trimestre_activo ?? 1,
        f_formulacion: toInputDate(val.f_formulacion),
        f_seguimiento: toInputDate(val.f_seguimiento),
        activaalertasformulacion: val.activaalertasformulacion ?? false,
        activaalertasseguimiento: val.activaalertasseguimiento ?? false,
      }
    } else {
      form.value = {
        gestion: new Date().getFullYear(),
        nombre: '',
        trimestre_activo: 1,
        f_formulacion: null,
        f_seguimiento: null,
        activaalertasformulacion: false,
        activaalertasseguimiento: false,
      }
    }
  },
  { immediate: true },
)

const handleSave = async (event?: FormSubmitEvent<SchemaType>) => {
  const data = event?.data || form.value
  saving.value = true
  try {
    const payload: CreatePoaVersionPayload = {
      gestion: Number(data.gestion),
      nombre: data.nombre.trim(),
      trimestre_activo: Number(data.trimestre_activo),
      f_formulacion: data.f_formulacion || null,
      f_seguimiento: data.f_seguimiento || null,
      activaalertasformulacion: data.activaalertasformulacion,
      activaalertasseguimiento: data.activaalertasseguimiento,
    }

    if (isEditing.value && props.version?.gestion) {
      const { gestion: _gestion, ...updatePayload } = payload
      await backendService.patch<PoaVersion>(
        'poa-versiones',
        props.version.gestion,
        updatePayload as UpdatePoaVersionPayload,
      )
      toast.add({
        title: 'Versión actualizada',
        description: 'Los cambios de la versión POA fueron guardados.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      await backendService.post<PoaVersion>('poa-versiones', payload)
      toast.add({
        title: 'Versión creada',
        description: `Se registró la gestión ${payload.gestion}.`,
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
        'No se pudo guardar la versión POA',
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
    :title="isEditing ? 'Editar Versión POA' : 'Nueva Versión POA'"
    :description="isEditing ? 'Modifique los parámetros de la gestión.' : 'Registre una nueva gestión / versión del POA.'"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <UForm
        id="poa-version-form"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Gestión" name="gestion" required>
            <UInput
              v-model.number="form.gestion"
              type="number"
              :disabled="isEditing"
              icon="i-lucide-calendar"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UFormField label="Trimestre activo" name="trimestre_activo" required>
            <UInput
              v-model.number="form.trimestre_activo"
              type="number"
              min="1"
              max="4"
              icon="i-lucide-hash"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Nombre" name="nombre" required>
          <UInput
            v-model="form.nombre"
            placeholder="Ej. POA Gestión 2026"
            icon="i-lucide-file-text"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Fecha formulación" name="f_formulacion">
            <UInput v-model="form.f_formulacion" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Fecha seguimiento" name="f_seguimiento">
            <UInput v-model="form.f_seguimiento" type="date" class="w-full" />
          </UFormField>
        </div>

        <div class="space-y-3">
          <UCheckbox
            v-model="form.activaalertasformulacion"
            label="Alertas de formulación activas"
          />
          <UCheckbox
            v-model="form.activaalertasseguimiento"
            label="Alertas de seguimiento activas"
          />
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" :disabled="saving" @click="open = false" />
        <UButton
          :label="isEditing ? 'Guardar Cambios' : 'Registrar Versión'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="poa-version-form"
        />
      </div>
    </template>
  </UModal>
</template>
