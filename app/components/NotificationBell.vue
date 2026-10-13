<script setup lang="ts">
const { isNotificationsSlideoverOpen } = useDashboard()
</script>

<template>
  <UTooltip text="Notificaciones" :shortcuts="['N']">
    <UButton
      color="neutral"
      variant="ghost"
      class="relative hover:text-neutral-900 dark:hover:text-white"
      @click="isNotificationsSlideoverOpen = true"
    >
      <UChip color="error" inset size="sm">
        <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
      </UChip>
    </UButton>
  </UTooltip>
</template>
