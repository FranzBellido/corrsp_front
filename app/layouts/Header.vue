<script setup lang="ts">
defineProps<{
  isCollapsed?: boolean
}>()

defineEmits<{
  (e: 'toggle-sidebar'): void
  (e: 'toggle-collapse'): void
}>()
</script>

<template>
  <header class="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-20">
    <div class="flex items-center gap-3 sm:gap-4 flex-1">
      <!-- Mobile menu trigger -->
      <UButton 
        icon="i-lucide-menu" 
        variant="ghost" 
        color="neutral" 
        class="lg:hidden" 
        aria-label="Abrir menú"
        @click="$emit('toggle-sidebar')" 
      />

      <!-- Desktop collapse toggle -->
      <UButton 
        :icon="isCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" 
        variant="ghost" 
        color="neutral" 
        class="hidden lg:flex" 
        :aria-label="isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'"
        @click="$emit('toggle-collapse')" 
      />
      
      <!-- Mobile brand pill -->
      <div class="flex items-center gap-2 lg:hidden">
        <div class="size-8 bg-primary-600 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
          CORR
        </div>
        <span class="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">AFCOOP</span>
      </div>
      
      <!-- Desktop breadcrumb / system title -->
      <div class="hidden lg:flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        <span>Sistema de Correspondencia</span>
        <span class="text-neutral-300 dark:text-neutral-700">/</span>
        <span class="text-primary-600 dark:text-primary-400 font-bold">AFCOOP</span>
      </div>
    </div>

    <!-- Right Controls -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Toggle Dark/Light mode -->
      <UColorModeButton variant="ghost" color="neutral" />
      
      <!-- Notifications slideover toggle -->
      <NotificationBell />
      
      <!-- Direct settings link -->
      <UButton 
        to="/settings" 
        icon="i-lucide-settings" 
        variant="ghost" 
        color="neutral" 
        aria-label="Configuración" 
      />
      
      <div class="w-px h-5 bg-neutral-200 dark:bg-neutral-800 mx-1"></div>
      
      <!-- User profile & session dropdown -->
      <UserDropdown />
    </div>
  </header>
</template>
