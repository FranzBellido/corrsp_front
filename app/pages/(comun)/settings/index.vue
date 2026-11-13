<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useProfile } from '~/composables/useProfile'
import { backendService } from '~/services/backend.service'

const toast = useToast()
const { profile, loading, fetchProfile, loadProfileFromStorage, saveProfileToStorage, setCargoActivo } = useProfile()

const uploadingFoto = ref(false)
const loadingFoto = ref(false)
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
  const nombre = state.nombre_completo?.trim() || state.nombre_usuario?.trim() || 'Usuario'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=0BB69B&color=fff`
})

const avatarSrc = computed(
  () => fotoPreviewLocal.value || fotoUrlActual.value || avatarFallback.value,
)

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

watch(
  () => profile.value?.foto_url,
  (path) => {
    if (!fotoPreviewLocal.value && path !== fotoPathActual.value) {
      void cargarFotoDesdeStorage(path)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  liberarPreviewLocal()
  liberarFotoActual()
})

onMounted(async () => {
  loadProfileFromStorage()
  if (!profile.value) {
    await fetchProfile()
  }
  syncFormFromProfile()
  if (profile.value?.foto_url && profile.value.foto_url !== fotoPathActual.value) {
    await cargarFotoDesdeStorage(profile.value.foto_url)
  }
})

const abrirSelectorFoto = () => {
  fileInputRef.value?.click()
}

const onFotoSeleccionada = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file || !profile.value?.id) {
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
  fotoPreviewLocal.value = URL.createObjectURL(file)

  uploadingFoto.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await backendService.patchMultipart<{ foto_url?: string }>(
      `storage/${profile.value.id}/foto`,
      formData,
    )

    const fotoPath =
      (res as { foto_url?: string })?.foto_url ||
      (res as { data?: { foto_url?: string } })?.data?.foto_url

    liberarPreviewLocal()

    if (fotoPath) {
      await cargarFotoDesdeStorage(fotoPath)
      saveProfileToStorage({
        ...profile.value,
        foto_url: fotoPath,
      })
    }

    toast.add({
      title: 'Foto actualizada',
      description: 'Su fotografía de perfil se guardó correctamente.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } catch (error: unknown) {
    liberarPreviewLocal()
    const err = error as { data?: { message?: string | string[] }; message?: string }
    const errorMsg =
      err?.data?.message ||
      (Array.isArray(err?.data?.message) ? err.data.message.join(', ') : null) ||
      err?.message ||
      'No se pudo subir la foto de perfil'

    toast.add({
      title: 'Error al subir foto',
      description: errorMsg,
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    uploadingFoto.value = false
  }
}

// Esquema Zod de validación
const profileSchema = z.object({
  nombre_completo: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Correo electrónico no válido'),
  nombre_usuario: z.string().min(2, 'Nombre de usuario requerido'),
  ni: z.string().optional(),
  emitido_en: z.string().optional(),
  titulo: z.string().optional(),
  cargo_activo_id: z.string().optional()
})

type ProfileFormSchema = z.output<typeof profileSchema>

const state = reactive<Partial<ProfileFormSchema>>({
  nombre_completo: '',
  email: '',
  nombre_usuario: '',
  ni: '',
  emitido_en: '',
  titulo: '',
  cargo_activo_id: undefined
})

function syncFormFromProfile() {
  if (profile.value) {
    state.nombre_completo = profile.value.nombre_completo || ''
    state.email = profile.value.email || ''
    state.nombre_usuario = profile.value.nombre_usuario || ''
    state.ni = profile.value.ni || ''
    state.emitido_en = profile.value.emitido_en || ''
    state.titulo = profile.value.titulo || ''
    
    const cargoId = profile.value.cargo_id || profile.value.cargo_activo_id
    if (cargoId) {
      state.cargo_activo_id = cargoId
    } else if (profile.value.cargos && profile.value.cargos.length === 1 && profile.value.cargos[0]) {
      state.cargo_activo_id = profile.value.cargos[0].id
    } else {
      state.cargo_activo_id = undefined
    }
  }
}

watch(
  () => profile.value,
  () => {
    syncFormFromProfile()
  },
  { deep: true }
)

// Opciones de cargos para el selector
const cargoItems = computed(() => {
  if (!profile.value?.cargos) return []
  return profile.value.cargos.map((cargo) => ({
    label: `${cargo.nombre} ${cargo.area ? '— ' + cargo.area.nombre : ''}`,
    value: cargo.id
  }))
})

const primerCargo = computed(() => {
  return profile.value?.cargos?.[0] || null
})

// Persiste cargo activo en BD (usuarios.cargo_id) y sincroniza sesión
async function onSubmit(event: FormSubmitEvent<ProfileFormSchema>) {
  if (!profile.value) return

  if (profile.value.cargos && profile.value.cargos.length > 0 && !event.data.cargo_activo_id) {
    toast.add({
      title: 'Selección de cargo requerida',
      description: 'Debe seleccionar el cargo por defecto con el que trabajará.',
      icon: 'i-lucide-alert-triangle',
      color: 'warning',
    })
    return
  }

  try {
    if (event.data.cargo_activo_id) {
      await setCargoActivo(event.data.cargo_activo_id)
    }

    toast.add({
      title: 'Configuración guardada',
      description: 'El cargo de trabajo se actualizó correctamente en su perfil.',
      icon: 'i-lucide-check-circle',
      color: 'success',
    })

    navigateTo('/')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo guardar',
      description: err?.data?.message || err?.message || 'Error al actualizar el cargo activo.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}
</script>

<template>
  <div v-if="loading" class="flex flex-col items-center justify-center p-12 gap-3 text-neutral-400">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary-500" />
    <span class="text-sm">Cargando datos del perfil...</span>
  </div>

  <UForm
    v-else
    id="settings"
    :schema="profileSchema"
    :state="state"
    class="flex flex-col gap-6"
    @submit="onSubmit"
  >
    <UPageCard
      title="Perfil de Usuario"
      description="Información personal y configuración de cargo de trabajo en el sistema."
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    >
      <UButton
        form="settings"
        label="Guardar Configuración"
        color="primary"
        type="submit"
        icon="i-lucide-save"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <!-- Alerta si tiene múltiples cargos pendientes de selección -->
    <UAlert
      v-if="profile?.cargos && profile.cargos.length > 1 && !state.cargo_activo_id"
      color="warning"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Acción requerida: Seleccione su cargo por defecto"
      description="Usted cuenta con múltiples cargos asignados en la institución. Por favor elija el cargo con el que operará en el sistema de correspondencia."
    />

    <UPageCard variant="subtle">
      <!-- Avatar y resumen -->
      <UFormField
        label="Fotografía / Avatar"
        description="Identificador visual del usuario."
        class="flex max-sm:flex-col justify-between sm:items-start gap-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:max-w-md">
          <UAvatar
            :key="avatarSrc"
            :src="avatarSrc"
            :alt="state.nombre_completo || 'Foto de perfil'"
            size="3xl"
            class="ring-2 ring-primary/20 shrink-0 border border-neutral-200 dark:border-neutral-700"
          />

          <div class="flex-1 space-y-2 min-w-0">
            <div>
              <div class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {{ state.nombre_completo || 'Sin nombre' }}
              </div>
              <div class="text-xs text-neutral-400">
                {{ state.nombre_usuario }} &bull; {{ state.email }}
              </div>
            </div>
            <p class="text-xs text-muted">
              JPG, PNG, WEBP o GIF. Máximo {{ MAX_FOTO_MB }} MB.
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="hidden"
                :disabled="uploadingFoto || !profile?.id"
                @change="onFotoSeleccionada"
              >
              <UButton
                type="button"
                :label="fotoPathActual || profile?.foto_url ? 'Cambiar foto' : 'Subir foto'"
                icon="i-lucide-upload"
                color="primary"
                variant="soft"
                size="sm"
                :loading="uploadingFoto || loadingFoto"
                :disabled="!profile?.id"
                @click="abrirSelectorFoto"
              />
            </div>
          </div>
        </div>
      </UFormField>

      <USeparator />

      <!-- Nombre Completo -->
      <UFormField
        name="nombre_completo"
        label="Nombre Completo"
        description="Nombre oficial registrado en la base de datos institucional."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="state.nombre_completo"
          disabled
          class="w-full sm:w-80"
        />
      </UFormField>

      <USeparator />

      <!-- Nombre de Usuario -->
      <UFormField
        name="nombre_usuario"
        label="Nombre de Usuario (Username)"
        description="Cuenta única institucional."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="state.nombre_usuario"
          disabled
          class="w-full sm:w-80"
        />
      </UFormField>

      <USeparator />

      <!-- Correo Electrónico -->
      <UFormField
        name="email"
        label="Correo Electrónico"
        description="Dirección de correo institucional."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="state.email"
          type="email"
          disabled
          class="w-full sm:w-80"
        />
      </UFormField>

      <USeparator />

      <!-- Identificación y Título -->
      <UFormField
        label="Datos de Identificación"
        description="Cédula de identidad (NI/CI) y grado o título."
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <div class="flex flex-wrap gap-2 w-full sm:w-80">
          <UInput
            v-model="state.ni"
            placeholder="C.I. / NI"
            disabled
            class="flex-1 min-w-[120px]"
          />
          <UInput
            v-model="state.emitido_en"
            placeholder="Expedido"
            disabled
            class="w-20"
          />
          <UInput
            v-model="state.titulo"
            placeholder="Título / Grado"
            disabled
            class="w-full"
          />
        </div>
      </UFormField>

      <USeparator />

      <!-- SELECCIÓN DE CARGO POR DEFECTO -->
      <UFormField
        name="cargo_activo_id"
        label="Cargo Institucional de Trabajo"
        :description="profile?.cargos && profile.cargos.length > 1
          ? 'Posee más de un cargo asignado. Seleccione el cargo con el que gestionará documentos y correspondencia.'
          : 'Cargo oficial asignado en la entidad.'"
        :required="Boolean(profile?.cargos?.length)"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <div class="w-full sm:w-80 flex flex-col gap-2">
          <!-- Selector si tiene múltiples cargos -->
          <template v-if="profile?.cargos && profile.cargos.length > 1">
            <USelect
              v-model="state.cargo_activo_id"
              :items="cargoItems"
              value-key="value"
              placeholder="Seleccione su cargo por defecto..."
              class="w-full"
            />
            <span class="text-xs text-neutral-400">
              Este cargo y su área asociada se utilizarán para firmas, despachos y derivaciones.
            </span>
          </template>

          <!-- Vista fija si solo tiene 1 cargo -->
          <template v-else-if="primerCargo">
            <div class="p-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col gap-1">
              <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <UIcon name="i-lucide-briefcase" class="size-4 text-primary-500" />
                {{ primerCargo.nombre }}
              </span>
              <span v-if="primerCargo.area" class="text-[11px] text-neutral-500 flex items-center gap-1.5">
                <UIcon name="i-lucide-building-2" class="size-3.5 text-neutral-400" />
                {{ primerCargo.area.nombre }} ({{ primerCargo.area.codigo }})
              </span>
            </div>
          </template>

          <!-- Si no tiene cargos asignados -->
          <template v-else>
            <div class="text-xs text-neutral-400 italic">
              No tiene cargos asignados actualmente en la base de datos.
            </div>
          </template>
        </div>
      </UFormField>

      <USeparator />

      <!-- Roles del sistema -->
      <UFormField
        label="Roles de Acceso Asignados"
        description="Privilegios de permisos institucionales otorgados."
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <div class="flex flex-wrap gap-1.5 max-w-sm">
          <UBadge
            v-for="rol in profile?.roles"
            :key="rol.id"
            color="primary"
            variant="subtle"
            size="sm"
            class="capitalize"
          >
            {{ rol.nombre }}
          </UBadge>
          <span v-if="!profile?.roles?.length" class="text-xs text-neutral-400">
            Sin roles asignados
          </span>
        </div>
      </UFormField>
    </UPageCard>
  </UForm>
</template>
