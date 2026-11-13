import { useProfile } from '~/composables/comun/useProfile'
import {
  esRutaAdministracion,
  esRutaRecaudacion,
  isUsuarioNoRegistradoEnSistema,
  ROLE_PROC_ADMIN,
  ROLE_PROC_RECAUDACION,
  RUTA_ACCESO_DENEGADO,
} from '~/utils/comun/auth-access'

const RUTA_BIENVENIDA = '/'
const RUTA_INICIO_APP = '/dashboard'

const rutasPublicas = new Set<string>([RUTA_BIENVENIDA])

function esRutaPublica(path: string) {
  return rutasPublicas.has(path)
}

async function esperarKeycloakListo(timeoutMs = 8000) {
  const ready = useState<boolean>('keycloak-ready', () => false)
  if (ready.value) return
  const inicio = Date.now()
  while (!ready.value && Date.now() - inicio < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 40))
  }
}

async function asegurarPerfilSistema(): Promise<boolean> {
  const accessDenied = useState<boolean>('access-denied', () => false)
  const profileSynced = useState<boolean>('profile-session-synced', () => false)
  const { fetchProfile, clearProfile } = useProfile()

  if (profileSynced.value && !accessDenied.value) {
    return true
  }

  try {
    const perfil = await fetchProfile()
    if (accessDenied.value || !perfil) {
      accessDenied.value = true
      profileSynced.value = false
      clearProfile()
      return false
    }
    profileSynced.value = true
    accessDenied.value = false
    return true
  } catch (error) {
    clearProfile()
    profileSynced.value = false
    if (isUsuarioNoRegistradoEnSistema(error) || accessDenied.value) {
      accessDenied.value = true
      return false
    }
    return false
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  await esperarKeycloakListo()

  const nuxtApp = useNuxtApp() as {
    $keycloak?: {
      authenticated?: boolean
      login: (o: { redirectUri: string }) => void
      tokenParsed?: { realm_access?: { roles?: string[] } }
    }
  }
  const $keycloak = nuxtApp.$keycloak
  const accessDenied = useState<boolean>('access-denied', () => false)

  if (!$keycloak) return

  if (!$keycloak.authenticated) {
    if (esRutaPublica(to.path)) return
    return navigateTo(RUTA_BIENVENIDA)
  }

  if (to.path === RUTA_ACCESO_DENEGADO) {
    return
  }

  const perfilOk = await asegurarPerfilSistema()
  if (!perfilOk || accessDenied.value) {
    return navigateTo(RUTA_ACCESO_DENEGADO)
  }

  if (esRutaAdministracion(to.path)) {
    const roles = $keycloak.tokenParsed?.realm_access?.roles ?? []
    if (!roles.includes(ROLE_PROC_ADMIN)) {
      return navigateTo(RUTA_INICIO_APP)
    }
  }

  if (esRutaRecaudacion(to.path)) {
    const roles = $keycloak.tokenParsed?.realm_access?.roles ?? []
    if (!roles.includes(ROLE_PROC_RECAUDACION)) {
      return navigateTo(RUTA_INICIO_APP)
    }
  }

  if (to.path === RUTA_BIENVENIDA) {
    return navigateTo(RUTA_INICIO_APP)
  }
})
