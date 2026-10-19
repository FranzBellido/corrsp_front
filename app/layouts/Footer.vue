<template>
  <footer class="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-neutral-500 font-medium">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-shield-check" class="size-4 text-primary-500" />
      <span>&copy; {{ currentYear }} Sistema de Gestión de Procesos - AFCOOP</span>
    </div>
    <div class="flex items-center gap-5 text-neutral-400">
     
      <NuxtLink to="/cargos" class="hover:text-primary-500 transition-colors">
        Cargos
      </NuxtLink>
      <NuxtLink to="/settings" class="hover:text-primary-500 transition-colors">
        Configuración
      </NuxtLink>
    </div>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>
