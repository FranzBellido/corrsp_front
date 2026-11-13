<script setup lang="ts">
const { isNotificationsSlideoverOpen, unreadCount, ensureSubscribed } = useNotifications()

onMounted(() => {
  ensureSubscribed()
})
</script>

<template>
  <UTooltip text="Notificaciones" :shortcuts="['N']">
    <UButton
      color="neutral"
      variant="ghost"
      class="relative hover:text-highlighted"
      @click="isNotificationsSlideoverOpen = true"
    >
      <UChip
        color="error"
        inset
        size="sm"
        :show="unreadCount > 0"
        :text="unreadCount > 9 ? '9+' : String(unreadCount)"
      >
        <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
      </UChip>
    </UButton>
  </UTooltip>
</template>
