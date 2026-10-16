<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Cargo, CreateCargoPayload, UpdateCargoPayload } from '~/types/cargo'
import { TipoCodificadorEnum } from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'
import CodificadorSelect from '~/components/codificador/CodificadorSelect.vue'

const props = defineProps<{
  cargo?: Cargo | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const cargoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre del cargo es obligatorio')
    .max(255, 'No puede exceder 255 caracteres'),
  id_anterior: z.number().int().optional(),
  cargos_cod_depto: z.string().max(255, 'No puede exceder 255 caracteres').optional(),
  area_id: z.string().optional(),
  usuario_id: z.string().optional(),
  tipo_id: z.number({ message: 'Debe seleccionar el tipo de cargo' }).optional(),
  activa_transferencia: z.boolean().default(false),
})

type CargoSchemaType = z.infer<typeof cargoSchema>

const emptyForm = (): CargoSchemaType => ({
  nombre: '',
  id_anterior: undefined,
  cargos_cod_depto: '',
  area_id: '',
  usuario_id: '',
  tipo_id: undefined as unknown as number,
  activa_transferencia: false,
})

const form = ref<CargoSchemaType>(emptyForm())

const isEditing = computed(() => !!props.cargo?.id)

watch(
  () => props.cargo,
  (val) => {
    if (val) {
      form.value = {
        nombre: val.nombre || '',
        id_anterior: val.id_anterior,
        cargos_cod_depto: val.cargos_cod_depto || '',
        area_id: val.area_id || '',
        usuario_id: val.usuario_id || '',
        tipo_id: val.tipo_id ?? (val.codificador?.codificadorId as number | undefined),
        activa_transferencia: Boolean(val.activa_transferencia),
      }
    } else {
      form.value = emptyForm()
    }
  },
  { immediate: true },
)

const handleSave = async (event?: FormSubmitEvent<CargoSchemaType>) => {
  const data = event?.data || form.value

  saving.value = true
  try {
    const payload: CreateCargoPayload = {
      nombre: data.nombre.trim(),
      id_anterior: data.id_anterior !== undefined ? Number(data.id_anterior) : undefined,
      cargos_cod_depto: data.cargos_cod_depto?.trim() || undefined,
      area_id: data.area_id || undefined,
      usuario_id: data.usuario_id || undefined,
      tipo_id: data.tipo_id != null ? Number(data.tipo_id) : undefined,
      activa_transferencia: Boolean(data.activa_transferencia),
    }

    if (isEditing.value && props.cargo?.id) {
      await backendService.patch<Cargo>('cargos', props.cargo.id, payload as UpdateCargoPayload)
      toast.add({
        title: 'Cargo actualizado',
        description: 'El cargo ha sido modificado exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      await backendService.post<Cargo>('cargos', payload)
      toast.add({
        title: 'Cargo creado',
        description: 'El nuevo cargo fue registrado exitosamente.',
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
      'Ocurrió un error al procesar el cargo'

    toast.add({
      title: 'Error al guardar',
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
    :title="isEditing ? 'Editar Cargo' : 'Nuevo Cargo'"
    :description="isEditing ? 'Modifique los campos correspondientes del cargo.' : 'Ingrese la información para registrar un nuevo cargo institucional.'"
    :ui="{
      content: 'sm:max-w-xl',
    }"
  >
    <template #body>
      <UForm
        id="cargo-form"
        :schema="cargoSchema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <UFormField
          label="Nombre del Cargo"
          name="nombre"
          required
          help="Denominación formal del cargo o puesto."
        >
          <UInput
            v-model="form.nombre"
            placeholder="Ej. JEFE DE UNIDAD FINANCIERA"
            icon="i-lucide-briefcase"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField
          label="Tipo de cargo"
          name="tipo_id"
          help="Clasificación del cargo según el catálogo institucional (codificador tipo 3)."
        >
          <CodificadorSelect
            v-model="form.tipo_id"
            endpoint="comun/codificador"
            :params="{ tipo_id: TipoCodificadorEnum.TIPO_CARGO }"
            placeholder="Seleccione el tipo de cargo..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Área / Unidad Organizacional"
          name="area_id"
          help="Seleccione el área a la que pertenece este cargo."
        >
          <CodificadorSelect
            v-model="form.area_id"
            endpoint="comun/codificador/areas"
            placeholder="Buscar y seleccionar área..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Usuario Asignado (Opcional)"
          name="usuario_id"
          help="Funcionario que ocupa actualmente este cargo."
        >
          <CodificadorSelect
            v-model="form.usuario_id"
            endpoint="comun/codificador/usuarios"
            placeholder="Buscar y asignar funcionario..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Transferencia entre usuarios"
          name="activa_transferencia"
          help="Permite transferir correspondencia entre usuarios vinculados a este cargo."
        >
          <UCheckbox
            v-model="form.activa_transferencia"
            label="Activar transferencia"
            description="Habilita la transferencia de trámites entre usuarios del mismo cargo."
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          :disabled="saving"
          @click="open = false"
        />
        <UButton
          :label="isEditing ? 'Guardar Cambios' : 'Registrar Cargo'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="cargo-form"
        />
      </div>
    </template>
  </UModal>
</template>
