<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type {
  FiltroPoaFormulacionAdmin,
  PoaFormulacionResumen,
  RespuestaBusquedaPoaFormulacionAdmin,
} from '~/types/poa/formulacion'
import {
  POA_FORMULACION_ESTADO_ENVIADO_ID,
  POA_FORMULACION_ESTADO_OBSERVADO_ID,
  POA_FORMULACION_ESTADO_VALIDADO_ID,
} from '~/types/poa/formulacion'
import type { PoaVersionLookup } from '~/types/poa/poa-version'
import { backendService } from '~/services/backend.service'
import {
  CLASE_CONTENEDOR_ACCIONES_CELDA,
  enriquecerItemMenuAcciones,
  hMenuAccionesTabla,
  META_COLUMNA_ACCIONES_TABLA,
} from '~/utils/shared/acciones-menu'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()

const loading = ref(false)
const items = ref<PoaFormulacionResumen[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filtroTexto = ref('')
const filtroGestion = ref<number | 'todas'>('todas')
const gestiones = ref<PoaVersionLookup[]>([])

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

const puedeAccionarAdmin = (row: PoaFormulacionResumen) =>
  row.poa_estado_id === POA_FORMULACION_ESTADO_ENVIADO_ID

const abrirDetalle = (row: PoaFormulacionResumen) => {
  detalleId.value = row.id
  isDetalleOpen.value = true
}

const abrirCambioEstado = (
  row: PoaFormulacionResumen,
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

const buildMenu = (row: PoaFormulacionResumen): DropdownMenuItem[] => {
  const activo = puedeAccionarAdmin(row)
  const motivo = activo
    ? undefined
    : 'Disponible solo para formulaciones en estado Enviado.'

  return [
    {
      label: 'Ver formulación',
      icon: 'i-lucide-folder-tree',
      onSelect: () => {
        navigateTo({
          path: '/formulacion/resultados',
          query: { modo: 'admin', formulacion_id: row.id },
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
            titulo: 'Validar formulación',
            descripcion: 'La formulación pasará al estado Validado (5).',
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
            titulo: 'Observar formulación',
            descripcion: 'La formulación pasará al estado Observado (4).',
            label: 'Observar',
            icon: 'i-lucide-message-square-warning',
            color: 'warning',
          }),
      },
      motivo,
    ),
  ]
}

const columns: TableColumn<PoaFormulacionResumen>[] = [
  {
    accessorKey: 'version_id',
    header: 'Gestión',
    cell: ({ row }) =>
      h(
        UBadge,
        { color: 'primary', variant: 'subtle', size: 'xs', class: 'font-mono font-bold' },
        () => String(row.original.version_id),
      ),
  },
  {
    accessorKey: 'areas',
    header: 'Área',
    cell: ({ row }) => {
      const a = row.original.areas
      if (!a) return h('span', { class: 'text-muted text-sm' }, '—')
      return h('div', { class: 'flex flex-col gap-0.5 max-w-xs' }, [
        h('span', { class: 'font-medium text-sm line-clamp-1' }, a.nombre),
        h('span', { class: 'text-xs font-mono text-muted' }, a.codigo || ''),
      ])
    },
  },
  {
    accessorKey: 'nombre',
    header: 'Formulación',
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
      h(
        UBadge,
        { color: 'neutral', variant: 'subtle', size: 'xs' },
        () => row.original.poa_estado?.nombre || '—',
      ),
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

const cargar = async () => {
  loading.value = true
  try {
    const filtro: FiltroPoaFormulacionAdmin = {
      pagina: page.value,
      limite: pageSize.value,
      texto: filtroTexto.value.trim() || undefined,
      version_id: filtroGestion.value === 'todas' ? undefined : filtroGestion.value,
    }
    const res = await backendService.post<RespuestaBusquedaPoaFormulacionAdmin>(
      'poa-formulacion-admin/buscar',
      filtro,
    )
    const data =
      (res as { data?: RespuestaBusquedaPoaFormulacionAdmin })?.data ||
      (res as RespuestaBusquedaPoaFormulacionAdmin)
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

const onCambioEstado = async () => {
  await cargar()
}

onMounted(async () => {
  await cargarGestiones()
  await cargar()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Administrador de formulaciones"
      description="Formulaciones POA por área y gestión: validación u observación de envíos."
    />

    <AppFilter>
      <AppFilterItem label="Gestión" min-w="280px" border>
        <USelect
          v-model="filtroGestion"
          :items="gestionOptions"
          class="w-full"
          @update:model-value="() => { page = 1; cargar() }"
        />
      </AppFilterItem>
      <AppFilterItem label="Buscar" min-w="280px" border class="flex-1">
        <UInput
          v-model="filtroTexto"
          icon="i-lucide-search"
          placeholder="Nombre formulación o área..."
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

    <PoaFormulacionDetalleModal
      v-model:open="isDetalleOpen"
      :formulacion-id="detalleId"
      api-resource="poa-formulacion-admin"
    />

    <PoaFormulacionCambioEstadoModal
      v-model:open="isCambioEstadoOpen"
      :item-id="cambioEstadoId"
      :estado-id="cambioEstadoDestino ?? 0"
      api-resource="poa-formulacion-admin"
      :titulo="cambioEstadoTitulo"
      :descripcion="cambioEstadoDescripcion"
      :confirm-label="cambioEstadoLabel"
      :confirm-icon="cambioEstadoIcon"
      :confirm-color="cambioEstadoColor"
      success-title="Estado actualizado"
      @cambiado="onCambioEstado"
    />
  </div>
</template>