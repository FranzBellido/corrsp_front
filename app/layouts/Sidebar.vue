<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { DashboardResumen } from '~/types/dashboard'
import type { RespuestaApi } from '~/types/respuestas'
import { get } from '~/services/backend.service'

const props = defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'navigate'): void
}>()

const { isAuthenticated, isProcAdmin, isProcRecaudacion } = useAuth()
const { profile, fetchProfile } = useProfile()
const route = useRoute()

interface NavSubItem {
  label: string
  to: string
  icon?: string
  badgeKey?: keyof DashboardResumen['bandejas'] | 'ingreso_nuevos'
  badgeTone?: 'default' | 'success'
}

interface NavItem {
  label: string
  icon: string
  to?: string
  children?: NavSubItem[]
  requireAdmin?: boolean
  requireRecaudacion?: boolean
  footer?: boolean
}

const bandejaCounts = ref<DashboardResumen['bandejas'] | null>(null)
const ingresoNuevos = ref(0)

const defaultNavItems: NavItem[] = [
  {
    label: 'Inicio',
    icon: 'i-lucide-house',
    to: '/dashboard',
  },
  {
    label: 'Bandejas',
    icon: 'i-lucide-inbox',
    children: [
      {
        label: 'Principal',
        to: '/bandejas/borrador',
        icon: 'i-lucide-file-edit',
        badgeKey: 'borrador',
      },
      {
        label: 'Ingreso',
        to: '/bandejas/ingreso',
        icon: 'i-lucide-arrow-down-left',
        badgeKey: 'ingreso_nuevos',
        badgeTone: 'success',
      },
      {
        label: 'Salida',
        to: '/bandejas/salida',
        icon: 'i-lucide-arrow-up-right',
        badgeKey: 'salida',
      },
      {
        label: 'Con copia',
        to: '/bandejas/con-copia',
        icon: 'i-lucide-copy',
        badgeKey: 'con_copia',
      },
      {
        label: 'Compartidos',
        to: '/bandejas/compartidos',
        icon: 'i-lucide-share-2',
        badgeKey: 'compartidos',
      },
      {
        label: 'Archivo',
        to: '/bandejas/archivo',
        icon: 'i-lucide-archive',
        badgeKey: 'archivo',
      },
    ],
  },
  {
    label: 'Recaudaciones',
    icon: 'i-lucide-banknote',
    requireRecaudacion: true,
    children: [
      {
        label: 'Boletas',
        to: '/recaudaciones',
        icon: 'i-lucide-receipt',
      },
      {
        label: 'Dashboard',
        to: '/rec_dashboard',
        icon: 'i-lucide-chart-pie',
      },
    ],
  },
  {
    label: 'Administración',
    icon: 'i-lucide-folder-cog',
    requireAdmin: true,
    children: [
      {
        label: 'Áreas / Unidades',
        to: '/areas',
        icon: 'i-lucide-building-2',
      },
      {
        label: 'Usuarios',
        to: '/usuarios',
        icon: 'i-lucide-users',
      },
      {
        label: 'Cargos',
        to: '/cargos',
        icon: 'i-lucide-briefcase',
      },
      {
        label: 'Procesos',
        to: '/procesos',
        icon: 'i-lucide-workflow',
      },
      {
        label: 'Codificadores',
        to: '/codificadores',
        icon: 'i-lucide-tags',
      },
      {
        label: 'Entidades',
        to: '/entidades',
        icon: 'i-lucide-landmark',
      },
    ],
  },
  {
    label: 'Configuración',
    icon: 'i-lucide-settings',
    to: '/settings',
    footer: true,
  },
  {
    label: 'Ayuda',
    icon: 'i-lucide-book-open',
    to: '/documents',
    footer: true,
  },
]

const navItems = computed(() =>
  defaultNavItems.filter((item) => {
    if (item.requireAdmin && !isProcAdmin.value) return false
    if (item.requireRecaudacion && !isProcRecaudacion.value) return false
    return true
  }),
)

const mainNavItems = computed(() => navItems.value.filter((i) => !i.footer))
const footerNavItems = computed(() => navItems.value.filter((i) => i.footer))

const isChildActive = (item: NavItem) => {
  if (!item.children) return false
  return item.children.some(
    (child) => route.path === child.to || route.path.startsWith(`${child.to}/`),
  )
}

