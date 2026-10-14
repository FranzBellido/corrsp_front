<script setup lang="ts">
import { backendService } from '~/services/backend.service'

defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'navigate'): void
}>()

const { isAuthenticated } = useAuth()
const { profile, fetchProfile } = useProfile()
const route = useRoute()

interface NavSubItem {
  label: string
  to: string
  icon?: string
}

interface NavItem {
  label: string
  icon: string
  to?: string
  children?: NavSubItem[]
}

// Menú por defecto si el endpoint dinámico aún no está disponible o falla
const defaultNavItems: NavItem[] = [
  {
    label: 'Inicio',
    icon: 'i-lucide-house',
    to: '/'
  },
  {
    label: 'Bandejas',
    icon: 'i-lucide-inbox',
    children: [
      {
        label: 'Borrador',
        to: '/bandejas/borrador',
        icon: 'i-lucide-file-edit'
      },
      {
        label: 'Ingreso',
        to: '/bandejas/ingreso',
        icon: 'i-lucide-arrow-down-left'
      },
      {
        label: 'Salida',
        to: '/bandejas/salida',
        icon: 'i-lucide-arrow-up-right'
      },
      {
        label: 'Archivo',
        to: '/bandejas/archivo',
        icon: 'i-lucide-archive'
      }
    ]
  },
  {
    label: 'Documentos',
    icon: 'i-lucide-file-text',
    to: '/documents'
  },
  {
    label: 'Administración',
    icon: 'i-lucide-folder-cog',
    children: [
      {
        label: 'Usuarios',
        to: '/usuarios',
        icon: 'i-lucide-users'
      },
      {
        label: 'Áreas / Unidades',
        to: '/areas',
        icon: 'i-lucide-building-2'
      },
      {
        label: 'Cargos',
        to: '/cargos',
        icon: 'i-lucide-briefcase'
      },
      {
        label: 'Procesos',
        to: '/procesos',
        icon: 'i-lucide-workflow'
      },
      {
        label: 'Codificadores',
        to: '/codificadores',
        icon: 'i-lucide-tags'
      },
      {
        label: 'Entidades',
        to: '/entidades',
        icon: 'i-lucide-landmark'
      },
      {
        label: 'Clientes',
        to: '/customers',
        icon: 'i-lucide-building-2'
      }
    ]
  },
  {
    label: 'Configuración',
    icon: 'i-lucide-settings',
    to: '/settings'
  }
]

const navItems = ref<NavItem[]>(defaultNavItems)

onMounted(() => {
  if (isAuthenticated.value && !profile.value) {
    fetchProfile()
  }
})

const isChildActive = (item: NavItem) => {
  if (!item.children) return false
  return item.children.some(child => route.path === child.to || route.fullPath.startsWith(child.to))
}

const isItemActive = (item: NavItem) => {
  if (item.to) {
    return route.path === item.to
  }
  return false
}
</script>

<template>
  <div class="flex flex-col h-full bg-neutral-50/50 dark:bg-neutral-950 overflow-hidden select-none">
    <!-- Brand Header -->
    <div class="p-4 shrink-0 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md">
      
      <img src="/logo_afcoop.png" alt="Logo AfCoop"/>
     
    </div>

    <!-- Navigation List -->
    <nav class="flex-1 p-3 space-y-1.5 overflow-y-auto">
      <div v-for="item in navItems" :key="item.label">
        <!-- Enlace Simple -->
        <UTooltip v-if="!item.children" :text="item.label" :disabled="!collapsed" side="right">
          <UButton
            :to="item.to"
            variant="ghost"
            color="neutral"
            class="w-full gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 group relative"
            :class="[
              isItemActive(item) 
                ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold shadow-xs' 
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60',
              collapsed ? 'justify-center px-0' : 'justify-start'
            ]"
            @click="emit('navigate')"
          >
            <template #leading>
              <UIcon 
                :name="item.icon" 
                class="size-5 shrink-0 transition-colors" 
                :class="[isItemActive(item) ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 group-hover:text-primary-500']"
              />
            </template>
            <span v-if="!collapsed" class="truncate text-xs font-semibold tracking-wide">{{ item.label }}</span>
            
            <!-- Barra indicadora activa -->
            <div 
              v-if="isItemActive(item)" 
              class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-600 rounded-r-full"
            ></div>
          </UButton>
        </UTooltip>

        <!-- Elemento con Submenú Desplegable -->
        <UCollapsible v-else :default-open="isChildActive(item)">
          <UButton
            variant="ghost"
            color="neutral"
            class="w-full gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 group"
            :class="[
              isChildActive(item) 
                ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60',
              collapsed ? 'justify-center px-0' : 'justify-start'
            ]"
          >
            <template #leading>
              <UIcon 
                :name="item.icon" 
                class="size-5 shrink-0 transition-colors" 
                :class="[isChildActive(item) ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 group-hover:text-primary-500']"
              />
            </template>
            <span v-if="!collapsed" class="truncate text-xs font-semibold tracking-wide">{{ item.label }}</span>
            <template #trailing v-if="!collapsed">
              <UIcon 
                name="i-lucide-chevron-down" 
                class="ml-auto size-4 text-neutral-400 transition-transform duration-200" 
                :class="[isChildActive(item) ? 'rotate-180 text-primary-500' : '']" 
              />
            </template>
          </UButton>

          <template #content>
            <div v-if="!collapsed" class="mt-1 ml-5 space-y-1 border-l border-neutral-200 dark:border-neutral-800 pl-3">
              <NuxtLink
                v-for="child in item.children"
                :key="child.label"
                :to="child.to"
                class="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors"
                :class="[
                  route.path === child.to 
                    ? 'text-primary-600 dark:text-primary-400 font-semibold bg-primary-50/50 dark:bg-primary-950/30' 
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40'
                ]"
                @click="emit('navigate')"
              >
                <UIcon v-if="child.icon" :name="child.icon" class="size-4 shrink-0" />
                <span class="truncate">{{ child.label }}</span>
              </NuxtLink>
            </div>
          </template>
        </UCollapsible>
      </div>
    </nav>

    <!-- Footer de Sidebar -->
    <div class="p-3 border-t border-neutral-200/80 dark:border-neutral-800/80 shrink-0 bg-white/40 dark:bg-neutral-900/40">
      <UTooltip text="Documentación y Ayuda" :disabled="!collapsed" side="right">
        <UButton
          to="/documents"
          :label="collapsed ? undefined : 'Documentos'"
          icon="i-lucide-book-open"
          variant="ghost"
          color="neutral"
          block
          class="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 py-2 rounded-xl text-xs font-medium"
          :class="[collapsed ? 'px-0 justify-center' : 'justify-start']"
          @click="emit('navigate')"
        />
      </UTooltip>
    </div>
  </div>
</template>
