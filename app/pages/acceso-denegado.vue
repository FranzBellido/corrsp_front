<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})

useHead({
  title: 'Sin acceso - Correspondencia AFCOOP',
})

const { user, logout } = useAuth()
const { clearProfile } = useProfile()

const username = computed(
  () => user.value?.preferred_username || user.value?.name || 'su cuenta',
)

const handleLogout = () => {
  clearProfile()
  useState<boolean>('profile-session-synced', () => false).value = false
  useState<boolean>('access-denied', () => false).value = false
  logout()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-lg text-center space-y-6">
      <div
        class="mx-auto size-16 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center"
      >
        <UIcon name="i-lucide-shield-off" class="size-8" />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-bold tracking-tight">
          No tiene acceso al sistema
        </h1>
        <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          La cuenta
          <span class="font-semibold text-neutral-800 dark:text-neutral-200">{{ username }}</span>
          está autenticada, pero
          <strong>no está registrada</strong>
          en el sistema de correspondencia.
        </p>
        <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Consulte con el administrador para que habilite su usuario
          (<span class="font-mono text-xs">nombre_usuario</span>) y le asigne cargos y roles.
        </p>
      </div>

      <div
        class="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/20 p-4 text-left text-xs text-amber-900 dark:text-amber-200/90 space-y-1"
      >
        <p class="font-semibold flex items-center gap-1.5">
          <UIcon name="i-lucide-info" class="size-3.5" />
          ¿Qué hacer?
        </p>
        <ul class="list-disc pl-5 space-y-1 text-amber-800/90 dark:text-amber-200/80">
          <li>Solicite al administrador el alta de su usuario en el módulo de Usuarios.</li>
          <li>Verifique que su usuario de Keycloak coincida con el nombre de usuario del sistema.</li>
          <li>Cierre sesión e intente nuevamente cuando le confirmen el acceso.</li>
        </ul>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <UButton
          label="Cerrar sesión"
          color="primary"
          icon="i-lucide-log-out"
          class="rounded-xl px-5 h-10 font-bold"
          @click="handleLogout"
        />
      </div>
    </div>
  </div>
</template>
