<template>
  <div 
    class="flex flex-col gap-1 border-gray-100 dark:border-gray-800 transition-all duration-300"
    :class="[
      border ? 'border-l pl-6' : 'pl-2',
      flex1 ? 'flex-1' : ''
    ]"
    :style="{ minWidth: minW }"
  >
    <label v-if="label" class="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-0.5">
      {{ label }}
    </label>
    <div class="flex items-center">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Componente para cada elemento individual dentro de AppFilter.
 * Maneja la etiqueta, el ancho mínimo y el separador lateral opcional.
 */
defineProps<{
  label?: string
  minW?: string
  border?: boolean
  flex1?: boolean
}>()
</script>
