<script setup lang="ts">
import type { DashboardResumen } from '~/types/dashboard'
import type { RespuestaApi } from '~/types/respuestas'
import { get } from '~/services/backend.service'

defineProps<{
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

const isItemActive = (item: NavItem) => {
  if (!item.to) return false
  if (item.to === '/dashboard') {
    return route.path === '/dashboard' || route.path === '/'
  }
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

const isLinkActive = (to: string) =>
  route.path === to || route.path.startsWith(`${to}/`)

function badgeValue(item: NavSubItem): number | null {
  if (!item.badgeKey) return null
  if (item.badgeKey === 'ingreso_nuevos') return ingresoNuevos.value
  const n = bandejaCounts.value?.[item.badgeKey]
  return typeof n === 'number' ? n : null
}

function formatBadge(n: number): string {
  return n > 99 ? '99+' : String(n)
}

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
  <div class="flex flex-col h-full overflow-hidden select-none bg-[#0b1f3a] text-white">
    <!-- Brand -->
    <div class="p-3 shrink-0">
      <div
        class="rounded-xl bg-white px-3 py-2.5 shadow-sm flex items-center justify-center min-h-14"
        :class="collapsed ? 'px-2' : ''"
      >
        <img
          src="/logo_afcoop.png"
          alt="AFCOOP"
          class="object-contain"
          :class="collapsed ? 'h-8 w-auto' : 'h-10 w-auto max-w-full'"
        >
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-2.5 pb-2 space-y-1 overflow-y-auto sidebar-scroll">
      <div v-for="item in mainNavItems" :key="item.label" class="space-y-0.5">
        <!-- Enlace simple -->
        <UTooltip
          v-if="!item.children"
          :text="item.label"
          :disabled="!collapsed"
          side="right"
        >
          <NuxtLink
            :to="item.to"
            class="group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-colors"
            :class="[
              isItemActive(item)
                ? 'bg-sky-500 text-white shadow-md shadow-sky-900/40'
                : 'text-slate-300 hover:bg-white/10 hover:text-white',
              collapsed ? 'justify-center px-0' : '',
            ]"
            @click="emit('navigate')"
          >
            <UIcon
              :name="item.icon"
              class="size-[18px] shrink-0"
              :class="isItemActive(item) ? 'text-white' : 'text-slate-400 group-hover:text-sky-300'"
            />
            <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
          </NuxtLink>
        </UTooltip>

        <!-- Grupo colapsable -->
        <UCollapsible
          v-else
          :default-open="isChildActive(item)"
          :unmount-on-hide="false"
        >
          <UTooltip
            :text="item.label"
            :disabled="!collapsed"
            side="right"
          >
            <UButton
              variant="ghost"
              color="neutral"
              class="w-full gap-2.5 py-2 px-2.5 rounded-xl transition-colors group"
              :class="[
                isChildActive(item)
                  ? 'text-sky-300 bg-white/5'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
                collapsed ? 'justify-center px-0' : 'justify-start',
              ]"
              :ui="{
                leadingIcon: 'size-[18px]',
                trailingIcon: 'size-4',
                label: 'text-[13px] font-semibold',
              }"
            >
              <template #leading>
                <UIcon
                  :name="item.icon"
                  class="size-[18px] shrink-0"
                  :class="isChildActive(item) ? 'text-sky-300' : 'text-slate-400 group-hover:text-sky-300'"
                />
              </template>
              <span v-if="!collapsed" class="truncate flex-1 text-left">{{ item.label }}</span>
              <template v-if="!collapsed" #trailing>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="size-4 transition-transform duration-200"
                  :class="isChildActive(item) ? 'rotate-180 text-sky-400' : 'text-slate-500'"
                />
              </template>
            </UButton>
          </UTooltip>

          <template #content>
            <div
              v-if="!collapsed"
              class="mt-1 ml-3 space-y-0.5 border-l border-white/10 pl-2.5"
            >
              <NuxtLink
                v-for="child in item.children"
                :key="child.label"
                :to="child.to"
                class="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors"
                :class="[
                  isLinkActive(child.to)
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-900/30'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white',
                ]"
                @click="emit('navigate')"
              >
                <UIcon
                  v-if="child.icon"
                  :name="child.icon"
                  class="size-4 shrink-0"
                  :class="isLinkActive(child.to) ? 'text-white' : 'text-slate-500'"
                />
                <span class="truncate flex-1">{{ child.label }}</span>
                <span
                  v-if="badgeValue(child) != null"
                  class="min-w-5 h-5 px-1 rounded-md text-[10px] font-bold tabular-nums flex items-center justify-center"
                  :class="[
                    isLinkActive(child.to)
                      ? 'bg-white/20 text-white'
                      : child.badgeTone === 'success'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-100',
                  ]"
                >
                  {{ formatBadge(badgeValue(child)!) }}
                </span>
              </NuxtLink>
            </div>
          </template>
        </UCollapsible>
      </div>
    </nav>

    <!-- Footer -->
    <div class="shrink-0 px-2.5 pb-3 pt-2 border-t border-white/10 space-y-0.5">
      <UTooltip
        v-for="item in footerNavItems"
        :key="item.label"
        :text="item.label"
        :disabled="!collapsed"
        side="right"
      >
        <NuxtLink
          :to="item.to"
          class="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors"
          :class="[
            isItemActive(item)
              ? 'bg-sky-500 text-white'
              : 'text-slate-400 hover:bg-white/10 hover:text-white',
            collapsed ? 'justify-center px-0' : '',
          ]"
          @click="emit('navigate')"
        >
          <UIcon
            :name="item.icon"
            class="size-[18px] shrink-0"
            :class="isItemActive(item) ? 'text-white' : 'text-slate-500 group-hover:text-sky-300'"
          />
          <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </UTooltip>
    </div>
  </div>
</template>

<style scoped>
.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(71 85 105) transparent;
}
.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgb(71 85 105);
  border-radius: 999px;
}
</style>
