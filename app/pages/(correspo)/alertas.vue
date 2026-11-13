<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { AlertaNivel, AlertaTipo } from '~/types/correspo/alertas'
import { ALERTAS_AMBITO_AREA } from '~/types/correspo/alertas'
import { useAlertas } from '~/composables/correspo/useAlertas'
import { useProfile } from '~/composables/comun/useProfile'

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

const headerBadge = computed(() => {
  const n = resumen.value.total
  if (!n) return 'Sin pendientes'
  return `${n} alerta${n === 1 ? '' : 's'}`
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
  <div class="space-y-5">
    <BandejaViewHeader
      titulo="Alertas del sistema"
      descripcion="Plazos por vencer y derivaciones sin abrir de su cargo o área"
      icono="i-lucide-triangle-alert"
      :badge="headerBadge"
    >
      <template #actions>
        <UButton
          to="/bandejas/ingreso"
          color="neutral"
          variant="outline"
          icon="i-lucide-inbox"
          label="Ir a ingreso"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="primary"
          variant="soft"
          :loading="loading"
          label="Actualizar"
          @click="cargar"
        />
      </template>
    </BandejaViewHeader>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <BandejaStatCard
        label="Total alertas"
        :value="resumen.total"
        hint="Plazos + sin abrir"
        icon="i-lucide-bell-ring"
        tone="primary"
      />
      <BandejaStatCard
        label="Rojas (≤ 1 día)"
        :value="resumen.rojas"
        hint="Críticas o vencidas"
        icon="i-lucide-alarm-clock-off"
        tone="error"
      />
      <BandejaStatCard
        label="Amarillas plazo"
        :value="resumen.plazos_advertencia"
        hint="Vencen en ≤ 3 días"
        icon="i-lucide-clock-alert"
        tone="warning"
      />
      <BandejaStatCard
        label="Sin abrir"
        :value="resumen.no_leidas"
        hint="Derivaciones nuevas"
        icon="i-lucide-mail-warning"
        tone="warning"
      />
    </div>

    <AppFilter
      title="Filtros de alertas"
      description="Ámbito del cargo/área y clasificación de la alerta"
    >
      <AppFilterItem label="Ámbito" min-w="280px" flex1>
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
      class="flex flex-wrap items-center gap-2 text-xs"
    >
      <UBadge color="neutral" variant="subtle" size="sm">
        <template v-if="data?.ambito === 'area'">
          Toda el área{{ data?.area ? ` — ${data.area.nombre}` : '' }}
        </template>
        <template v-else>
          {{ data?.cargo?.nombre }}{{ data?.area ? ` · ${data.area.nombre}` : '' }}
        </template>
      </UBadge>
      <span class="text-muted">{{ itemsFiltrados.length }} resultado(s) visibles</span>
    </div>

    <div class="rounded-xl border border-default bg-default/60 shadow-xs overflow-hidden">
      <div class="px-4 py-3 border-b border-default flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-highlighted">Listado de alertas</p>
          <p class="text-xs text-muted">Priorizadas por criticidad de plazo</p>
        </div>
      </div>

      <div class="p-4">
        <div v-if="loading" class="space-y-3">
          <USkeleton class="h-16 w-full rounded-lg" />
          <USkeleton class="h-16 w-full rounded-lg" />
          <USkeleton class="h-16 w-full rounded-lg" />
        </div>

        <UEmpty
          v-else-if="!itemsFiltrados.length"
          icon="i-lucide-shield-check"
          title="Sin alertas"
          :description="data?.ambito === 'area'
            ? 'No hay plazos críticos ni derivaciones sin abrir en el área.'
            : 'No hay plazos críticos ni derivaciones sin abrir para este cargo.'"
        />

        <ul v-else class="space-y-2.5">
          <li
            v-for="item in itemsFiltrados"
            :key="item.id"
            class="rounded-xl border border-default bg-elevated/30 hover:bg-elevated/60 transition-colors p-3.5"
            :class="item.nivel === 'roja'
              ? 'border-l-4 border-l-error'
              : 'border-l-4 border-l-warning'"
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
                  <span v-if="item.cite" class="font-mono text-primary">{{ item.cite }}</span>
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
                  color="primary"
                  variant="soft"
                  icon="i-lucide-arrow-right"
                  label="Ver en ingreso"
                />
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
