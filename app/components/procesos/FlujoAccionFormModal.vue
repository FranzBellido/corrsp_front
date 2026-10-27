<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  FlujoAccion,
  CreateFlujoAccionPayload,
  UpdateFlujoAccionPayload,
  FlujoAccionEstado,
} from '~/types/flujo-accion'
import { TipoCodificadorEnum } from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'
import CodificadorSelect from '~/components/codificador/CodificadorSelect.vue'

const props = defineProps<{
  procId: number
  accion?: FlujoAccion | null
  estados: FlujoAccionEstado[]
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const flujoSchema = z.object({
  id_estado: z.number().int().optional(),
  desc_operacion: z.string().max(100).optional(),
  activo: z.boolean().default(true),
  cargo_origen_id: z.string().min(1, 'Seleccione el cargo de origen'),
  cargo_destino_id: z.string().min(1, 'Seleccione el cargo de destino'),
  instruccion_id: z.number().int().optional(),
  instruccion: z
    .string()
    .trim()
    .min(1, 'La instrucción es obligatoria')
    .max(100, 'No puede exceder 100 caracteres'),
})

type FlujoSchemaType = z.infer<typeof flujoSchema>

const emptyForm = (): FlujoSchemaType => ({
  id_estado: undefined,
  desc_operacion: '',
  activo: true,
  cargo_origen_id: '',
  cargo_destino_id: '',
  instruccion_id: undefined,
  instruccion: '',
})

const form = ref<FlujoSchemaType>(emptyForm())
const isEditing = computed(() => !!props.accion?.id)

const estadoOptions = computed(() =>
  props.estados.map((e) => ({
    label: e.nombre,
    value: e.id,
  })),
)

const estadoSeleccionado = computed({
  get: () => form.value.id_estado ?? undefined,
  set: (val: number | undefined) => {
    form.value.id_estado = val
  },
})

watch(
  () => props.accion,
  (val) => {
    if (val) {
      form.value = {
        id_estado: val.id_estado ?? undefined,
        desc_operacion: val.desc_operacion || '',
        activo: Boolean(val.activo),
        cargo_origen_id: val.cargo_origen_id || '',
        cargo_destino_id: val.cargo_destino_id || '',
        instruccion_id: val.instruccion_id ?? undefined,
        instruccion: val.instruccion || '',
      }
    } else {
      form.value = emptyForm()
    }
  },
  { immediate: true },
)

const onInstruccionTipoSelected = (item: { nombre?: string } | null) => {
  if (item?.nombre && !form.value.instruccion?.trim()) {
    form.value.instruccion = item.nombre.slice(0, 100)
  }
}

const endpointBase = computed(() => `procesos/${props.procId}/flujo-acciones`)

const handleSave = async (event?: FormSubmitEvent<FlujoSchemaType>) => {
  const data = event?.data || form.value

  if (data.cargo_origen_id === data.cargo_destino_id) {
    toast.add({
      title: 'Validación',
      description: 'El cargo de origen y destino deben ser distintos.',
      color: 'warning',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  saving.value = true
  try {
    const payload: CreateFlujoAccionPayload = {
      id_estado: data.id_estado != null ? Number(data.id_estado) : undefined,
      desc_operacion: data.desc_operacion?.trim() || undefined,
      activo: Boolean(data.activo),
      cargo_origen_id: data.cargo_origen_id,
      cargo_destino_id: data.cargo_destino_id,
      instruccion_id:
        data.instruccion_id != null ? Number(data.instruccion_id) : undefined,
      instruccion: data.instruccion.trim(),
    }

    if (isEditing.value && props.accion?.id) {
      await backendService.patch<FlujoAccion>(
        endpointBase.value,
        props.accion.id,
        payload as UpdateFlujoAccionPayload,
      )
      toast.add({
        title: 'Acción actualizada',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      await backendService.post<FlujoAccion>(endpointBase.value, payload)
      toast.add({
        title: 'Acción registrada',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }

    open.value = false
    emit('guardado')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string | string[] }; message?: string }
    const errorMsg =
      (Array.isArray(err?.data?.message) ? err.data.message.join(', ') : err?.data?.message) ||
      err?.message ||
      'No se pudo guardar la acción de flujo'
    toast.add({
      title: 'Error',
      description: errorMsg,
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
    :title="isEditing ? 'Editar acción de flujo' : 'Nueva acción de flujo'"
    description="Define el estado, cargos y la instrucción disponible en este proceso."
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <UForm
        id="flujo-accion-form"
        :schema="flujoSchema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            label="Estado asociado"
            name="id_estado"
            help="Estado del trámite en el que aplica esta acción (opcional)."
          >
            <USelectMenu
              v-model="estadoSeleccionado"
              :items="estadoOptions"
              value-key="value"
              label-key="label"
              placeholder="Sin estado específico"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Operación"
            name="desc_operacion"
            help="Nombre corto de la operación (opcional)."
          >
            <UInput
              v-model="form.desc_operacion"
              placeholder="Ej. Derivar a revisión"
              icon="i-lucide-git-branch"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          label="Cargo origen"
          name="cargo_origen_id"
          required
        >
          <CodificadorSelect
            v-model="form.cargo_origen_id"
            endpoint="comun/codificador/cargos"
            placeholder="Cargo que ejecuta la acción..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Cargo destino"
          name="cargo_destino_id"
          required
        >
          <CodificadorSelect
            v-model="form.cargo_destino_id"
            endpoint="comun/codificador/cargos"
            placeholder="Cargo receptor..."
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            label="Tipo de instrucción"
            name="instruccion_id"
            help="Catálogo tipo instrucción (opcional)."
          >
            <CodificadorSelect
              v-model="form.instruccion_id"
              endpoint="comun/codificador"
              :params="{ tipo_id: TipoCodificadorEnum.TIPO_INSTRUCCION }"
              placeholder="Seleccionar tipo..."
              class="w-full"
              @item-selected="onInstruccionTipoSelected"
            />
          </UFormField>

          <UFormField
            label="Texto de instrucción"
            name="instruccion"
            required
          >
            <UInput
              v-model="form.instruccion"
              placeholder="Texto que verá el usuario al derivar"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          name="activo"
        >
          <UCheckbox
            v-model="form.activo"
            label="Acción activa"
            description="Las acciones inactivas no se ofrecen en el flujo operativo."
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          :disabled="saving"
          @click="open = false"
        />
        <UButton
          :label="isEditing ? 'Guardar' : 'Registrar'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="flujo-accion-form"
        />
      </div>
    </template>
  </UModal>
</template>
