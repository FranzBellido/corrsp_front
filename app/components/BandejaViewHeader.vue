<script setup lang="ts">
const props = defineProps<{
  titulo: string
  descripcion: string
  icono: string
}>()
</script>

<template>
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800"
  >
    <div>
      <div class="flex items-center gap-2.5">
        <div class="p-2 rounded-md bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
          <UIcon :name="props.icono" class="size-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            {{ props.titulo }}
          </h1>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ props.descripcion }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
