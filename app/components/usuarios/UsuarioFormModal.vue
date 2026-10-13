<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Usuario, CreateUsuarioPayload, UpdateUsuarioPayload, Rol } from '~/types/usuario'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  usuario?: Usuario | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)
const loadingRoles = ref(false)
const rolesDisponibles = ref<Rol[]>([])

// Esquema de validación con Zod
const usuarioSchema = z.object({
  nombre_completo: z
    .string()
    .trim()
    .min(1, 'El nombre completo es obligatorio')
    .max(150, 'No puede exceder 150 caracteres'),
  nombre_usuario: z
    .string()
    .trim()
    .min(3, 'Debe contener al menos 3 caracteres')
    .max(100, 'No puede exceder 100 caracteres'),
  email: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingrese un formato de correo electrónico válido')
    .max(100, 'No puede exceder 100 caracteres'),
  titulo: z.string().max(50, 'No puede exceder 50 caracteres').optional(),
  ni: z.string().max(20, 'No puede exceder 20 caracteres').optional(),
  emitido_en: z.string().max(5, 'Máximo 5 caracteres').optional(),
  activo: z.boolean().default(true),
  disponible: z.boolean().default(true),
  roles_ids: z.array(z.string()).default([]),
})

type UsuarioSchemaType = z.infer<typeof usuarioSchema>

const form = ref<UsuarioSchemaType>({
  nombre_completo: '',
  nombre_usuario: '',
  email: '',
  titulo: '',
  ni: '',
  emitido_en: '',
  activo: true,
  disponible: true,
  roles_ids: [],
})

const isEditing = computed(() => !!props.usuario?.id)

// Cargar roles disponibles desde el endpoint
const cargarRoles = async () => {
  loadingRoles.value = true
  try {
    const res = await backendService.get<Rol[]>('usuarios/roles')
    const data = (res as any)?.data || res
    rolesDisponibles.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error al cargar roles:', error)
  } finally {
    loadingRoles.value = false
  }
}

watch(
  () => props.usuario,
  (val) => {
    if (val) {
      form.value = {
        nombre_completo: val.nombre_completo || '',
        nombre_usuario: val.nombre_usuario || '',
        email: val.email || '',
        titulo: val.titulo || '',
        ni: val.ni || '',
        emitido_en: val.emitido_en || '',
        activo: val.activo ?? true,
        disponible: val.disponible ?? true,
        roles_ids: val.roles?.map((r) => r.id) || [],
      }
    } else {
      form.value = {
        nombre_completo: '',
        nombre_usuario: '',
        email: '',
        titulo: '',
        ni: '',
        emitido_en: '',
        activo: true,
        disponible: true,
        roles_ids: [],
      }
    }
  },
  { immediate: true },
)

onMounted(() => {
  cargarRoles()
})

const toggleRol = (rolId: string) => {
  const current = form.value.roles_ids || []
  if (current.includes(rolId)) {
    form.value.roles_ids = current.filter((id) => id !== rolId)
  } else {
    form.value.roles_ids = [...current, rolId]
  }
}

