import Keycloak from 'keycloak-js'
import { ensureCryptoRandomUuid } from '~/utils/crypto-random-uuid-polyfill'

export default defineNuxtPlugin(async (nuxtApp) => {
  ensureCryptoRandomUuid()

  const keycloakReady = useState<boolean>('keycloak-ready', () => false)
  keycloakReady.value = false

  const config = useRuntimeConfig()

  const keycloak = new Keycloak({
    url: config.public.keycloakUrl,
    realm: config.public.keycloakRealm,
    clientId: config.public.keycloakClientId
  })

  try {
    await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
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

    keycloakReady.value = true

    return {
      provide: {
        keycloak
      }
    }
  } catch (error) {
    console.error('Keycloak initialization failed', error)
    keycloakReady.value = true
    return {
      provide: {
        keycloak
      }
    }
  }
})
