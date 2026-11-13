<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  FiltroRecDashboard,
  RecDashboardData,
  RecDashboardDetalle,
} from '~/types/correspo/recaudacion'
import { backendService } from '~/services/backend.service'
import CodificadorSelect from '~/components/comun/codificador/CodificadorSelect.vue'

useHead({
  title: 'Dashboard recaudaciones - AFCOOP',
})

const toast = useToast()

const loading = ref(false)
const loadingGestiones = ref(false)
const dashboard = ref<RecDashboardData | null>(null)

const anioActual = new Date().getFullYear()
const gestion = ref<number>(anioActual)
const mes = ref<number | null>(null)
const procId = ref<number | null>(null)
const gestiones = ref<number[]>([anioActual])

const MESES = [
  { label: 'Todos los meses', value: null as number | null },
  { label: 'Enero', value: 1 },
  { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 },
  { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 },
  { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 },
  { label: 'Diciembre', value: 12 },
]

const gestionOptions = computed(() =>
  gestiones.value.map((g) => ({ label: String(g), value: g })),
)

function formatImporte(val?: number | null): string {
  if (val == null || Number.isNaN(Number(val))) return '—'
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
  }).format(Number(val))
}

function formatEntero(val?: number | null): string {
  if (val == null || Number.isNaN(Number(val))) return '0'
  return new Intl.NumberFormat('es-BO').format(Number(val))
}

const resumen = computed(() => dashboard.value?.resumen ?? {
  total_importe: 0,
  total_boletas: 0,
  verificados: 0,
  pendientes: 0,
})

const chartPorMes = computed(() =>
  (dashboard.value?.por_mes ?? []).map((m) => ({
    mes: m.label.slice(0, 3),
    importe: Number(m.importe) || 0,
    cantidad: Number(m.cantidad) || 0,
  })),
)

const chartPorProceso = computed(() =>
  (dashboard.value?.por_proceso ?? []).map((p) => ({
    proceso: p.codigo ? `${p.codigo} — ${p.proceso}` : p.proceso,
    importe: Number(p.importe) || 0,
  })),
)

const columns = computed<TableColumn<RecDashboardDetalle>[]>(() => [
  {
    accessorKey: 'mes_label',
    header: 'Mes',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-highlighted' }, row.original.mes_label),
  },
  {
    accessorKey: 'proceso',
    header: 'Proceso',
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col min-w-0 max-w-xs' }, [
        h(
          'span',
          { class: 'text-sm font-medium text-highlighted truncate' },
          row.original.proceso,
        ),
        row.original.codigo
          ? h('span', { class: 'text-[11px] text-muted font-mono' }, row.original.codigo)
          : null,
      ]),
  },
  {
    accessorKey: 'cantidad',
    header: 'Boletas',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-sm' }, formatEntero(row.original.cantidad)),
  },
  {
    accessorKey: 'importe',
    header: 'Importe',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'font-semibold tabular-nums text-sm text-highlighted' },
        formatImporte(row.original.importe),
      ),
  },
  {
    accessorKey: 'verificados',
    header: 'Verificados',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-sm text-success' }, formatEntero(row.original.verificados)),
  },
  {
    accessorKey: 'pendientes',
    header: 'Pendientes',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-sm text-warning' }, formatEntero(row.original.pendientes)),
  },
])

async function cargarGestiones() {
  loadingGestiones.value = true
  try {
    const res = await backendService.get<number[]>('recaudaciones/dashboard/gestiones')
    const data = (res as { data?: number[] })?.data ?? []
    if (Array.isArray(data) && data.length) {
      gestiones.value = data
      if (!gestiones.value.includes(gestion.value)) {
        gestion.value = gestiones.value[0]!
      }
    }
  } catch {
    // fallback: año actual
  } finally {
    loadingGestiones.value = false
  }
}

async function cargarDashboard() {
  loading.value = true
  try {
    const filtro: FiltroRecDashboard = {
      gestion: gestion.value,
    }
    if (mes.value) filtro.mes = mes.value
    if (procId.value && procId.value > 0) filtro.proc_id = procId.value

    const res = await backendService.post<RecDashboardData>(
      'recaudaciones/dashboard',
      filtro,
    )
    dashboard.value = ((res as { data?: RecDashboardData })?.data ?? res) as RecDashboardData
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo cargar el dashboard',
      description: err?.data?.message || err?.message || 'Error al consultar recaudaciones',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
    dashboard.value = null
  } finally {
    loading.value = false
  }
}

function limpiarFiltros() {
  mes.value = null
  procId.value = null
  gestion.value = gestiones.value[0] ?? anioActual
}

watch([gestion, mes, procId], () => {
  void cargarDashboard()
})

