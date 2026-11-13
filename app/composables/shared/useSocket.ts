import { io, type Socket } from 'socket.io-client'
import type { NotificacionRealtime } from '~/types/notificacion'
import { NOTIFICACION_EVENT } from '~/types/notificacion'

type NotificacionHandler = (payload: NotificacionRealtime) => void

let socketSingleton: Socket | null = null
const handlers = new Set<NotificacionHandler>()

function dispatchNotificacion(payload: NotificacionRealtime) {
  for (const handler of handlers) {
    handler(payload)
  }
}

function attachNotificacionListener(socket: Socket) {
  socket.off(NOTIFICACION_EVENT)
  socket.on(NOTIFICACION_EVENT, (payload: NotificacionRealtime) => {
    dispatchNotificacion(payload)
  })
}

/**
 * Conecta Socket.io al backend NestJS autenticado con el JWT de Keycloak.
 * El servidor une al cliente a la sala `user_{preferred_username}`.
 */
export function useSocket() {
  const { $keycloak } = useNuxtApp()
  const { apiBaseUrl } = useApiUrls()
  const connected = useState('ws-connected', () => false)
  const preferredUsername = useState<string | null>('ws-username', () => null)

  const getToken = async (): Promise<string | null> => {
    const kc = $keycloak as {
      authenticated?: boolean
      token?: string
      updateToken?: (minValidity: number) => Promise<boolean>
      tokenParsed?: { preferred_username?: string }
    } | undefined

    if (!kc?.authenticated || !kc.token) {
      return null
    }

    try {
      await kc.updateToken?.(30)
    } catch {
      // Si falla el refresh, se intenta con el token actual
    }

    preferredUsername.value = kc.tokenParsed?.preferred_username?.trim() || null
    return kc.token
  }

  const connect = async (): Promise<Socket | null> => {
    if (!import.meta.client) {
      return null
    }

    const token = await getToken()
    if (!token) {
      return null
    }

    if (socketSingleton?.connected) {
      connected.value = true
      attachNotificacionListener(socketSingleton)
      return socketSingleton
    }

    if (socketSingleton) {
      socketSingleton.auth = { token }
      attachNotificacionListener(socketSingleton)
      socketSingleton.connect()
      return socketSingleton
    }

    const origin = apiBaseUrl.replace(/\/api\/?$/, '')

    socketSingleton = io(origin, {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    })

    socketSingleton.on('connect', () => {
      connected.value = true
    })

    socketSingleton.on('disconnect', () => {
      connected.value = false
    })

    socketSingleton.on('connect_error', async () => {
      connected.value = false
      const refreshed = await getToken()
      if (refreshed && socketSingleton) {
        socketSingleton.auth = { token: refreshed }
      }
    })

    attachNotificacionListener(socketSingleton)

    return socketSingleton
  }

  const disconnect = () => {
    if (socketSingleton) {
      socketSingleton.disconnect()
      socketSingleton = null
    }
    connected.value = false
  }

  const onNotificacion = (
    handler: NotificacionHandler,
    options?: { permanent?: boolean },
  ) => {
    handlers.add(handler)
    if (!options?.permanent) {
      onScopeDispose(() => {
        handlers.delete(handler)
      })
    }
  }

  return {
    connect,
    disconnect,
    onNotificacion,
    connected,
    preferredUsername,
    get socket() {
      return socketSingleton
    },
  }
}
