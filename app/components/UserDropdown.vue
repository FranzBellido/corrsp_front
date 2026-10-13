<script setup lang="ts">
const { user, login, logout, isAuthenticated } = useAuth()
const { profile, fetchProfile } = useProfile()

onMounted(() => {
  if (isAuthenticated.value && !profile.value) {
    fetchProfile()
  }
})

const displayName = computed(() => {
  if (profile.value) {
    const fullName = `${profile.value.firstName || ''} ${profile.value.lastName || ''}`.trim()
    return fullName || profile.value.username || user.value?.name || 'Usuario'
  }
  return user.value?.name || 'Usuario'
})

const displayRole = computed(() => {
  if (profile.value?.roles?.length) {
    return profile.value.roles.join(', ')
  }
  if (user.value?.roles?.length) {
    return user.value.roles.join(', ')
  }
  return 'Personal AFCOOP'
})

const displayEmail = computed(() => {
  return profile.value?.email || user.value?.email || ''
})

const items = computed(() => [
  [
    {
      label: displayEmail.value || 'Sesión Activa',
      icon: 'i-lucide-mail',
      disabled: true
    }
  ],
  [
    {
      label: 'Configuración',
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
])
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
          :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0BB69B&color=fff`"
          :alt="displayName"
          size="md"
          class="border border-neutral-200 dark:border-neutral-700 shadow-sm"
        />
        <div class="hidden sm:flex flex-col items-start leading-tight text-left">
          <span class="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[140px]">
            {{ displayName }}
          </span>
          <span class="text-[10px] text-neutral-400 font-medium capitalize truncate max-w-[140px]">
            {{ displayRole }}
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
