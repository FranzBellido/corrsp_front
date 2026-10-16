import { useProfile } from '~/composables/useProfile'

const RUTA_ACCESO_DENEGADO = '/acceso-denegado'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const nuxtApp = useNuxtApp() as any
  const $keycloak = nuxtApp.$keycloak
  const accessDenied = useState<boolean>('access-denied', () => false)

  if ($keycloak && !$keycloak.authenticated) {
    return $keycloak.login({
      redirectUri: window.location.origin + to.fullPath,
    })
  }

  if ($keycloak && $keycloak.authenticated) {
    // Página pública para usuarios autenticados sin registro en BD
    if (to.path === RUTA_ACCESO_DENEGADO) {
      return
    }

    if (accessDenied.value) {
      return navigateTo(RUTA_ACCESO_DENEGADO)
    }

    const { fetchProfile, clearProfile } = useProfile()
    const profileSynced = useState<boolean>('profile-session-synced', () => false)

    if (!profileSynced.value) {
      try {
        await fetchProfile()
        profileSynced.value = true
        accessDenied.value = false
      } catch (error) {
        clearProfile()
        profileSynced.value = false

        const err = error as {
          statusCode?: number
          status?: number
          response?: { status?: number }
          data?: { statusCode?: number }
        }
        const status = err?.statusCode ?? err?.status ?? err?.response?.status ?? err?.data?.statusCode
        if (status === 404 || accessDenied.value) {
          accessDenied.value = true
          return navigateTo(RUTA_ACCESO_DENEGADO)
        }
      }
    }
  }
})
