<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { AlertaNivel, AlertaTipo } from '~/types/alertas'
import { ALERTAS_AMBITO_AREA } from '~/types/alertas'
import { useAlertas } from '~/composables/useAlertas'
import { useProfile } from '~/composables/useProfile'

useHead({
  title: 'Alertas del sistema - AFCOOP',
})

const toast = useToast()
const { profile, cargoActivo, areaActiva, resolveCargoOrigenId } = useProfile()
const { loading, data, fetchAlertas } = useAlertas()

const cargoFiltro = ref<string | null>(null)
const filtroNivel = ref<'todos' | AlertaNivel>('todos')
const filtroTipo = ref<'todos' | AlertaTipo>('todos')

const nombreAreaFiltro = computed(() => {
  return (
    areaActiva.value?.nombre
    || cargoActivo.value?.area?.nombre
    || data.value?.area?.nombre
    || 'mi área'
  )
})

const cargoOptions = computed(() => {
  const cargos = (profile.value?.cargos ?? []).map((c) => ({
    label: c.area?.nombre ? `${c.nombre} — ${c.area.nombre}` : c.nombre,
    value: c.id,
  }))
  return [
    {
      label: `Toda el área — ${nombreAreaFiltro.value}`,
      value: ALERTAS_AMBITO_AREA,
    },
    ...cargos,
  ]
})

const nivelOptions = [
  { label: 'Todas', value: 'todos' as const },
  { label: 'Rojas', value: 'roja' as const },
  { label: 'Amarillas', value: 'amarilla' as const },
]

const tipoOptions = [
  { label: 'Todos los tipos', value: 'todos' as const },
  { label: 'Plazo crítico (1 día)', value: 'plazo_critico' as const },
  { label: 'Plazo advertencia (3 días)', value: 'plazo_advertencia' as const },
  { label: 'Sin abrir', value: 'no_leida' as const },
]

const resumen = computed(() => data.value?.resumen ?? {
  total: 0,
  rojas: 0,
  amarillas: 0,
  plazos_criticos: 0,
  plazos_advertencia: 0,
  no_leidas: 0,
})

const itemsFiltrados = computed(() => {
  let items = data.value?.items ?? []
  if (filtroNivel.value !== 'todos') {
    items = items.filter((i) => i.nivel === filtroNivel.value)
  }
  if (filtroTipo.value !== 'todos') {
    items = items.filter((i) => i.tipo === filtroTipo.value)
  }
  return items
})

function formatFecha(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO')
}

function colorNivel(nivel: AlertaNivel): 'error' | 'warning' {
  return nivel === 'roja' ? 'error' : 'warning'
}

function iconoTipo(tipo: AlertaTipo): string {
  if (tipo === 'plazo_critico') return 'i-lucide-alarm-clock-off'
  if (tipo === 'plazo_advertencia') return 'i-lucide-clock-alert'
  return 'i-lucide-mail-warning'
}

function labelTipo(tipo: AlertaTipo): string {
  if (tipo === 'plazo_critico') return 'Plazo crítico'
  if (tipo === 'plazo_advertencia') return 'Plazo próximo'
  return 'Sin abrir'
}

