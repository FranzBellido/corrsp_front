<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: 'Filtros de búsqueda',
  },
)
</script>

<template>
  <div
    class="rounded-2xl border border-default bg-default/70 dark:bg-elevated/30 backdrop-blur-md shadow-xs overflow-hidden"
  >
    <div
      v-if="title || $slots.header"
      class="px-4 pt-3.5 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-default/70"
    >
      <div class="min-w-0">
        <slot name="header">
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted">
            {{ title }}
          </p>
          <p v-if="description" class="text-xs text-muted mt-0.5">
            {{ description }}
          </p>
        </slot>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-1.5">
        <slot name="actions" />
      </div>
    </div>
    <div class="p-4 flex flex-wrap gap-y-4 items-end">
      <slot />
    </div>
  </div>
</template>