const handleSave = async (event?: FormSubmitEvent<UsuarioSchemaType>) => {
  const data = event?.data || form.value

  saving.value = true
  try {
    const payload: CreateUsuarioPayload = {
      nombre_completo: data.nombre_completo.trim(),
      nombre_usuario: data.nombre_usuario.trim(),
      email: data.email.trim(),
      activo: data.activo ?? true,
      disponible: data.disponible ?? true,
      ni: data.ni?.trim() || undefined,
      emitido_en: data.emitido_en?.trim() || undefined,
      titulo: data.titulo?.trim() || undefined,
      roles_ids: data.roles_ids || [],
    }

    if (isEditing.value && props.usuario?.id) {
      await backendService.patch<Usuario>('usuarios', props.usuario.id, payload as UpdateUsuarioPayload)
      toast.add({
        title: 'Usuario actualizado',
        description: 'La información y roles del usuario fueron actualizados exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      await backendService.post<Usuario>('usuarios', payload)
      toast.add({
        title: 'Usuario registrado',
        description: 'El nuevo usuario fue registrado con sus roles correspondientes.',
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
      'Ocurrió un error al procesar el usuario.'

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
    :title="isEditing ? 'Editar Usuario' : 'Nuevo Usuario'"
    :description="isEditing ? 'Actualice la información y asigne o modifique los roles del usuario.' : 'Ingrese los datos institucionales y asigne los roles correspondientes.'"
    :ui="{
      content: 'sm:max-w-xl',
    }"
  >
    <template #body>
      <UForm
        id="usuario-form"
        :schema="usuarioSchema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <!-- Nombre Completo -->
        <UFormField
          label="Nombre Completo"
          name="nombre_completo"
          required
          help="Nombres y apellidos completos del funcionario."
        >
          <UInput
            v-model="form.nombre_completo"
            placeholder="Ej. Juan Pérez García"
            icon="i-lucide-user"
            class="w-full"
            autofocus
          />
        </UFormField>

        <!-- Nombre de usuario y Correo -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            label="Nombre de Usuario"
            name="nombre_usuario"
            required
            help="Identificador de inicio de sesión institucional."
          >
            <UInput
              v-model="form.nombre_usuario"
              placeholder="Ej. jperez"
              icon="i-lucide-at-sign"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Correo Electrónico"
            name="email"
            required
            help="Correo corporativo o personal."
          >
            <UInput
              v-model="form.email"
              type="email"
              placeholder="Ej. jperez@afcoop.gob.bo"
              icon="i-lucide-mail"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Título Profesional -->
        <UFormField
          label="Título / Tratamiento"
          name="titulo"
          help="Título profesional o de cortesía (Ej: Lic., Ing., Abg., Dr.)."
        >
          <UInput
            v-model="form.titulo"
            placeholder="Ej. Ing., Lic., Abg."
            icon="i-lucide-graduation-cap"
            class="w-full"
          />
        </UFormField>

        <!-- Documento de Identidad (NI / CI) y Emitido en -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sm:col-span-2">
            <UFormField
              label="Número de Identificación (NI/CI)"
              name="ni"
              help="Cédula de Identidad del funcionario."
            >
              <UInput
                v-model="form.ni"
                placeholder="Ej. 6849201"
                icon="i-lucide-id-card"
                class="w-full"
              />
            </UFormField>
          </div>

          <div>
            <UFormField
              label="Emitido En"
              name="emitido_en"
              help="Lugar de expedición."
            >
              <UInput
                v-model="form.emitido_en"
                placeholder="Ej. LP, CB, SC"
                icon="i-lucide-map-pin"
                class="w-full uppercase"
                maxlength="5"
              />
            </UFormField>
          </div>
        </div>

        <!-- Estados: Activo y Disponible -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Estado Activo / Inactivo -->
          <div class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div class="flex flex-col pr-2">
              <span class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Activo</span>
              <span class="text-[11px] text-neutral-500">Acceso habilitado al sistema.</span>
            </div>
            <USwitch
              v-model="form.activo"
              color="primary"
            />
          </div>

          <!-- Estado Disponible -->
          <div class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div class="flex flex-col pr-2">
              <span class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Disponible</span>
              <span class="text-[11px] text-neutral-500">Disponible para derivaciones.</span>
            </div>
            <USwitch
              v-model="form.disponible"
              color="success"
            />
          </div>
        </div>

        <!-- Asignación de Roles -->
        <UFormField label="Roles del Sistema" help="Seleccione los permisos y niveles de acceso correspondientes.">
          <div v-if="loadingRoles" class="py-4 flex justify-center text-xs text-neutral-400">
            Cargando roles disponibles...
          </div>
          <div v-else-if="rolesDisponibles.length === 0" class="p-3 text-xs text-neutral-400 italic bg-neutral-50 dark:bg-neutral-900 rounded-lg">
            No se encontraron roles disponibles en la base de datos.
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div
              v-for="rol in rolesDisponibles"
              :key="rol.id"
              class="flex items-start gap-2.5 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none"
              :class="[
                (form.roles_ids || []).includes(rol.id)
                  ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20 text-primary-950 dark:text-primary-100 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/60'
              ]"
              @click="toggleRol(rol.id)"
            >
              <UCheckbox
                :model-value="(form.roles_ids || []).includes(rol.id)"
                class="mt-0.5 pointer-events-none"
              />
              <div class="flex flex-col">
                <span class="text-xs font-bold leading-tight">{{ rol.nombre }}</span>
                <span v-if="rol.descripcion" class="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                  {{ rol.descripcion }}
                </span>
              </div>
            </div>
          </div>
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
          :label="isEditing ? 'Guardar Cambios' : 'Registrar Usuario'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="usuario-form"
        />
      </div>
    </template>
  </UModal>
</template>
