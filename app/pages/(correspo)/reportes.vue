<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  ReporteChartCategory,
  ReporteCorrespCooperativa,
  ReporteCorrespProceso,
  ReporteRecaudacionCooperativa,
  ReporteRecaudacionProceso,
  ReportesResumen,
} from '~/types/correspo/reportes'
import { get } from '~/services/backend.service'

useHead({
  title: 'Reportes - AFCOOP',
})

const toast = useToast()

const loading = ref(false)
const loadingGestiones = ref(false)
const resumen = ref<ReportesResumen | null>(null)

const anioActual = new Date().getFullYear()
const gestion = ref<number>(anioActual)
const gestiones = ref<number[]>([anioActual])

const gestionOptions = computed(() =>
  gestiones.value.map((g) => ({ label: String(g), value: g })),
)

function formatEntero(val?: number | null): string {
  if (val == null || Number.isNaN(Number(val))) return '0'
  return new Intl.NumberFormat('es-BO').format(Number(val))
}

function formatImporte(val?: number | null): string {
  if (val == null || Number.isNaN(Number(val))) return '—'
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
  }).format(Number(val))
}

function etiquetaProceso(codigo: string | null | undefined, nombre: string): string {
  const n = nombre?.trim() || 'Sin nombre'
  const c = codigo?.trim()
  return c ? `${c} — ${n}` : n
}

function acortar(texto: string, max = 28): string {
  const t = texto.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

const correspProceso = computed(() => resumen.value?.corresp_por_proceso ?? [])
const correspCoopSerie = computed(() => resumen.value?.corresp_por_cooperativa)
const correspCoop = computed(() => correspCoopSerie.value?.ranking ?? [])
const recProceso = computed(() => resumen.value?.recaudacion_por_proceso ?? [])
const recCoopSerie = computed(() => resumen.value?.recaudacion_por_cooperativa)
const recCoop = computed(() => recCoopSerie.value?.ranking ?? [])

const chartCorrespProceso = computed(() =>
  correspProceso.value.map((r) => ({
    label: acortar(etiquetaProceso(r.codigo, r.nombre), 24),
    cantidad: Number(r.cantidad) || 0,
  })),
)

const chartCorrespCoop = computed(() => correspCoopSerie.value?.por_mes ?? [])
const chartCorrespCoopCategories = computed<ReporteChartCategory[]>(() =>
  correspCoopSerie.value?.categories ?? [],
)

const chartRecProceso = computed(() =>
  recProceso.value.map((r) => ({
    label: acortar(etiquetaProceso(r.codigo, r.nombre), 24),
    importe: Number(r.importe) || 0,
  })),
)

const chartRecCoop = computed(() => recCoopSerie.value?.por_mes ?? [])
const chartRecCoopCategories = computed<ReporteChartCategory[]>(() =>
  recCoopSerie.value?.categories ?? [],
)

const totalCorrespProceso = computed(() =>
  correspProceso.value.reduce((acc, r) => acc + (Number(r.cantidad) || 0), 0),
)
const totalCorrespCoop = computed(() =>
  correspCoop.value.reduce((acc, r) => acc + (Number(r.cantidad) || 0), 0),
)
const totalRecProceso = computed(() =>
  recProceso.value.reduce((acc, r) => acc + (Number(r.importe) || 0), 0),
)
const totalRecCoop = computed(() =>
  recCoop.value.reduce((acc, r) => acc + (Number(r.importe) || 0), 0),
)

const tieneChartCorrespCoop = computed(
  () =>
    chartCorrespCoopCategories.value.length > 0
    && chartCorrespCoop.value.some((row) =>
      chartCorrespCoopCategories.value.some((c) => Number(row[c.key]) > 0),
    ),
)
const tieneChartRecCoop = computed(
  () =>
    chartRecCoopCategories.value.length > 0
    && chartRecCoop.value.some((row) =>
      chartRecCoopCategories.value.some((c) => Number(row[c.key]) > 0),
    ),
)

const colsCorrespProceso = computed<TableColumn<ReporteCorrespProceso>[]>(() => [
  {
    id: 'rank',
    header: '#',
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-muted tabular-nums' }, String(row.index + 1)),
  },
  {
    accessorKey: 'nombre',
    header: 'Proceso',
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col min-w-0 max-w-xs' }, [
        h('span', { class: 'text-sm font-medium text-highlighted truncate' }, row.original.nombre),
        row.original.codigo
          ? h('span', { class: 'text-[11px] text-muted font-mono' }, row.original.codigo)
          : null,
      ]),
  },
  {
    accessorKey: 'cantidad',
    header: 'Cantidad',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-sm font-semibold text-highlighted' }, formatEntero(row.original.cantidad)),
  },
])

