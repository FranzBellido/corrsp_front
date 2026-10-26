<script setup lang="ts">
const { isAuthenticated } = useAuth()

const postLoginPath = '/dashboard'
const logoUrl = '/logo_afcoop1.png'

function ingresar() {
  if (isAuthenticated.value) {
    useState<boolean>('profile-session-synced', () => false).value = false
    navigateTo(postLoginPath)
    return
  }
  if (import.meta.client) {
    const redirectUri = `${window.location.origin}${postLoginPath}`
    const nuxtApp = useNuxtApp() as {
      $keycloak?: { login: (o: { redirectUri: string }) => void }
    }
    nuxtApp.$keycloak?.login({ redirectUri })
  }
}

const ingresarLabel = computed(() =>
  isAuthenticated.value ? 'Ir al sistema' : 'Ingresar al sistema',
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-default text-default pt-[3.5px]">
    <div class="bolivia-accent-bar fixed top-0 left-0 right-0 z-50" aria-hidden="true" />

    <UHeader
      class="sticky top-[3.5px] z-40 border-b border-default bg-default/90 backdrop-blur-md"
      :ui="{ container: 'max-w-7xl' }"
    >
      <template #title>
        <NuxtLink to="/" class="group flex items-center gap-3">
          <img
            :src="logoUrl"
            alt="AFCOOP"
            class="h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-105 sm:h-12"
          >
        </NuxtLink>
      </template>

      <template #right>
        <ClientOnly>
          <UColorModeButton variant="ghost" color="neutral" />
          <template #fallback>
            <span class="size-9" aria-hidden="true" />
          </template>
        </ClientOnly>
        <UButton
          :label="ingresarLabel"
          icon="i-lucide-log-in"
          color="primary"
          class="font-bold"
          @click="ingresar"
        />
      </template>

      <template #body>
        <div class="flex flex-col gap-3 px-2 py-4">
          <ClientOnly>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-muted">Apariencia</span>
              <UColorModeButton variant="outline" color="neutral" size="sm" />
            </div>
          </ClientOnly>
          <UButton
            :label="ingresarLabel"
            icon="i-lucide-log-in"
            block
            color="primary"
            class="font-bold"
            @click="ingresar"
          />
        </div>
      </template>
    </UHeader>

    <UMain class="flex-1">
      <slot />
    </UMain>

    <UFooter
      id="contacto"
      class="border-t border-default bg-elevated/50 py-8"
      :ui="{ container: 'max-w-7xl flex flex-col gap-6' }"
    >
      <template #left>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div class="flex items-center gap-3">
            <img :src="logoUrl" alt="AFCOOP" class="h-10 w-auto object-contain">
            <div>
              <p class="text-sm font-bold text-highlighted">
                AFCOOP
              </p>
              <p class="mt-1 text-[11px] text-muted">
                Autoridad de Fiscalización y Control de Cooperativas
              </p>
            </div>
          </div>
          <p class="text-xs text-muted max-w-sm">
            © {{ new Date().getFullYear() }} Sistema de Gestión de Procesos v1.
            AFFCOOP — La Paz, Bolivia.
          </p>
        </div>
      </template>

      <template #right>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted hidden sm:inline">Sistema de Correspondencia</span>
          <UButton
            to="mailto:contacto@afcoop.gob.bo"
            variant="soft"
            color="neutral"
            size="sm"
            label="Mesa de ayuda"
          />
          <UButton
            to="mailto:contacto@afcoop.gob.bo"
            icon="i-lucide-mail"
            color="neutral"
            variant="outline"
            square
            aria-label="Correo de contacto"
          />
        </div>
      </template>
    </UFooter>
  </div>
</template>

<style scoped>
.bolivia-accent-bar {
  height: 3.5px;
  background: linear-gradient(
    90deg,
    #d8232a 0%,
    #d8232a 33.3%,
    #f8cf1c 33.3%,
    #f8cf1c 66.6%,
    #007934 66.6%,
    #007934 100%
  );
}
</style>
