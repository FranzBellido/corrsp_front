import { useProfile } from '~/composables/useProfile'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const nuxtApp = useNuxtApp() as any
  const $keycloak = nuxtApp.$keycloak

  // 1. Si no está autenticado en Keycloak, redirigir al login
  if ($keycloak && !$keycloak.authenticated) {
    return $keycloak.login({
      redirectUri: window.location.origin + to.fullPath
    })
  }

  // 2. Si ya está autenticado, validar si tiene el perfil guardado en localStorage
  if ($keycloak && $keycloak.authenticated) {
    const { profile, loadProfileFromStorage, fetchProfile } = useProfile()

    let userProfile = loadProfileFromStorage()

    // Si aún no está en localStorage ni cargado, obtenerlo del backend
    if (!userProfile && !profile.value) {
      userProfile = await fetchProfile()
    } else if (!userProfile && profile.value) {
      userProfile = profile.value
    }

    // Verificar si el perfil está completo en localStorage (especialmente si tiene cargos múltiples y requiere seleccionar cargo)
    const storedData = localStorage.getItem('user_profile_data')
    const needsCargoSelection = userProfile && userProfile.cargos && userProfile.cargos.length > 1 && !userProfile.cargo_activo_id

    // Si no está almacenado en localStorage o requiere seleccionar el cargo por defecto, redirigir a /settings
    if (!storedData || needsCargoSelection) {
      if (to.path !== '/settings') {
        return navigateTo('/settings')
      }
    }
  }
})
