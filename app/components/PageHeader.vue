<template>
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-1 border-b border-gray-100 dark:border-gray-800/50">
    <div class="space-y-1">
      <h3 class="text-2xl font-bold tracking-tighter text-gray-900 dark:text-white font-display">
        {{ title }}
      </h3>
      <p v-if="description" class="text-gray-500 dark:text-gray-400 text-base font-medium tracking-tight">
        {{ description }}
      </p>
      <slot name="subtitle" />
    </div>

    <div v-if="$slots.actions" class="flex items-center gap-3 mb-1">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<style scoped>
.font-display {
  font-family: 'Outfit', 'Inter', sans-serif;
}
</style>
