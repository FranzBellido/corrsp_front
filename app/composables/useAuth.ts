export function useAuth() {
  const nuxtApp = useNuxtApp() as any
  const $keycloak = nuxtApp.$keycloak

  const logout = () => {
    if (import.meta.client && $keycloak) {
      // Limpiar solo datos de la sesión actual, preservando las preferencias en localStorage
      sessionStorage.clear()
      const { profile, needsCargoSelection } = useProfile()
      profile.value = null
      needsCargoSelection.value = false

      $keycloak.logout({
        redirectUri: window.location.origin
      })
    }
  }

  const login = () => {
    if (import.meta.client && $keycloak) {
      $keycloak.login({
        redirectUri: window.location.origin + window.location.pathname
      })
    }
  }

  const user = computed(() => {
    if ($keycloak?.tokenParsed) {
      return {
        name: $keycloak.tokenParsed.name || $keycloak.tokenParsed.preferred_username || 'Usuario',
        preferred_username: $keycloak.tokenParsed.preferred_username,
        email: $keycloak.tokenParsed.email || '',
        roles: $keycloak.tokenParsed.realm_access?.roles || []
      }
    }
    return null
  })

  const isAuthenticated = computed(() => {
    return Boolean($keycloak?.authenticated)
  })

  const hasRole = (role: string) => {
    return user.value?.roles.includes(role) || false
  }

  return {
    user,
    isAuthenticated,
    hasRole,
    login,
    logout
  }
}
