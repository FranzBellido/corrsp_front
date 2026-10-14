<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
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
const uploadingFoto = ref(false)
const loadingFoto = ref(false)
const loadingRoles = ref(false)
const rolesDisponibles = ref<Rol[]>([])
const fotoPendiente = ref<File | null>(null)
const fotoPreviewLocal = ref<string | null>(null)
/** Blob URL resuelta desde storage (o http externo legado) */
const fotoUrlActual = ref<string | null>(null)
/** Clave MinIO persistida (ej: avatars/xxx.jpg) */
const fotoPathActual = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const MAX_FOTO_MB = 2
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const liberarBlobUrl = (url: string | null) => {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

const liberarPreviewLocal = () => {
  liberarBlobUrl(fotoPreviewLocal.value)
  fotoPreviewLocal.value = null
}

const liberarFotoActual = () => {
  liberarBlobUrl(fotoUrlActual.value)
  fotoUrlActual.value = null
}

const avatarFallback = computed(() => {
  const nombre = form.value.nombre_completo?.trim() || form.value.nombre_usuario?.trim() || 'Usuario'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=0BB69B&color=fff`
})

const avatarSrc = computed(() => fotoPreviewLocal.value || fotoUrlActual.value || avatarFallback.value)

const cargarFotoDesdeStorage = async (fotoPath: string | null | undefined) => {
  liberarFotoActual()
  fotoPathActual.value = fotoPath || null

  if (!fotoPath) {
    return
  }

  loadingFoto.value = true
  try {
    fotoUrlActual.value = await backendService.obtenerUrlDesdeStorage(fotoPath)
  } catch {
    fotoUrlActual.value = null
  } finally {
    loadingFoto.value = false
  }
}

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

const aplicarUsuarioAlFormulario = (val: Usuario | null | undefined) => {
  liberarPreviewLocal()
  fotoPendiente.value = null

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
    void cargarFotoDesdeStorage(val.foto_url)
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
    liberarFotoActual()
    fotoPathActual.value = null
  }
}

watch(() => props.usuario, aplicarUsuarioAlFormulario, { immediate: true })

watch(open, async (isOpen) => {
  if (!isOpen) {
    liberarPreviewLocal()
    fotoPendiente.value = null
    return
  }

  const val = props.usuario
  if (!val?.id) {
    return
  }

  try {
    const res = await backendService.getById<Usuario>('usuarios', val.id)
    const data = (res as { data?: Usuario })?.data ?? (res as Usuario)
    if (data?.foto_url && data.foto_url !== fotoPathActual.value) {
      await cargarFotoDesdeStorage(data.foto_url)
    } else if (!fotoUrlActual.value && (data?.foto_url || val.foto_url)) {
      await cargarFotoDesdeStorage(data?.foto_url || val.foto_url)
    }
  } catch {
    if (!fotoUrlActual.value && val.foto_url) {
      await cargarFotoDesdeStorage(val.foto_url)
    }
  }
})

onBeforeUnmount(() => {
  liberarPreviewLocal()
  liberarFotoActual()
})

const abrirSelectorFoto = () => {
  fileInputRef.value?.click()
}

const onFotoSeleccionada = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) {
    return
  }

  if (!TIPOS_FOTO.includes(file.type)) {
    toast.add({
      title: 'Archivo no válido',
      description: 'Seleccione una imagen JPG, PNG, WEBP o GIF.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  if (file.size > MAX_FOTO_MB * 1024 * 1024) {
    toast.add({
      title: 'Archivo muy grande',
      description: `La foto no puede superar ${MAX_FOTO_MB} MB.`,
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  liberarPreviewLocal()
  fotoPendiente.value = file
  fotoPreviewLocal.value = URL.createObjectURL(file)
}

const quitarFotoPendiente = () => {
  liberarPreviewLocal()
  fotoPendiente.value = null
}

const subirFotoUsuario = async (usuarioId: string) => {
  if (!fotoPendiente.value) {
    return
  }

  uploadingFoto.value = true
  try {
    const formData = new FormData()
    formData.append('file', fotoPendiente.value)

    const res = await backendService.patchMultipart<{ foto_url?: string }>(
      `storage/${usuarioId}/foto`,
      formData,
    )

    const fotoPath =
      (res as { foto_url?: string })?.foto_url ||
      (res as { data?: { foto_url?: string } })?.data?.foto_url

    liberarPreviewLocal()
    fotoPendiente.value = null

    if (fotoPath) {
      await cargarFotoDesdeStorage(fotoPath)
    }
  } catch (error: any) {
    const errorMsg =
      error?.data?.message ||
      (Array.isArray(error?.data?.message) ? error.data.message.join(', ') : null) ||
      error?.message ||
      'No se pudo subir la foto de perfil'

    toast.add({
      title: 'Error al subir foto',
      description: errorMsg,
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    throw error
  } finally {
    uploadingFoto.value = false
  }
}

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

    let usuarioId = props.usuario?.id

    if (isEditing.value && props.usuario?.id) {
      await backendService.patch<Usuario>('usuarios', props.usuario.id, payload as UpdateUsuarioPayload)
    } else {
      const creado = await backendService.post<Usuario>('usuarios', payload)
      const data = (creado as { data?: Usuario })?.data ?? (creado as Usuario)
      usuarioId = data?.id
    }

    const teniaFotoPendiente = Boolean(fotoPendiente.value && usuarioId)
    if (teniaFotoPendiente && usuarioId) {
      await subirFotoUsuario(usuarioId)
    }

    toast.add({
      title: isEditing.value ? 'Usuario actualizado' : 'Usuario registrado',
      description: teniaFotoPendiente
        ? 'Datos y foto de perfil guardados correctamente.'
        : isEditing.value
          ? 'La información y roles del usuario fueron actualizados exitosamente.'
          : 'El nuevo usuario fue registrado con sus roles correspondientes.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

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
        <div class="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-default bg-elevated/40">
          <UAvatar
            :key="avatarSrc"
            :src="avatarSrc"
            :alt="form.nombre_completo || 'Foto de perfil'"
            size="3xl"
            class="ring-2 ring-primary/20 shrink-0"
          />

          <div class="flex-1 space-y-2 min-w-0">
            <p class="text-sm font-semibold text-highlighted">Foto de perfil</p>
            <p class="text-xs text-muted">
              JPG, PNG, WEBP o GIF. Máximo {{ MAX_FOTO_MB }} MB. Se sube a almacenamiento institucional (MinIO).
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="hidden"
                @change="onFotoSeleccionada"
              >
              <UButton
                type="button"
                label="Seleccionar foto"
                icon="i-lucide-upload"
                color="primary"
                variant="soft"
                size="sm"
                :loading="uploadingFoto || loadingFoto"
                @click="abrirSelectorFoto"
              />
              <UButton
                v-if="fotoPendiente"
                type="button"
                label="Quitar selección"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="quitarFotoPendiente"
              />
            </div>
            <p v-if="!isEditing && fotoPendiente" class="text-[11px] text-muted">
              La imagen se subirá al guardar el nuevo usuario.
            </p>
          </div>
        </div>

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
          :loading="saving || uploadingFoto"
          type="submit"
          form="usuario-form"
        />
      </div>
    </template>
  </UModal>
</template>
