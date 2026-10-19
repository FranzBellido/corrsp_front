import { createSharedComposable } from '@vueuse/core'
import type { NotificacionRealtime } from '~/types/notificacion'
import { backendService, getApi } from '~/services/backend.service'

const MAX_ITEMS = 50

const _useNotifications = () => {
  const items = useState<NotificacionRealtime[]>('notificaciones-rt', () => [])
  const cargando = useState('notificaciones-cargando', () => false)
  const { onNotificacion, connect, connected, preferredUsername } = useSocket()
  const toast = useToast()
  const { isNotificationsSlideoverOpen } = useDashboard()

  const unreadCount = computed(
    () => items.value.filter((n) => !n.leida).length,
  )

  const mergeItems = (incoming: NotificacionRealtime[]) => {
    const map = new Map<string, NotificacionRealtime>()
    for (const n of incoming) {
      map.set(n.id, n)
    }
    for (const n of items.value) {
      if (!map.has(n.id)) {
        map.set(n.id, n)
      }
    }
    items.value = [...map.values()]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, MAX_ITEMS)
  }

  const push = (payload: NotificacionRealtime, options?: { toast?: boolean }) => {
    const exists = items.value.some((n) => n.id === payload.id)
    mergeItems([
      {
        ...payload,
        leida: payload.leida ?? false,
      },
    ])

    if (!exists && options?.toast !== false) {
      toast.add({
        title: payload.titulo,
        description: payload.mensaje,
        color: 'info',
        icon:
          payload.tipo === 'derivacion'
            ? 'i-lucide-send'
            : payload.tipo === 'copia'
              ? 'i-lucide-copy'
              : 'i-lucide-share-2',
      })
    }
  }

  const cargarDesdeApi = async () => {
    if (!import.meta.client) return
    cargando.value = true
    try {
      const res = await backendService.get<NotificacionRealtime[]>(
        'notificaciones',
        { limit: MAX_ITEMS },
      )
      const lista = res.data ?? []
      mergeItems(
        lista.map((n) => ({
          ...n,
          leida: n.leida ?? false,
        })),
      )
    } catch {
      // Tabla no creada o API no disponible
    } finally {
      cargando.value = false
    }
  }

  const markAllRead = async () => {
    items.value = items.value.map((n) => ({ ...n, leida: true }))
    try {
      await backendService.patch('notificaciones', 'marcar-todas-leidas', {})
    } catch {
      await cargarDesdeApi()
    }
  }

  const markRead = async (id: string) => {
    items.value = items.value.map((n) =>
      n.id === id ? { ...n, leida: true } : n,
    )
    try {
      await backendService.patch('notificaciones', `${id}/leida`, {})
    } catch {
      await cargarDesdeApi()
    }
  }

  const clear = async () => {
    items.value = []
    try {
      const api = getApi()
      await api('notificaciones', { method: 'DELETE' })
    } catch {
      await cargarDesdeApi()
    }
  }

  const rutaNotificacion = (n: NotificacionRealtime): string => {
    if (n.tipo === 'compartido') {
      return '/bandejas/compartidos'
    }
    if (n.tipo === 'copia') {
      return '/bandejas/con-copia'
    }
    return '/bandejas/ingreso'
  }

  let subscribed = false
  const ensureSubscribed = () => {
    if (!import.meta.client) return
    if (!subscribed) {
      subscribed = true
      onNotificacion((payload) => push(payload), { permanent: true })
    }
    void connect()
    void cargarDesdeApi()
  }

  return {
    items,
    unreadCount,
    connected,
    preferredUsername,
    cargando,
    push,
    cargarDesdeApi,
    markAllRead,
    markRead,
    clear,
    rutaNotificacion,
    ensureSubscribed,
    isNotificationsSlideoverOpen,
  }
}

export const useNotifications = createSharedComposable(_useNotifications)
