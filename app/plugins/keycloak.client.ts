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
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      redirectUri: window.location.origin + window.location.pathname
    })
    
    // Auto refresh token
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        console.error('Failed to refresh Keycloak token')
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