onMounted(async () => {
  await cargarGestiones()
  await cargarDashboard()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Dashboard de recaudaciones"
      description="Resumen de depósitos por gestión, mes y proceso"
    >
      <template #actions>
        <UButton
          to="/recaudaciones"
          color="neutral"
          variant="soft"
          icon="i-lucide-list"
          label="Ver boletas"
        />
      </template>
    </PageHeader>

    <AppFilter>
      <AppFilterItem label="Gestión" min-w="140px" border>
        <USelect
          v-model="gestion"
          :items="gestionOptions"
          :loading="loadingGestiones"
          class="w-full"
        />
      </AppFilterItem>

      <AppFilterItem label="Mes" min-w="180px" border>
        <USelect
          v-model="mes"
          :items="MESES"
          class="w-full"
        />
      </AppFilterItem>

      <AppFilterItem label="Proceso" min-w="260px" flex1 border>
        <CodificadorSelect
          v-model="procId"
          endpoint="comun/codificador/procesos"
          placeholder="Todos los procesos"
          incluir-todos
          class="w-full"
        />
      </AppFilterItem>

      <div class="pl-3 flex items-center gap-2">
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          size="xs"
          label="Actualizar"
          :loading="loading"
          @click="cargarDashboard"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          label="Limpiar"
          @click="limpiarFiltros"
        />
      </div>
    </AppFilter>

    <!-- KPIs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs text-muted uppercase tracking-wide">Importe total</p>
            <p class="mt-1 text-2xl font-semibold text-highlighted tabular-nums">
              {{ formatImporte(resumen.total_importe) }}
            </p>
          </div>
          <div class="rounded-lg bg-primary/10 p-2 text-primary">
            <UIcon name="i-lucide-banknote" class="size-5" />
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs text-muted uppercase tracking-wide">Boletas</p>
            <p class="mt-1 text-2xl font-semibold text-highlighted tabular-nums">
              {{ formatEntero(resumen.total_boletas) }}
            </p>
          </div>
          <div class="rounded-lg bg-info/10 p-2 text-info">
            <UIcon name="i-lucide-receipt" class="size-5" />
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs text-muted uppercase tracking-wide">Verificados</p>
            <p class="mt-1 text-2xl font-semibold text-highlighted tabular-nums">
              {{ formatEntero(resumen.verificados) }}
            </p>
          </div>
          <div class="rounded-lg bg-success/10 p-2 text-success">
            <UIcon name="i-lucide-badge-check" class="size-5" />
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs text-muted uppercase tracking-wide">Pendientes</p>
            <p class="mt-1 text-2xl font-semibold text-highlighted tabular-nums">
              {{ formatEntero(resumen.pendientes) }}
            </p>
          </div>
          <div class="rounded-lg bg-warning/10 p-2 text-warning">
            <UIcon name="i-lucide-clock" class="size-5" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Gráficos -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <div>
            <p class="text-sm font-semibold text-highlighted">Importe por mes</p>
            <p class="text-xs text-muted">Gestión {{ gestion }}</p>
          </div>
        </template>
        <div v-if="loading" class="space-y-3 py-6">
          <USkeleton class="h-48 w-full" />
        </div>
        <UEmpty
          v-else-if="!chartPorMes.length"
          icon="i-lucide-bar-chart-3"
          title="Sin datos"
          description="No hay depósitos para los filtros seleccionados."
        />
        <UChart
          v-else
          type="bar"
          :data="chartPorMes"
          index="mes"
          :categories="[{ key: 'importe', label: 'Importe' }]"
          :format="formatImporte"
          :aspect-ratio="1.6"
          :initial-width="560"
          legend
          aria-label="Importe de recaudaciones por mes"
        />
      </UCard>

      <UCard>
        <template #header>
          <div>
            <p class="text-sm font-semibold text-highlighted">Distribución por proceso</p>
            <p class="text-xs text-muted">Participación del importe</p>
          </div>
        </template>
        <div v-if="loading" class="space-y-3 py-6">
          <USkeleton class="h-48 w-full" />
        </div>
        <UEmpty
          v-else-if="!chartPorProceso.length"
          icon="i-lucide-pie-chart"
          title="Sin datos"
          description="No hay depósitos para graficar por proceso."
        />
        <UChart
          v-else
          type="donut"
          :data="chartPorProceso"
          index="proceso"
          :categories="['importe']"
          :thickness="18"
          :format="formatImporte"
          :aspect-ratio="1.2"
          :initial-width="480"
          legend
          aria-label="Importe de recaudaciones por proceso"
        >
          <template #center>
            <span class="text-lg font-semibold text-highlighted tabular-nums">
              {{ formatImporte(resumen.total_importe) }}
            </span>
            <span class="text-xs text-muted">Total</span>
          </template>
        </UChart>
      </UCard>
    </div>

    <!-- Tabla -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-highlighted">Detalle por mes y proceso</p>
            <p class="text-xs text-muted">
              {{ formatEntero(dashboard?.detalle?.length ?? 0) }} filas agregadas
            </p>
          </div>
        </div>
      </template>

      <div v-if="loading" class="space-y-2">
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-10 w-full" />
      </div>
      <UEmpty
        v-else-if="!(dashboard?.detalle?.length)"
        icon="i-lucide-table"
        title="Sin filas"
        description="Ajuste los filtros o registre depósitos en esta gestión."
      />
      <UTable
        v-else
        :columns="columns"
        :data="dashboard?.detalle ?? []"
        class="min-w-full"
      />
    </UCard>
  </div>
</template>
