<script setup lang="ts">
import type { DashboardResumen } from '~/types/dashboard'
import type { RespuestaApi } from '~/types/respuestas'
import { get } from '~/services/backend.service'

useHead({
  title: 'Dashboard - Correspondencia AFCOOP',
})

const toast = useToast()
const { profile } = useProfile()

const anioActual = new Date().getFullYear()
const gestion = ref(anioActual)
const loading = ref(false)
const resumen = ref<DashboardResumen | null>(null)

const gestionesDisponibles = computed(() => {
  const years: { label: string; value: number }[] = []
  for (let y = anioActual; y >= anioActual - 4; y--) {
    years.push({ label: `Gestión ${y}`, value: y })
  }
  return years
})

async function cargarResumen() {
  const gestionNum = Number(gestion.value)
  if (!Number.isFinite(gestionNum)) return

  loading.value = true
  try {
    const res = await get<DashboardResumen>('dashboard/resumen', {
      gestion: gestionNum,
    })
    resumen.value = (res as RespuestaApi<DashboardResumen>)?.data ?? null
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo cargar el dashboard',
      description: err?.data?.message || err?.message || 'Error al obtener el resumen.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    resumen.value = null
  } finally {
    loading.value = false
  }
}

watch(gestion, () => {
  void cargarResumen()
}, { immediate: true })

interface MetricaCard {
  key: string
  label: string
  value: number
  icon: string
  to: string
  hint?: string
  highlight?: boolean
}

const metricasPrincipales = computed<MetricaCard[]>(() => {
  const b = resumen.value?.bandejas
  const d = resumen.value?.derivaciones
  if (!b || !d) return []
  return [
    {
      key: 'nuevas',
      label: 'Nuevas derivaciones',
      value: d.nuevas,
      icon: 'i-lucide-bell-ring',
      to: '/bandejas/ingreso',
      hint: 'Sin leer en ingreso',
      highlight: d.nuevas > 0,
    },
    {
      key: 'derivaciones',
      label: 'Total derivaciones',
      value: d.total,
      icon: 'i-lucide-git-branch',
      to: '/bandejas/ingreso',
      hint: 'Ingreso + salida',
    },
    {
      key: 'area',
      label: 'Correspondencia del área',
      value: resumen.value?.correspondencia_area ?? 0,
      icon: 'i-lucide-building-2',
      to: '/bandejas/archivo',
      hint: resumen.value?.area?.nombre || 'Área activa',
    },
  ]
})

const bandejasCards = computed<MetricaCard[]>(() => {
  const b = resumen.value?.bandejas
  if (!b) return []
  return [
    {
      key: 'borrador',
      label: 'Principal',
      value: b.borrador,
      icon: 'i-lucide-file-edit',
      to: '/bandejas/borrador',
    },
    {
      key: 'ingreso',
      label: 'Ingreso',
      value: b.ingreso,
      icon: 'i-lucide-arrow-down-left',
      to: '/bandejas/ingreso',
    },
    {
      key: 'salida',
      label: 'Salida',
      value: b.salida,
      icon: 'i-lucide-arrow-up-right',
      to: '/bandejas/salida',
    },
    {
      key: 'con_copia',
      label: 'Con copia',
      value: b.con_copia,
      icon: 'i-lucide-copy',
      to: '/bandejas/con-copia',
    },
    {
      key: 'compartidos',
      label: 'Compartidos',
      value: b.compartidos,
      icon: 'i-lucide-share-2',
      to: '/bandejas/compartidos',
    },
    {
      key: 'archivo',
      label: 'Archivo',
      value: b.archivo,
      icon: 'i-lucide-archive',
      to: '/bandejas/archivo',
    },
  ]
})

const saludo = computed(() => {
  const nombre = profile.value?.nombre_completo?.split(' ')[0]
  return nombre ? `Hola, ${nombre}` : 'Dashboard'
})
</script>

<template>
  <div class="space-y-8">
    <PageHeader
      :title="saludo"
      description="Resumen de Procesos y derivaciones según su cargo y área."
    >
      <template #actions>
        <USelect
          v-model="gestion"
          :items="gestionesDisponibles"
          value-key="value"
          class="w-44"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="loading"
          title="Actualizar"
          @click="cargarResumen"
        />
      </template>
    </PageHeader>

    <div
      v-if="resumen"
      class="flex flex-wrap items-center gap-2 text-sm text-muted"
    >
      <UBadge color="primary" variant="subtle" size="md">
        Gestión {{ resumen.gestion }}
      </UBadge>
      <UBadge
        v-if="resumen.area"
        color="neutral"
        variant="subtle"
        size="md"
        icon="i-lucide-building-2"
      >
        {{ resumen.area.nombre }}
      </UBadge>
      <UBadge
        color="neutral"
        variant="outline"
        size="md"
        icon="i-lucide-briefcase"
      >
        {{ resumen.cargo.nombre }}
      </UBadge>
    </div>

    <div
      v-if="loading && !resumen"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="h-28 animate-pulse rounded-md bg-elevated"
      />
    </div>

    <template v-else-if="resumen">
      <section class="space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">
          Indicadores
        </h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="card in metricasPrincipales"
            :key="card.key"
            :to="card.to"
            class="group rounded-md border border-default bg-default p-5 shadow-xs transition hover:border-primary/40 hover:shadow-sm"
            :class="card.highlight ? 'ring-1 ring-primary/30 bg-primary/5' : ''"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">
                  {{ card.label }}
                </p>
                <p class="text-3xl font-bold tracking-tight text-highlighted">
                  {{ card.value }}
                </p>
                <p v-if="card.hint" class="text-xs text-muted">
                  {{ card.hint }}
                </p>
              </div>
              <div
                class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"
              >
                <UIcon :name="card.icon" class="size-5" />
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">
          Correspondencia por bandeja
        </h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <NuxtLink
            v-for="card in bandejasCards"
            :key="card.key"
            :to="card.to"
            class="rounded-md border border-default bg-default p-4 shadow-xs transition hover:border-primary/40 hover:shadow-sm"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex size-9 shrink-0 items-center justify-center rounded-md bg-elevated text-muted group-hover:text-primary"
              >
                <UIcon :name="card.icon" class="size-4.5" />
              </div>
              <div class="min-w-0">
                <p class="truncate text-xs font-medium text-muted">
                  {{ card.label }}
                </p>
                <p class="text-xl font-bold text-highlighted">
                  {{ card.value }}
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>
    </template>

    <div
      v-else
      class="rounded-md border border-dashed border-default p-10 text-center text-sm text-muted"
    >
      No hay datos para mostrar. Verifique su cargo activo o intente actualizar.
    </div>
  </div>
</template>
