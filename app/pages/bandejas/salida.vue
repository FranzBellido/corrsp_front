<script setup lang="ts">
useHead({
  title: 'Bandeja de Salida - Correspondencia AFCOOP',
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-gray-800">
      <div class="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
        <UIcon name="i-lucide-arrow-up-right" class="size-6" />
      </div>
      <div>
        <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Bandeja de Salida</h1>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Correspondencias y trámites derivados desde su cargo hacia otros destinatarios.</p>
      </div>
    </div>

    <div class="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-center shadow-xs">
      <div class="p-4 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-500 mb-4">
        <UIcon name="i-lucide-send" class="size-10" />
      </div>
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Módulo en Desarrollo</h2>
      <p class="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1">
        El seguimiento de correspondencias derivadas desde su cargo se implementará en la siguiente fase del sistema de correspondencia.
      </p>
      <div class="mt-6">
        <UButton
          to="/bandejas/borrador"
          label="Ir a Bandeja de Borrador"
          icon="i-lucide-file-edit"
          color="primary"
          variant="subtle"
        />
      </div>
    </div>
  </div>
</template>
