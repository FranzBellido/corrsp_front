import Keycloak from 'keycloak-js'
import { ensureCryptoRandomUuid } from '~/utils/crypto-random-uuid-polyfill'

export default defineNuxtPlugin(async (nuxtApp) => {
  ensureCryptoRandomUuid()

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
      responseMode: 'query',
      pkceMethod: false,
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
