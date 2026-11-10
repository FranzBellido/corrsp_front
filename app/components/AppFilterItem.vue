<script setup lang="ts">
/**
 * Elemento de filtro dentro de AppFilter.
 */
defineProps<{
  label?: string
  minW?: string
  border?: boolean
  flex1?: boolean
}>()
</script>

<template>
  <div
    class="flex flex-col gap-1 transition-all duration-300"
    :class="[
      border ? 'border-l border-default pl-4 sm:pl-6' : 'pl-1',
      flex1 ? 'flex-1 min-w-0' : '',
    ]"
    :style="{ minWidth: minW }"
  >
    <label
      v-if="label"
      class="text-[10px] font-bold text-muted uppercase tracking-wider pl-0.5 mb-0.5"
    >
      {{ label }}
    </label>
    <div class="flex items-center w-full">
      <slot />
    </div>
  </div>
</template>