const colsCorrespCoop = computed<TableColumn<ReporteCorrespCooperativa>[]>(() => [
  {
    id: 'rank',
    header: '#',
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-muted tabular-nums' }, String(row.index + 1)),
  },
  {
    accessorKey: 'nombre',
    header: 'Cooperativa',
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col min-w-0 max-w-xs' }, [
        h('span', { class: 'text-sm font-medium text-highlighted truncate' }, row.original.nombre),
        row.original.nro_registro
          ? h('span', { class: 'text-[11px] text-muted font-mono' }, row.original.nro_registro)
          : null,
      ]),
  },
  {
    accessorKey: 'cantidad',
    header: 'Cantidad',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-sm font-semibold text-highlighted' }, formatEntero(row.original.cantidad)),
  },
])

const colsRecProceso = computed<TableColumn<ReporteRecaudacionProceso>[]>(() => [
  {
    id: 'rank',
    header: '#',
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-muted tabular-nums' }, String(row.index + 1)),
  },
  {
    accessorKey: 'nombre',
    header: 'Proceso',
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col min-w-0 max-w-xs' }, [
        h('span', { class: 'text-sm font-medium text-highlighted truncate' }, row.original.nombre),
        row.original.codigo
          ? h('span', { class: 'text-[11px] text-muted font-mono' }, row.original.codigo)
          : null,
      ]),
  },
  {
    accessorKey: 'cantidad_boletas',
    header: 'Boletas',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-sm' }, formatEntero(row.original.cantidad_boletas)),
  },
  {
    accessorKey: 'importe',
    header: 'Importe',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-sm font-semibold text-highlighted' }, formatImporte(row.original.importe)),
  },
])

const colsRecCoop = computed<TableColumn<ReporteRecaudacionCooperativa>[]>(() => [
  {
    id: 'rank',
    header: '#',
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-muted tabular-nums' }, String(row.index + 1)),
  },
  {
    accessorKey: 'nombre',
    header: 'Cooperativa',
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col min-w-0 max-w-xs' }, [
        h('span', { class: 'text-sm font-medium text-highlighted truncate' }, row.original.nombre),
        row.original.nro_registro
          ? h('span', { class: 'text-[11px] text-muted font-mono' }, row.original.nro_registro)
          : null,
      ]),
  },
  {
    accessorKey: 'cantidad_boletas',
    header: 'Boletas',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-sm' }, formatEntero(row.original.cantidad_boletas)),
  },
  {
    accessorKey: 'importe',
    header: 'Importe',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums text-sm font-semibold text-highlighted' }, formatImporte(row.original.importe)),
  },
])