async function cargar() {
  const cargo = cargoFiltro.value || resolveCargoOrigenId()
  const result = await fetchAlertas(cargo)
  if (!result && !loading.value) {
    toast.add({
      title: 'No se pudieron cargar las alertas',
      description: 'Intente nuevamente o verifique su cargo activo.',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  }
}

watch(cargoFiltro, () => {
  void cargar()
})

onMounted(() => {
  cargoFiltro.value =
    resolveCargoOrigenId()
    || cargoActivo.value?.id
    || profile.value?.cargos?.[0]?.id
    || null
  void cargar()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Alertas del sistema"
      description="Plazos por vencer y derivaciones sin abrir de su cargo / área"
    >
      <template #actions>
        <UButton
          to="/bandejas/ingreso"
          color="neutral"
          variant="soft"
          icon="i-lucide-inbox"
          label="Ir a ingreso"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="loading"
          label="Actualizar"
          @click="cargar"
        />
      </template>
    </PageHeader>

    <AppFilter>
      <AppFilterItem label="Ámbito" min-w="280px" flex1 border>
        <USelect
          v-model="cargoFiltro"
          :items="cargoOptions"
          placeholder="Seleccione cargo o área"
          class="w-full"
        />
      </AppFilterItem>
      <AppFilterItem label="Nivel" min-w="160px" border>
        <USelect v-model="filtroNivel" :items="nivelOptions" class="w-full" />
      </AppFilterItem>
      <AppFilterItem label="Tipo" min-w="220px" border>
        <USelect v-model="filtroTipo" :items="tipoOptions" class="w-full" />
      </AppFilterItem>
    </AppFilter>

    <div
      v-if="data?.area || data?.cargo"
      class="text-xs text-muted"
    >
      <template v-if="data?.ambito === 'area'">
        Consultando
        <span class="font-semibold text-highlighted">toda el área</span>
        <template v-if="data?.area">
          —
          <span class="font-semibold text-highlighted">{{ data.area.nombre }}</span>
        </template>
      </template>
      <template v-else>
        Consultando
        <span class="font-semibold text-highlighted">{{ data?.cargo?.nombre }}</span>
        <template v-if="data?.area">
          · Área
          <span class="font-semibold text-highlighted">{{ data.area.nombre }}</span>
        </template>
      </template>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <UCard>
        <p class="text-xs text-muted uppercase tracking-wide">Total alertas</p>
        <p class="mt-1 text-2xl font-semibold text-highlighted tabular-nums">
          {{ resumen.total }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted uppercase tracking-wide">Rojas (≤ 1 día)</p>
        <p class="mt-1 text-2xl font-semibold text-error tabular-nums">
          {{ resumen.rojas }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted uppercase tracking-wide">Amarillas plazo (≤ 3 días)</p>
        <p class="mt-1 text-2xl font-semibold text-warning tabular-nums">
          {{ resumen.plazos_advertencia }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted uppercase tracking-wide">Sin abrir</p>
        <p class="mt-1 text-2xl font-semibold text-warning tabular-nums">
          {{ resumen.no_leidas }}
        </p>
      </UCard>
    </div>

    <!-- Lista -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-highlighted">Listado de alertas</p>
            <p class="text-xs text-muted">{{ itemsFiltrados.length }} resultado(s)</p>
          </div>
        </div>
      </template>

      <div v-if="loading" class="space-y-3">
        <USkeleton class="h-16 w-full" />
        <USkeleton class="h-16 w-full" />
        <USkeleton class="h-16 w-full" />
      </div>

      <UEmpty
        v-else-if="!itemsFiltrados.length"
        icon="i-lucide-shield-check"
        title="Sin alertas"
        :description="data?.ambito === 'area'
          ? 'No hay plazos críticos ni derivaciones sin abrir en el área.'
          : 'No hay plazos críticos ni derivaciones sin abrir para este cargo.'"
      />

      <ul v-else class="divide-y divide-default">
        <li
          v-for="item in itemsFiltrados"
          :key="item.id"
          class="py-4 first:pt-0 last:pb-0"
        >
          <div class="flex flex-col sm:flex-row sm:items-start gap-3">
            <div
              class="size-10 rounded-lg flex items-center justify-center shrink-0"
              :class="item.nivel === 'roja' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'"
            >
              <UIcon :name="iconoTipo(item.tipo)" class="size-5" />
            </div>

            <div class="min-w-0 flex-1 space-y-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm font-semibold text-highlighted">
                  {{ item.titulo }}
                </p>
                <UBadge
                  :color="colorNivel(item.nivel)"
                  variant="subtle"
                  size="sm"
                >
                  {{ item.nivel === 'roja' ? 'Roja' : 'Amarilla' }}
                </UBadge>
                <UBadge color="neutral" variant="subtle" size="sm">
                  {{ labelTipo(item.tipo) }}
                </UBadge>
                <UBadge
                  v-if="data?.ambito === 'area' && item.cargo_destino_nombre"
                  color="primary"
                  variant="subtle"
                  size="sm"
                >
                  {{ item.cargo_destino_nombre }}
                </UBadge>
              </div>

              <p class="text-sm text-default line-clamp-2">
                {{ item.descripcion }}
              </p>

              <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                <span v-if="item.cite" class="font-mono">{{ item.cite }}</span>
                <span v-if="item.proceso">Proceso: {{ item.proceso }}</span>
                <span v-if="item.fecha_plazo">
                  Plazo: {{ formatFecha(item.fecha_plazo) }}
                  <template v-if="item.dias_restantes != null">
                    ({{ item.dias_restantes < 0 ? 'vencido' : `${item.dias_restantes} d` }})
                  </template>
                </span>
                <span v-if="item.fecha_envio">
                  Enviado: {{ formatFecha(item.fecha_envio) }}
                </span>
              </div>
            </div>

            <div class="shrink-0">
              <UButton
                to="/bandejas/ingreso"
                size="sm"
                color="neutral"
                variant="soft"
                icon="i-lucide-arrow-right"
                label="Ver en ingreso"
              />
            </div>
          </div>
        </li>
      </ul>
    </UCard>
  </div>
</template>
