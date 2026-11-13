<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'

const {
  items,
  unreadCount,
  markAllRead,
  markRead,
  clear,
  rutaNotificacion,
  isNotificationsSlideoverOpen,
  connected,
  ensureSubscribed,
  cargando,
  cargarDesdeApi,
} = useNotifications()

onMounted(() => {
  ensureSubscribed()
})

watch(isNotificationsSlideoverOpen, (open) => {
  if (open && unreadCount.value > 0) {
    markAllRead()
  }
})

const iconoTipo = (tipo: string) => {
  if (tipo === 'derivacion') return 'i-lucide-send'
  if (tipo === 'copia') return 'i-lucide-copy'
  return 'i-lucide-share-2'
}
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    title="Notificaciones"
    description="Derivaciones, copias y documentos compartidos en tiempo real."
  >
    <template #body>
      <div class="flex items-center justify-between gap-2 mb-4">
        <div class="flex items-center gap-2 text-xs text-muted">
          <span
            class="size-2 rounded-full"
            :class="connected ? 'bg-success' : 'bg-warning'"
          />
          {{ connected ? 'Conectado' : 'Reconectando…' }}
        </div>
        <div class="flex gap-1">
          <UButton
            icon="i-lucide-refresh-cw"
            size="xs"
            color="neutral"
            variant="ghost"
            :loading="cargando"
            title="Actualizar"
            @click="cargarDesdeApi"
          />
          <UButton
            v-if="items.length"
            label="Limpiar"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="clear"
          />
        </div>
      </div>

      <div v-if="items.length === 0" class="py-12 text-center text-sm text-muted">
        <UIcon name="i-lucide-bell-off" class="size-10 text-dimmed mx-auto mb-2" />
        No hay notificaciones recientes.
      </div>

      <div v-else class="space-y-1">
        <NuxtLink
          v-for="notification in items"
          :key="notification.id"
          :to="rutaNotificacion(notification)"
          class="px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-start gap-3 relative -mx-1"
          @click="markRead(notification.id); isNotificationsSlideoverOpen = false"
        >
          <UChip color="error" :show="!notification.leida" inset>
            <div class="size-9 rounded-full bg-primary/10 flex items-center justify-center">
              <UIcon :name="iconoTipo(notification.tipo)" class="size-4 text-primary" />
            </div>
          </UChip>

          <div class="text-sm flex-1 min-w-0">
            <p class="flex items-center justify-between gap-2">
              <span class="text-highlighted font-medium truncate">{{ notification.titulo }}</span>
              <time
                :datetime="notification.created_at"
                class="text-muted text-xs shrink-0"
              >
                {{ formatTimeAgo(new Date(notification.created_at)) }}
              </time>
            </p>
            <p class="text-dimmed line-clamp-2 mt-0.5">
              {{ notification.mensaje }}
            </p>
            <p v-if="notification.remitente" class="text-[11px] text-muted mt-1 truncate">
              De: {{ notification.remitente }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </template>
  </USlideover>
</template>
