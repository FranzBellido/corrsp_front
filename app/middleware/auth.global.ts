import { useProfile } from '~/composables/useProfile'

const RUTA_ACCESO_DENEGADO = '/acceso-denegado'
const RUTA_BIENVENIDA = '/'
const RUTA_INICIO_APP = '/dashboard'

const rutasPublicas = new Set<string>([RUTA_BIENVENIDA])

function esRutaPublica(path: string) {
  return rutasPublicas.has(path)
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const nuxtApp = useNuxtApp() as { $keycloak?: { authenticated?: boolean; login: (o: { redirectUri: string }) => void } }
  const $keycloak = nuxtApp.$keycloak
  const accessDenied = useState<boolean>('access-denied', () => false)

  if (!$keycloak) return

  if (!$keycloak.authenticated) {
    if (esRutaPublica(to.path)) return
    return navigateTo(RUTA_BIENVENIDA)
  }

  if (to.path === RUTA_BIENVENIDA) {
    return navigateTo(RUTA_INICIO_APP)
  }

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
})
