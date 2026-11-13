<script setup lang="ts">
import { useKeycloakAccountLinks } from '~/composables/comun/useKeycloakAccountLinks'

const toast = useToast()
const {
  keycloak,
  realmLabel,
  signingInUrl,
  deviceActivityUrl,
  applicationsUrl,
  openAccountRoute,
} = useKeycloakAccountLinks('/settings/security')

const loadingPassword = ref(false)

async function cambiarContrasenaKeycloak() {
  const kc = keycloak.value
  if (!kc?.authenticated) {
    toast.add({
      title: 'Sesión no disponible',
      description: 'Debe iniciar sesión con Keycloak para cambiar la contraseña.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
    })
    return
  }

  loadingPassword.value = true
  try {
    await kc.login({
      action: 'UPDATE_PASSWORD',
      redirectUri: `${window.location.origin}/settings/security`,
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.add({
      title: 'No se pudo abrir Keycloak',
      description:
        err?.message
        || 'Verifique que la acción «Update Password» esté habilitada en el realm.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loadingPassword.value = false
  }
}

function abrirEnlaceAccount(
  route: 'security/signingin' | 'security/device-activity' | 'applications',
  tituloError: string,
) {
  if (!keycloak.value?.authenticated) {
    toast.add({
      title: 'Sesión no disponible',
      description: 'Inicie sesión con Keycloak para abrir la consola de cuenta.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
    })
    return
  }
  const ok = openAccountRoute(route)
  if (!ok) {
    toast.add({
      title: tituloError,
      description: 'No se pudo construir la URL de la consola de cuenta de Keycloak.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
    })
  }
}

onMounted(() => {
  if (!import.meta.client) return
  const params = new URLSearchParams(window.location.search)
  const status = params.get('kc_action_status')
  const action = params.get('kc_action')
  if (action === 'UPDATE_PASSWORD' || params.has('kc_action_status')) {
    if (status === 'success') {
      toast.add({
        title: 'Contraseña actualizada',
        description: 'Su contraseña de Keycloak se cambió correctamente.',
        color: 'success',
        icon: 'i-lucide-check',
      })
    } else if (status === 'cancelled') {
      toast.add({
        title: 'Cambio cancelado',
        description: 'No se modificó la contraseña.',
        color: 'neutral',
        icon: 'i-lucide-info',
      })
    } else if (status === 'error') {
      toast.add({
        title: 'Error al cambiar contraseña',
        description: 'Keycloak no pudo completar la actualización.',
        color: 'error',
        icon: 'i-lucide-alert-circle',
      })
    }
    window.history.replaceState({}, '', window.location.pathname)
  }
})
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="Contraseña"
      description="La autenticación la gestiona Keycloak. Cambie su contraseña en el servidor de identidad."
      variant="subtle"
    >
      <div class="flex flex-col gap-4 max-w-lg">
        <UAlert
          color="neutral"
          variant="subtle"
          icon="i-lucide-shield-check"
          title="Gestión centralizada"
          :description="`Se abrirá el formulario seguro de Keycloak; al terminar volverá a esta página.`"
        />

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            label="Cambiar contraseña"
            icon="i-lucide-key-round"
            color="primary"
            :loading="loadingPassword"
            :disabled="!keycloak?.authenticated"
            @click="cambiarContrasenaKeycloak"
          />

          <UButton
            v-if="signingInUrl"
            label="Credenciales de acceso"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            :disabled="!keycloak?.authenticated"
            @click="abrirEnlaceAccount('security/signingin', 'Enlace no disponible')"
          />
        </div>

        <p class="text-xs text-muted leading-relaxed">
          En el realm debe estar habilitada la acción requerida
          <code class="text-[11px]">Update Password</code>.
        </p>
      </div>
    </UPageCard>

    <UPageCard
      title="Actividad de la cuenta"
      description="Consulte inicios de sesión, dispositivos y aplicaciones conectadas en la consola de cuenta de Keycloak."
      variant="subtle"
    >
      <div class="flex flex-col gap-4 max-w-lg">
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-activity"
          title="Eventos y sesiones"
          description="Keycloak muestra la actividad reciente de su usuario (fechas, dispositivos y sesiones activas). Los detalles dependen de la configuración del realm."
        />

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            label="Ver actividad e inicios de sesión"
            icon="i-lucide-history"
            color="primary"
            variant="soft"
            :disabled="!keycloak?.authenticated || !deviceActivityUrl"
            @click="
              abrirEnlaceAccount(
                'security/device-activity',
                'Actividad no disponible',
              )
            "
          />

          <UButton
            v-if="applicationsUrl"
            label="Aplicaciones y sesiones"
            icon="i-lucide-layout-grid"
            color="neutral"
            variant="outline"
            :disabled="!keycloak?.authenticated"
            @click="
              abrirEnlaceAccount('applications', 'Enlace no disponible')
            "
          />
        </div>

        <p class="text-xs text-muted leading-relaxed">
          Se abrirá la
          <span class="font-medium text-default">Account Console</span>
          de Keycloak en una pestaña nueva. Tras revisar su actividad puede volver a esta
          aplicación.
        </p>
      </div>
    </UPageCard>
  </div>
</template>
