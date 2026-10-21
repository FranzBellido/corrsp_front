<script setup lang="ts">
useHead({
  title: 'Documentación y ayuda - Correspondencia AFCOOP',
})

const enlaces = [
  {
    label: 'Bandeja de borrador',
    to: '/bandejas/borrador',
    icon: 'i-lucide-file-edit',
    descripcion: 'Elaborar correspondencias y generar documentos antes de derivar.',
  },
  {
    label: 'Bandejas de ingreso y salida',
    to: '/bandejas/ingreso',
    icon: 'i-lucide-inbox',
    descripcion: 'Gestionar derivaciones recibidas y enviadas.',
  },
  {
    label: 'Configuración',
    to: '/settings',
    icon: 'i-lucide-settings',
    descripcion: 'Preferencias de su cuenta en el sistema.',
  },
]
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <div class="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
      <div class="p-2 rounded-md bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
        <UIcon name="i-lucide-book-open" class="size-6" />
      </div>
      <div>
        <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Documentación y ayuda
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Guía rápida del sistema de correspondencia AFCOOP.
        </p>
      </div>
    </div>

    <div class="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4 text-sm text-gray-600 dark:text-gray-400">
      <p>
        Use las <strong class="text-gray-800 dark:text-gray-200">bandejas</strong> del menú lateral para trabajar con
        correspondencias. En borrador, el icono de alerta indica pendientes antes de derivar (numeración, hoja de ruta,
        CITE o documento generado).
      </p>
      <p>
        Para incidencias de acceso o permisos, contacte al administrador del sistema o al área de tecnología de AFCOOP.
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <NuxtLink
        v-for="item in enlaces"
        :key="item.to"
        :to="item.to"
        class="flex gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary-200 dark:hover:border-primary-800 transition-colors"
      >
        <UIcon :name="item.icon" class="size-5 text-primary-500 shrink-0 mt-0.5" />
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ item.label }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ item.descripcion }}</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