function badgeValue(item: NavSubItem): number | null {
  if (!item.badgeKey) return null
  if (item.badgeKey === 'ingreso_nuevos') return ingresoNuevos.value
  const n = bandejaCounts.value?.[item.badgeKey]
  return typeof n === 'number' ? n : null
}

function formatBadge(n: number): string {
  return n > 99 ? '99+' : String(n)
}

function mapChild(child: NavSubItem): NavigationMenuItem {
  const count = badgeValue(child)
  return {
    label: child.label,
    to: child.to,
    icon: child.icon,
    onSelect: () => emit('navigate'),
    ...(count != null
      ? {
          badge: {
            label: formatBadge(count),
            color: (child.badgeTone === 'success' ? 'success' : 'neutral') as
              | 'success'
              | 'neutral',
            variant: 'subtle' as const,
            size: 'sm' as const,
          },
        }
      : {}),
  }
}

function mapNavItem(item: NavItem): NavigationMenuItem {
  if (item.children?.length) {
    return {
      label: item.label,
      icon: item.icon,
      defaultOpen: isChildActive(item),
      children: item.children.map(mapChild),
    }
  }
  return {
    label: item.label,
    icon: item.icon,
    to: item.to,
    onSelect: () => emit('navigate'),
  }
}

const navigationGroups = computed<NavigationMenuItem[][]>(() => {
  void route.path
  void bandejaCounts.value
  void ingresoNuevos.value
  return [
    mainNavItems.value.map(mapNavItem),
    footerNavItems.value.map(mapNavItem),
  ]
})

async function cargarConteos() {
  if (!isAuthenticated.value) return
  try {
    const gestion = new Date().getFullYear()
    const res = await get<DashboardResumen>('dashboard/resumen', { gestion })
    const data = (res as RespuestaApi<DashboardResumen>)?.data
    if (!data) return
    bandejaCounts.value = data.bandejas
    ingresoNuevos.value = data.derivaciones?.nuevas ?? 0
  } catch {
    // sin badges si falla
  }
}

onMounted(() => {
  if (isAuthenticated.value && !profile.value) {
    void fetchProfile()
  }
  void cargarConteos()
})

watch(
  () => route.path,
  () => {
    void cargarConteos()
  },
)
</script>

<template>
  <div
    class="flex flex-col h-full overflow-hidden select-none bg-neutral-200/95 dark:bg-neutral-900 text-default border-r border-neutral-300/80 dark:border-neutral-800 shadow-sm"
  >
  <!-- Brand -->
  <div
    class="shrink-0 border-b border-neutral-300/70 dark:border-neutral-800 bg-neutral-300/40 dark:bg-neutral-950/50 flex items-center justify-center w-full"
    :class="props.collapsed ? 'p-2 min-h-[3.75rem]' : 'px-3 py-3 min-h-[4.5rem]'"
  >
    <NuxtLink
      to="/dashboard"
      class="flex w-full items-center justify-center"
      @click="emit('navigate')"
    >
      <img
        src="/logo_afcoop.png"
        alt="AFCOOP"
        class="object-contain object-center"
        :class="
          props.collapsed
            ? 'h-8 w-8'
            : 'w-full max-w-full h-auto max-h-14'
        "
      >
    </NuxtLink>
  </div>

  <!-- Navigation (estilo Nuxt UI / dashboard) -->
  <div class="flex-1 min-h-0 overflow-y-auto px-2 py-3 sidebar-scroll">
    <UNavigationMenu
      :collapsed="props.collapsed"
      :items="navigationGroups"
      orientation="vertical"
      highlight
      :unmount-on-hide="false"
      class="w-full data-[orientation=vertical]:w-full"
      :ui="{
        link: 'py-2',
        childLink: 'py-1.5',
      }"
    />
  </div>
  </div>
</template>

<style scoped>
.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(163 163 163 / 0.85) transparent;
}
:global(.dark) .sidebar-scroll {
  scrollbar-color: rgb(64 64 64 / 0.9) transparent;
}
.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgb(163 163 163 / 0.85);
  border-radius: 999px;
}
:global(.dark) .sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgb(64 64 64 / 0.9);
}
</style>
