import type Keycloak from 'keycloak-js'

/** Rutas hash de la Account Console de Keycloak (v2+). */
export type KeycloakAccountHashRoute =
  | 'security/signingin'
  | 'security/device-activity'
  | 'applications'

/**
 * URLs de la consola de cuenta Keycloak para el usuario autenticado.
 */
export function useKeycloakAccountLinks(redirectPath = '/settings/security') {
  const { $keycloak } = useNuxtApp()
  const config = useRuntimeConfig()

  const keycloak = computed(() => $keycloak as Keycloak | undefined)

  const redirectUri = computed(() => {
    if (!import.meta.client) return redirectPath
    return `${window.location.origin}${redirectPath}`
  })

  const accountBaseUrl = computed(() => {
    const kc = keycloak.value
    if (!kc?.authenticated) return null
    try {
      const url = kc.createAccountUrl({ redirectUri: redirectUri.value })
      if (!url) return null
      return url.replace(/#.*$/, '')
    } catch {
      return null
    }
  })

  function urlWithHash(route: KeycloakAccountHashRoute): string | null {
    const base = accountBaseUrl.value
    if (!base) return null
    return `${base}#/${route}`
  }

  const signingInUrl = computed(() => urlWithHash('security/signingin'))
  const deviceActivityUrl = computed(() => urlWithHash('security/device-activity'))
  const applicationsUrl = computed(() => urlWithHash('applications'))

  const realmLabel = computed(
    () => config.public.keycloakRealm || 'Keycloak',
  )

  function openAccountRoute(
    route: KeycloakAccountHashRoute,
    options?: { newTab?: boolean },
  ): boolean {
    const url = urlWithHash(route)
    if (!url) return false
    if (options?.newTab !== false) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.assign(url)
    }
    return true
  }

  return {
    keycloak,
    realmLabel,
    accountBaseUrl,
    signingInUrl,
    deviceActivityUrl,
    applicationsUrl,
    openAccountRoute,
  }
}
