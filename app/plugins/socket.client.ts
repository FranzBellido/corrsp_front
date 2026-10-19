export default defineNuxtPlugin(() => {
  const { $keycloak } = useNuxtApp()
  const { ensureSubscribed } = useNotifications()
  const { connect } = useSocket()

  const tryConnect = () => {
    const kc = $keycloak as { authenticated?: boolean } | undefined
    if (kc?.authenticated) {
      ensureSubscribed()
      void connect()
    }
  }

  // Keycloak ya inicializado en keycloak.client.ts; conectar tras el mount.
  if (import.meta.client) {
    tryConnect()
    // Reintento breve por si el token aún no está listo
    setTimeout(tryConnect, 800)
  }
})
