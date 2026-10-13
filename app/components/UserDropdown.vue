<script setup lang="ts">
const { user, login, logout, isAuthenticated } = useAuth()
const { profile, cargoActivo, fetchProfile, loadProfileFromStorage } = useProfile()

onMounted(() => {
  if (isAuthenticated.value) {
    loadProfileFromStorage()
    if (!profile.value) {
      fetchProfile()
    }
  }
})

// Nombre a mostrar priorizando nombre_completo de la BD
const displayName = computed(() => {
  if (profile.value?.nombre_completo) {
    return profile.value.nombre_completo
  }
  if (profile.value?.nombre_usuario) {
    return profile.value.nombre_usuario
  }
  return user.value?.name || 'Usuario'
})

// Cargo activo con el que trabaja el sistema
const displayCargo = computed(() => {
  if (cargoActivo.value) {
    return cargoActivo.value.nombre
  }
  if (profile.value?.roles && profile.value.roles.length > 0) {
    return profile.value.roles.map(r => r.nombre).join(', ')
  }
  if (user.value?.roles?.length) {
    return user.value.roles.join(', ')
  }
  return 'Personal AFCOOP'
})

// Área del cargo activo
const displayArea = computed(() => {
  if (cargoActivo.value?.area) {
    return cargoActivo.value.area.nombre
  }
  return ''
})

const displayEmail = computed(() => {
  return profile.value?.email || user.value?.email || ''
})

const avatarUrl = computed(() => {
  if (profile.value?.foto_url) {
    return profile.value.foto_url
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName.value)}&background=0BB69B&color=fff`
})

const items = computed(() => {
  const infoSection: any[] = [
    {
      label: displayEmail.value || 'Sesión Activa',
      icon: 'i-lucide-mail',
      disabled: true
    }
  ]

  if (displayCargo.value) {
    infoSection.push({
      label: `Cargo: ${displayCargo.value}`,
      icon: 'i-lucide-briefcase',
      disabled: true
    })
  }

  if (displayArea.value) {
    infoSection.push({
      label: `Área: ${displayArea.value}`,
      icon: 'i-lucide-building-2',
      disabled: true
    })
  }

  if (profile.value?.roles && profile.value.roles.length > 0) {
    const rolesStr = profile.value.roles.map(r => r.nombre).join(', ')
    infoSection.push({
      label: `Roles: ${rolesStr}`,
      icon: 'i-lucide-shield-check',
      disabled: true
    })
  }

  return [
    infoSection,
    [
      {
        label: 'Configuración de Perfil',
        icon: 'i-lucide-settings',
        to: '/settings'
      },
      {
        label: 'Cerrar Sesión',
        icon: 'i-lucide-log-out',
        color: 'error' as const,
        onSelect: () => {
          logout()
        }
      }
    ]
  ]
})
</script>

<template>
  <div v-if="isAuthenticated">
    <UDropdownMenu
      :items="items"
      :content="{
        align: 'end',
        sideOffset: 8
      }"
    >
      <UButton
        variant="ghost"
        color="neutral"
        class="gap-3 p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <UAvatar
          :src="avatarUrl"
          :alt="displayName"
          size="md"
          class="border border-neutral-200 dark:border-neutral-700 shadow-sm"
        />
        <div class="hidden sm:flex flex-col items-start leading-tight text-left">
          <span class="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[150px]">
            {{ displayName }}
          </span>
          <span class="text-[10px] text-neutral-400 font-medium capitalize truncate max-w-[150px]">
            {{ displayCargo }}
          </span>
          <span v-if="displayArea" class="text-[9px] text-primary-500 font-normal truncate max-w-[150px]">
            {{ displayArea }}
          </span>
        </div>
        <UIcon name="i-lucide-chevron-down" class="size-4 text-neutral-400 hidden sm:block" />
      </UButton>
    </UDropdownMenu>
  </div>
  <div v-else>
    <UButton
      label="Iniciar Sesión"
      icon="i-lucide-log-in"
      color="primary"
      size="sm"
      @click="login"
    />
  </div>
</template>
