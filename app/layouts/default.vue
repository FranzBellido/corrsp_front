<script setup lang="ts">
import LayoutSidebar from './Sidebar.vue'
import LayoutHeader from './Header.vue'
import LayoutFooter from './Footer.vue'
import CargoSelectorModal from '~/components/settings/CargoSelectorModal.vue'
import { useProfile } from '~/composables/useProfile'

const { needsCargoSelection } = useProfile()

const isSidebarOpen = ref(false)
const isCollapsed = ref(false)
const route = useRoute()

watch(() => route.path, () => {
  isSidebarOpen.value = false
})
</script>

<template>
  <div class="flex h-screen bg-neutral-100/60 dark:bg-neutral-950 font-sans antialiased text-neutral-900 dark:text-neutral-100 overflow-hidden">
    <!-- Desktop Sidebar -->
    <aside
      class="hidden lg:block h-full shrink-0 transition-all duration-300 shadow-lg z-30"
      :class="[isCollapsed ? 'w-[4.5rem]' : 'w-[17rem]']"
    >
      <LayoutSidebar :collapsed="isCollapsed" />
    </aside>

    <!-- Mobile Sidebar (Slideover) -->
    <USlideover
      v-model:open="isSidebarOpen"
      side="left"
      class="lg:hidden"
      :ui="{ content: 'max-w-[17rem] p-0 overflow-hidden bg-[#0b1f3a] ring-0' }"
    >
      <template #content>
        <div class="h-full w-full">
          <LayoutSidebar @navigate="isSidebarOpen = false" />
        </div>
      </template>
    </USlideover>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden relative min-w-0">
      <LayoutHeader 
        :is-collapsed="isCollapsed" 
        @toggle-sidebar="isSidebarOpen = true" 
        @toggle-collapse="isCollapsed = !isCollapsed"
      />

      <main class="flex-1 overflow-y-auto flex flex-col bg-neutral-50/40 dark:bg-neutral-900/30">
        <div class="flex-1 p-4 sm:p-6 lg:p-8">
          <div class="max-w-7xl mx-auto w-full">
            <slot />
          </div>
        </div>
        
        <LayoutFooter />
      </main>
    </div>

    <!-- Slideover global de notificaciones -->
    <NotificationsSlideover />

    <!-- Modal para selección de cargo por defecto si tiene múltiples cargos -->
    <CargoSelectorModal v-model:open="needsCargoSelection" />
  </div>
</template>