async function cargarGestiones() {
  loadingGestiones.value = true
  try {
    const res = await get<number[]>('reportes/gestiones')
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

async function cargarReportes() {
  loading.value = true
  try {
    const res = await get<ReportesResumen>('reportes', {
      gestion: gestion.value,
      top: 10,
    })
    resumen.value = ((res as { data?: ReportesResumen })?.data ?? res) as ReportesResumen
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudieron cargar los reportes',
      description: err?.data?.message || err?.message || 'Error al consultar agregaciones',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
    resumen.value = null
  } finally {
    loading.value = false
  }
}

watch(gestion, () => {
  void cargarReportes()
})

onMounted(async () => {
  await cargarGestiones()
  await cargarReportes()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Reportes"
      description="Top 10 de correspondencia y recaudación por proceso y cooperativa"
    >
      <template #actions>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="soft"
          label="Actualizar"
          :loading="loading"
          @click="cargarReportes"
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
      <div class="pl-3 flex items-center">
        <UBadge color="neutral" variant="subtle" size="md">
          Top 10
        </UBadge>
      </div>
    </AppFilter>

    <!-- Correspondencia por proceso -->
    <UCard>
      <template #header>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-highlighted">Correspondencia por proceso</p>
            <p class="text-xs text-muted">
              Top 10 · {{ formatEntero(totalCorrespProceso) }} en ranking · Gestión {{ gestion }}
            </p>
          </div>
          <UIcon name="i-lucide-workflow" class="size-5 text-primary shrink-0" />
        </div>
      </template>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <div v-if="loading" class="space-y-2">
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
          </div>
          <UEmpty
            v-else-if="!correspProceso.length"
            icon="i-lucide-table"
            title="Sin datos"
            description="No hay correspondencia registrada para esta gestión."
          />
          <UTable
            v-else
            :columns="colsCorrespProceso"
            :data="correspProceso"
            class="min-w-full"
          />
        </div>
        <div>
          <div v-if="loading" class="space-y-3 py-6">
            <USkeleton class="h-48 w-full" />
          </div>
          <UEmpty
            v-else-if="!chartCorrespProceso.length"
            icon="i-lucide-bar-chart-3"
            title="Sin gráfico"
            description="No hay datos para graficar."
          />
          <UChart
            v-else
            type="bar"
            :data="chartCorrespProceso"
            index="label"
            :categories="[{ key: 'cantidad', label: 'Correspondencias' }]"
            :format="formatEntero"
            :aspect-ratio="1.5"
            :initial-width="520"
            legend
            aria-label="Correspondencia por proceso"
          />
        </div>
      </div>
    </UCard>

    <!-- Correspondencia por cooperativa -->
    <UCard>
      <template #header>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-highlighted">Correspondencia por cooperativa</p>
            <p class="text-xs text-muted">
              Top 10 · dimensión mensual · {{ formatEntero(totalCorrespCoop) }} · Gestión {{ gestion }}
            </p>
          </div>
          <UIcon name="i-lucide-building-2" class="size-5 text-info shrink-0" />
        </div>
      </template>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <div v-if="loading" class="space-y-2">
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
          </div>
          <UEmpty
            v-else-if="!correspCoop.length"
            icon="i-lucide-table"
            title="Sin datos"
            description="No hay correspondencias vinculadas a cooperativas."
          />
          <UTable
            v-else
            :columns="colsCorrespCoop"
            :data="correspCoop"
            class="min-w-full"
          />
        </div>
        <div>
          <div v-if="loading" class="space-y-3 py-6">
            <USkeleton class="h-48 w-full" />
          </div>
          <UEmpty
            v-else-if="!tieneChartCorrespCoop"
            icon="i-lucide-pie-chart"
            title="Sin gráfico"
            description="No hay datos mensuales para graficar."
          />
          <UChart
            v-else
            type="bar"
            :data="chartCorrespCoop"
            index="month"
            :categories="chartCorrespCoopCategories"
            :format="formatEntero"
            :aspect-ratio="1.5"
            :initial-width="520"
            legend
            aria-label="Correspondencia por cooperativa y mes"
          />
        </div>
      </div>
    </UCard>

    <!-- Recaudación por cooperativa -->
    <UCard>
      <template #header>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-highlighted">Recaudación por cooperativa</p>
            <p class="text-xs text-muted">
              Top 10 · dimensión mensual · {{ formatImporte(totalRecCoop) }} · Año depósito {{ gestion }}
            </p>
          </div>
          <UIcon name="i-lucide-banknote" class="size-5 text-success shrink-0" />
        </div>
      </template>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <div v-if="loading" class="space-y-2">
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
          </div>
          <UEmpty
            v-else-if="!recCoop.length"
            icon="i-lucide-table"
            title="Sin datos"
            description="No hay depósitos vinculados a cooperativas en este año."
          />
          <UTable
            v-else
            :columns="colsRecCoop"
            :data="recCoop"
            class="min-w-full"
          />
        </div>
        <div>
          <div v-if="loading" class="space-y-3 py-6">
            <USkeleton class="h-48 w-full" />
          </div>
          <UEmpty
            v-else-if="!tieneChartRecCoop"
            icon="i-lucide-pie-chart"
            title="Sin gráfico"
            description="No hay datos mensuales para graficar."
          />
          <UChart
            v-else
            type="bar"
            :data="chartRecCoop"
            index="month"
            :categories="chartRecCoopCategories"
            :format="formatImporte"
            :aspect-ratio="1.5"
            :initial-width="520"
            legend
            aria-label="Recaudación por cooperativa y mes"
          />
        </div>
      </div>
    </UCard>

    <!-- Recaudación por proceso -->
    <UCard>
      <template #header>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-highlighted">Recaudación por proceso</p>
            <p class="text-xs text-muted">
              Top 10 · {{ formatImporte(totalRecProceso) }} · Año depósito {{ gestion }}
            </p>
          </div>
          <UIcon name="i-lucide-chart-column" class="size-5 text-warning shrink-0" />
        </div>
      </template>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <div v-if="loading" class="space-y-2">
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
          </div>
          <UEmpty
            v-else-if="!recProceso.length"
            icon="i-lucide-table"
            title="Sin datos"
            description="No hay depósitos vinculados a procesos en este año."
          />
          <UTable
            v-else
            :columns="colsRecProceso"
            :data="recProceso"
            class="min-w-full"
          />
        </div>
        <div>
          <div v-if="loading" class="space-y-3 py-6">
            <USkeleton class="h-48 w-full" />
          </div>
          <UEmpty
            v-else-if="!chartRecProceso.length"
            icon="i-lucide-bar-chart-3"
            title="Sin gráfico"
            description="No hay datos para graficar."
          />
          <UChart
            v-else
            type="bar"
            :data="chartRecProceso"
            index="label"
            :categories="[{ key: 'importe', label: 'Importe' }]"
            :format="formatImporte"
            :aspect-ratio="1.5"
            :initial-width="520"
            legend
            aria-label="Recaudación por proceso"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
