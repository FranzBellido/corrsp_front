<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Cargo, CreateCargoPayload, UpdateCargoPayload } from '~/types/cargo'
import { cargoService } from '~/services/cargo.service'

const props = defineProps<{
  cargo?: Cargo | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)

const form = ref<CreateCargoPayload>({
  nombre: '',
  id_anterior: undefined,
  cargos_cod_depto: '',
  area_id: '',
  usuario_id: '',
})

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
      }
    } else {
      form.value = {
        nombre: '',
        id_anterior: undefined,
        cargos_cod_depto: '',
        area_id: '',
        usuario_id: '',
      }
    }
  },
  { immediate: true },
)

const handleSave = async () => {
  if (!form.value.nombre?.trim()) {
    toast.add({
      title: 'Validación',
      description: 'El nombre del cargo es obligatorio.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  saving.value = true
  try {
    const payload: CreateCargoPayload = {
      nombre: form.value.nombre.trim(),
      id_anterior: form.value.id_anterior ? Number(form.value.id_anterior) : undefined,
      cargos_cod_depto: form.value.cargos_cod_depto?.trim() || undefined,
      area_id: form.value.area_id || undefined,
      usuario_id: form.value.usuario_id || undefined,
    }

    if (isEditing.value && props.cargo?.id) {
      await cargoService.actualizar(props.cargo.id, payload as UpdateCargoPayload)
      toast.add({
        title: 'Cargo actualizado',
        description: 'El cargo ha sido modificado exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      await cargoService.crear(payload)
      toast.add({
        title: 'Cargo creado',
        description: 'El nuevo cargo fue registrado exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }

    open.value = false
    emit('guardado')
  } catch (error: any) {
    const errorMsg =
      error?.data?.message ||
      (Array.isArray(error?.data?.message) ? error.data.message.join(', ') : null) ||
      error?.message ||
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
      <form class="space-y-4" @submit.prevent="handleSave">
        <!-- Nombre del Cargo -->
        <UFormField label="Nombre del Cargo" required help="Denominación formal del cargo o puesto.">
          <UInput
            v-model="form.nombre"
            placeholder="Ej. JEFE DE UNIDAD FINANCIERA"
            icon="i-lucide-briefcase"
            class="w-full"
            autofocus
          />
        </UFormField>

        <!-- Código de Departamento -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Código de Departamento" help="Opcional. Identificador departamental.">
            <UInput
              v-model="form.cargos_cod_depto"
              placeholder="Ej. LPZ-ADM-01"
              icon="i-lucide-tag"
              class="w-full"
            />
          </UFormField>

          <UFormField label="ID Anterior (Migración)" help="Opcional. Identificador del sistema previo.">
            <UInput
              v-model.number="form.id_anterior"
              type="number"
              placeholder="Ej. 102"
              icon="i-lucide-hash"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Área asignada (CodificadorSelect) -->
        <UFormField label="Área / Unidad Organizacional" help="Seleccione el área a la que pertenece este cargo.">
          <CodificadorSelect
            v-model="form.area_id"
            endpoint="comun/codificador/areas"
            placeholder="Buscar y seleccionar área..."
            class="w-full"
          />
        </UFormField>

        <!-- Usuario asignado (CodificadorSelect) -->
        <UFormField label="Usuario Asignado (Opcional)" help="Funcionario que ocupa actualmente este cargo.">
          <CodificadorSelect
            v-model="form.usuario_id"
            endpoint="comun/codificador/usuarios"
            placeholder="Buscar y asignar funcionario..."
            class="w-full"
          />
        </UFormField>
      </form>
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
          @click="handleSave"
        />
      </div>
    </template>
  </UModal>
</template>
