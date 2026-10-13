<script setup lang="ts">
import LayoutSidebar from './Sidebar.vue'
import LayoutHeader from './Header.vue'
import LayoutFooter from './Footer.vue'

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
      class="border-r border-neutral-200/80 dark:border-neutral-800 hidden lg:block h-full shrink-0 transition-all duration-300 shadow-xs"
      :class="[isCollapsed ? 'w-20' : 'w-64']"
    >
      <LayoutSidebar :collapsed="isCollapsed" />
    </aside>

    <!-- Mobile Sidebar (Slideover) -->
    <USlideover 
      v-model:open="isSidebarOpen" 
      side="left" 
      class="lg:hidden"
      :ui="{ content: 'max-w-xs p-0 overflow-hidden' }"
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
  </div>
</template>
