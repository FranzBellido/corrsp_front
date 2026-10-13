<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useProfile } from '~/composables/useProfile'

const toast = useToast()
const { profile, loading, fetchProfile, loadProfileFromStorage, saveProfileToStorage } = useProfile()

onMounted(async () => {
  loadProfileFromStorage()
  if (!profile.value) {
    await fetchProfile()
  }
  syncFormFromProfile()
})

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
    
    // Si tiene un cargo ya seleccionado, lo usamos; si tiene solo 1, preseleccionarlo
    if (profile.value.cargo_activo_id) {
      state.cargo_activo_id = profile.value.cargo_activo_id
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

// Guardar configuración en localStorage y estado global
async function onSubmit(event: FormSubmitEvent<ProfileFormSchema>) {
  if (!profile.value) return

  // Si tiene al menos un cargo y no seleccionó ninguno, advertir
  if (profile.value.cargos && profile.value.cargos.length > 0 && !event.data.cargo_activo_id) {
    toast.add({
      title: 'Selección de cargo requerida',
      description: 'Debe seleccionar el cargo por defecto con el que trabajará.',
      icon: 'i-lucide-alert-triangle',
      color: 'warning'
    })
    return
  }

  // Buscar el cargo seleccionado para obtener los datos de su área
  let areaActivaId: string | null = null
  let areaActivaNombre: string | null = null
  if (event.data.cargo_activo_id && profile.value.cargos?.length) {
    const cargoMatch = profile.value.cargos.find(c => c.id === event.data.cargo_activo_id)
    if (cargoMatch?.area) {
      areaActivaId = cargoMatch.area.id
      areaActivaNombre = cargoMatch.area.nombre
    } else if (cargoMatch?.area_id) {
      areaActivaId = cargoMatch.area_id
    }
  }

  const updatedProfile = {
    ...profile.value,
    cargo_activo_id: event.data.cargo_activo_id || null,
    area_activa_id: areaActivaId,
    area_activa_nombre: areaActivaNombre
  }

  saveProfileToStorage(updatedProfile)

  toast.add({
    title: 'Configuración guardada',
    description: 'La información del perfil, cargo y área activa se guardaron correctamente en la sesión.',
    icon: 'i-lucide-check-circle',
    color: 'success'
  })

  // Redirigir a inicio una vez configurado
  navigateTo('/')
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
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <div class="flex items-center gap-4">
          <UAvatar
            :src="profile?.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.nombre_completo || 'Usuario')}&background=0BB69B&color=fff`"
            :alt="state.nombre_completo"
            size="xl"
            class="border border-neutral-200 dark:border-neutral-700 shadow-xs"
          />
          <div>
            <div class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {{ state.nombre_completo || 'Sin nombre' }}
            </div>
            <div class="text-xs text-neutral-400">
              {{ state.nombre_usuario }} &bull; {{ state.email }}
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
            <div class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col gap-1">
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
