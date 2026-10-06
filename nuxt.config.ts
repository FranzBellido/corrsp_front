// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/api/**': {
      cors: true
    }
  },
  runtimeConfig: {
    public: {
      keycloakUrl: process.env.NUXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080',
      keycloakRealm: process.env.NUXT_PUBLIC_KEYCLOAK_REALM || 'myrealm',
      keycloakClientId: process.env.NUXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'myclient',
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
      apiPublicUrl: process.env.NUXT_PUBLIC_API_PUBLIC_URL || '',
      onlyOfficeToken: process.env.NUXT_PUBLIC_ONLY_OFFICE_TOKEN || '',
      onlyOfficeServer: process.env.NUXT_PUBLIC_ONLY_OFFICE_SERVER || 'http://192.168.0.61:8085'
    }
  },
  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
