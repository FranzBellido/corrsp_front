<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div
    class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-default"
  >
    <div class="space-y-1 min-w-0">
      <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-highlighted">
        {{ title }}
      </h1>
      <p v-if="description" class="text-sm text-muted leading-relaxed max-w-2xl">
        {{ description }}
      </p>
      <slot name="subtitle" />
    </div>

    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
