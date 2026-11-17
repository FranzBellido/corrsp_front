<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type {
  FiltroSeguimientoAdmin,
  RespuestaBusquedaSeguimientoAdmin,
  SeguimientoResumen,
} from '~/types/poa/seguimiento-actividad'
import {
  POA_FORMULACION_ESTADO_ENVIADO_ID,
  POA_FORMULACION_ESTADO_OBSERVADO_ID,
  POA_FORMULACION_ESTADO_VALIDADO_ID,
} from '~/types/poa/formulacion'
import type { PoaVersionLookup } from '~/types/poa/poa-version'
import type { PoaConfiguracion } from '~/types/poa/configuracion'
import { backendService } from '~/services/backend.service'
import {
  CLASE_CONTENEDOR_ACCIONES_CELDA,
  enriquecerItemMenuAcciones,
  hMenuAccionesTabla,
  META_COLUMNA_ACCIONES_TABLA,
} from '~/utils/shared/acciones-menu'

const UBadge = resolveComponent('UBadge')
const PoaEstadoBadge = resolveComponent('PoaEstadoBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()

const loading = ref(false)
const items = ref<SeguimientoResumen[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filtroTexto = ref('')
const filtroGestion = ref<number | 'todas'>('todas')
const filtroTrimestre = ref<number | 'todos'>('todos')
const filtroEstado = ref<number | 'todos'>('todos')
const gestiones = ref<PoaVersionLookup[]>([])
const defaultsCargados = ref(false)

const isDetalleOpen = ref(false)
const detalleId = ref<string | null>(null)

const isCambioEstadoOpen = ref(false)
const cambioEstadoId = ref<string | null>(null)
const cambioEstadoDestino = ref<number | null>(null)
const cambioEstadoTitulo = ref('')
const cambioEstadoDescripcion = ref('')
const cambioEstadoLabel = ref('')
const cambioEstadoIcon = ref('i-lucide-check')
const cambioEstadoColor = ref<'primary' | 'success' | 'warning'>('primary')

const gestionOptions = computed(() => [
  { label: 'Todas las gestiones', value: 'todas' as const },
  ...gestiones.value.map((v) => ({
    label: `${v.gestion} — ${v.nombre}`,
    value: v.gestion,
  })),
])

const trimestreOptions = [
  { label: 'Todos los trimestres', value: 'todos' as const },
  { label: 'T1', value: 1 },
  { label: 'T2', value: 2 },
  { label: 'T3', value: 3 },
  { label: 'T4', value: 4 },
]

const estadoOptions = [
  { label: 'Todos los estados', value: 'todos' as const },
  { label: 'Borrador', value: 1 },
  { label: 'Enviado', value: POA_FORMULACION_ESTADO_ENVIADO_ID },
  { label: 'Observado', value: POA_FORMULACION_ESTADO_OBSERVADO_ID },
  { label: 'Validado', value: POA_FORMULACION_ESTADO_VALIDADO_ID },
]

const puedeAccionarAdmin = (row: SeguimientoResumen) =>
  row.estado_id === POA_FORMULACION_ESTADO_ENVIADO_ID

const abrirDetalle = (row: SeguimientoResumen) => {
  detalleId.value = row.id
  isDetalleOpen.value = true
}

const abrirCambioEstado = (
  row: SeguimientoResumen,
  estadoId: number,
  opts: {
    titulo: string
    descripcion: string
    label: string
    icon: string
    color: 'primary' | 'success' | 'warning'
  },
) => {
  cambioEstadoId.value = row.id
  cambioEstadoDestino.value = estadoId
  cambioEstadoTitulo.value = opts.titulo
  cambioEstadoDescripcion.value = opts.descripcion
  cambioEstadoLabel.value = opts.label
  cambioEstadoIcon.value = opts.icon
  cambioEstadoColor.value = opts.color
  isCambioEstadoOpen.value = true
}

const buildMenu = (row: SeguimientoResumen): DropdownMenuItem[] => {
  const activo = puedeAccionarAdmin(row)
  const motivo = activo
    ? undefined
    : 'Disponible solo para seguimientos en estado Enviado.'

  return [
    {
      label: 'Ver avances',
      icon: 'i-lucide-activity',
      onSelect: () => {
        navigateTo({
          path: '/seguimiento',
          query: { modo: 'admin', seguimiento_id: row.id },
        })
      },
    },
    enriquecerItemMenuAcciones(
      {
        label: 'Validar',
        icon: 'i-lucide-badge-check',
        disabled: !activo,
        onSelect: () =>
          abrirCambioEstado(row, POA_FORMULACION_ESTADO_VALIDADO_ID, {
            titulo: 'Validar seguimiento',
            descripcion: 'El informe pasará al estado Validado (5).',
            label: 'Validar',
            icon: 'i-lucide-badge-check',
            color: 'success',
          }),
      },
      motivo,
    ),
    enriquecerItemMenuAcciones(
      {
        label: 'Observar',
        icon: 'i-lucide-message-square-warning',
        disabled: !activo,
        onSelect: () =>
          abrirCambioEstado(row, POA_FORMULACION_ESTADO_OBSERVADO_ID, {
            titulo: 'Observar seguimiento',
            descripcion: 'El informe pasará al estado Observado (4).',
            label: 'Observar',
            icon: 'i-lucide-message-square-warning',
            color: 'warning',
          }),
      },
      motivo,
    ),
  ]
}

const columns: TableColumn<SeguimientoResumen>[] = [
  {
    id: 'gestion',
    header: 'Gestión',
    cell: ({ row }) =>
      h(
        UBadge,
        { color: 'primary', variant: 'subtle', size: 'xs', class: 'font-mono font-bold' },
        () =>
          String(
            row.original.poa_formulacion?.version_id
              ?? row.original.poa_formulacion?.poa_version?.gestion
              ?? '—',
          ),
      ),
  },
  {
    accessorKey: 'trimestre',
    header: 'Trim.',
    cell: ({ row }) =>
      h(
        UBadge,
        { color: 'neutral', variant: 'subtle', size: 'xs', class: 'font-mono' },
        () => `T${row.original.trimestre}`,
      ),
  },
  {
    id: 'area',
    header: 'Área',
    cell: ({ row }) => {
      const a = row.original.poa_formulacion?.areas
      if (!a) return h('span', { class: 'text-muted text-sm' }, '—')
      return h('div', { class: 'flex flex-col gap-0.5 max-w-xs' }, [
        h('span', { class: 'font-medium text-sm line-clamp-1' }, a.nombre),
        h('span', { class: 'text-xs font-mono text-muted' }, a.codigo || ''),
      ])
    },
  },
  {
    accessorKey: 'nombre',
    header: 'Seguimiento',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'font-semibold text-highlighted line-clamp-2 max-w-md text-sm' },
        row.original.nombre,
      ),
  },
  {
    accessorKey: 'poa_estado',
    header: 'Estado',
    cell: ({ row }) =>
      h(PoaEstadoBadge, {
        estado: row.original.poa_estado,
      }),
  },
  {
    id: 'acciones',
    header: 'Acciones',
    meta: META_COLUMNA_ACCIONES_TABLA,
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: CLASE_CONTENEDOR_ACCIONES_CELDA }, [
        h(UButton, {
          icon: 'i-lucide-eye',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          class: 'shrink-0',
          title: 'Ver detalle',
          onClick: () => abrirDetalle(item),
        }),
        hMenuAccionesTabla(UDropdownMenu, UButton, buildMenu(item)),
      ])
    },
  },
]

