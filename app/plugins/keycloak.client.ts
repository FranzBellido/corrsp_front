import Keycloak from 'keycloak-js'

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()

  const keycloak = new Keycloak({
    url: config.public.keycloakUrl,
    realm: config.public.keycloakRealm,
    clientId: config.public.keycloakClientId
  })

  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      redirectUri: window.location.origin + window.location.pathname
    })

    // Auto refresh token
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        console.error('Failed to refresh Keycloak token')
        keycloak.login({
          redirectUri: window.location.origin + window.location.pathname
        })
      })
    }

    return {
      provide: {
        keycloak
      }
    }
  } catch (error) {
    console.error('Keycloak initialization failed', error)
    return {
      provide: {
        keycloak
      }
    }
  }
})