const cargarGestiones = async () => {
  try {
    const res = await backendService.get<PoaVersionLookup[]>('poa-versiones')
    gestiones.value =
      ((res as { data?: PoaVersionLookup[] })?.data || res || []) as PoaVersionLookup[]
  } catch {
    gestiones.value = []
  }
}

const cargarDefaultsDesdeConfig = async () => {
  try {
    const res = await backendService.get<PoaConfiguracion[]>('poa-configuracion')
    const lista =
      ((res as { data?: PoaConfiguracion[] })?.data || res || []) as PoaConfiguracion[]
    const cfg = Array.isArray(lista) ? lista[0] : undefined
    if (!cfg) return

    const gestion = cfg.seguimiento_version_id
    if (
      typeof gestion === 'number'
      && gestiones.value.some((g) => g.gestion === gestion)
    ) {
      filtroGestion.value = gestion
    }

    const t = cfg.trimestre_activo ?? 1
    if (t >= 1 && t <= 4) {
      filtroTrimestre.value = t
    }
    defaultsCargados.value = true
  } catch {
    // mantiene 'todas' / 'todos'
  }
}

const limpiarFiltros = () => {
  filtroTexto.value = ''
  filtroEstado.value = 'todos'
  void cargarDefaultsDesdeConfig().then(() => {
    page.value = 1
    void cargar()
  })
}

const cargar = async () => {
  loading.value = true
  try {
    const filtro: FiltroSeguimientoAdmin = {
      pagina: page.value,
      limite: pageSize.value,
      texto: filtroTexto.value.trim() || undefined,
      version_id: filtroGestion.value === 'todas' ? undefined : filtroGestion.value,
      trimestre: filtroTrimestre.value === 'todos' ? undefined : filtroTrimestre.value,
      poa_estado_id: filtroEstado.value === 'todos' ? undefined : filtroEstado.value,
    }
    const res = await backendService.post<RespuestaBusquedaSeguimientoAdmin>(
      'seguimiento-admin/buscar',
      filtro,
    )
    const data =
      (res as { data?: RespuestaBusquedaSeguimientoAdmin })?.data ||
      (res as RespuestaBusquedaSeguimientoAdmin)
    items.value = data.datos ?? []
    total.value = data.total ?? 0
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'Error al cargar',
      description: err?.data?.message || err?.message,
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await cargarGestiones()
  await cargarDefaultsDesdeConfig()
  await cargar()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Administrador de seguimientos"
      description="Informes de seguimiento POA por área, gestión y trimestre: validación u observación de envíos."
    />

    <AppFilter>
      <AppFilterItem label="Gestión" min-w="260px" border>
        <USelect
          v-model="filtroGestion"
          :items="gestionOptions"
          class="w-full"
          @update:model-value="() => { page = 1; cargar() }"
        />
      </AppFilterItem>
      <AppFilterItem label="Trimestre" min-w="180px" border>
        <USelect
          v-model="filtroTrimestre"
          :items="trimestreOptions"
          class="w-full"
          @update:model-value="() => { page = 1; cargar() }"
        />
      </AppFilterItem>
      <AppFilterItem label="Estado" min-w="200px" border>
        <USelect
          v-model="filtroEstado"
          :items="estadoOptions"
          class="w-full"
          @update:model-value="() => { page = 1; cargar() }"
        />
      </AppFilterItem>
      <AppFilterItem label="Buscar" min-w="260px" border class="flex-1">
        <UInput
          v-model="filtroTexto"
          icon="i-lucide-search"
          placeholder="Nombre, área o formulación..."
          class="w-full"
          @keyup.enter="() => { page = 1; cargar() }"
        />
      </AppFilterItem>
      <AppFilterItem border>
        <UButton
          label="Buscar"
          icon="i-lucide-search"
          color="primary"
          @click="() => { page = 1; cargar() }"
        />
      </AppFilterItem>
      <div
        v-if="defaultsCargados || filtroTexto || filtroEstado !== 'todos'"
        class="pl-3 flex items-center"
      >
        <UButton
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          size="xs"
          label="Restablecer filtros"
          @click="limpiarFiltros"
        />
      </div>
    </AppFilter>

    <CorTable
      :columns="columns"
      :data="items"
      :loading="loading"
      :total="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      @update:page="cargar"
      @update:page-size="cargar"
    />

    <SeguimientoDetalleModal
      v-model:open="isDetalleOpen"
      :seguimiento-id="detalleId"
      api-resource="seguimiento-admin"
    />

    <PoaFormulacionCambioEstadoModal
      v-model:open="isCambioEstadoOpen"
      :item-id="cambioEstadoId"
      :estado-id="cambioEstadoDestino ?? 0"
      api-resource="seguimiento-admin"
      :titulo="cambioEstadoTitulo"
      :descripcion="cambioEstadoDescripcion"
      :confirm-label="cambioEstadoLabel"
      :confirm-icon="cambioEstadoIcon"
      :confirm-color="cambioEstadoColor"
      success-title="Estado actualizado"
      @cambiado="cargar"
    />
  </div>
</template>
