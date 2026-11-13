<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  FiltroPoaVersion,
  PoaVersion,
  PoaVersionLookup,
  RespuestaBusquedaPoaVersion,
} from '~/types/poa/poa-version'
import { backendService } from '~/services/backend.service'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const toast = useToast()

const loading = ref(false)
const items = ref<PoaVersion[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filtroGestion = ref<number | 'todas'>('todas')
const gestionesCatalogo = ref<PoaVersionLookup[]>([])
const loadingGestiones = ref(false)

const gestionFilterOptions = computed(() => [
  { label: 'Todas las gestiones', value: 'todas' as const },
  ...gestionesCatalogo.value.map((v) => ({
    label: `${v.gestion} — ${v.nombre}`,
    value: v.gestion,
  })),
])

const isModalOpen = ref(false)
const itemToEdit = ref<PoaVersion | null>(null)
const isDeleteOpen = ref(false)
const itemToDelete = ref<PoaVersion | null>(null)
const deleting = ref(false)

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO')
}

const columns: TableColumn<PoaVersion>[] = [
  {
    accessorKey: 'gestion',
    header: 'Gestión',
    cell: ({ row }) =>
      h(UBadge, { color: 'primary', variant: 'subtle', size: 'xs', class: 'font-mono font-bold' }, () =>
        String(row.original.gestion),
      ),
  },
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    cell: ({ row }) =>
      h('span', { class: 'font-semibold text-highlighted' }, row.original.nombre || '—'),
  },
  {
    accessorKey: 'trimestre_activo',
    header: 'Trimestre',
    cell: ({ row }) =>
      h('span', { class: 'text-sm' }, `T${row.original.trimestre_activo}`),
  },
  {
    accessorKey: 'f_formulacion',
    header: 'Formulación',
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-muted' }, formatDate(row.original.f_formulacion)),
  },
  {
    accessorKey: 'f_seguimiento',
    header: 'Seguimiento',
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-muted' }, formatDate(row.original.f_seguimiento)),
  },
  {
    accessorKey: '_count',
    header: 'ACP',
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-muted' }, String(row.original._count?.acp ?? 0)),
  },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex items-center justify-end gap-1.5' }, [
        h(UButton, {
          icon: 'i-lucide-pencil',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          title: 'Editar',
          onClick: () => handleEditar(item),
        }),
        h(UButton, {
          icon: 'i-lucide-trash-2',
          color: 'error',
          variant: 'ghost',
          size: 'xs',
          title: 'Eliminar',
          onClick: () => handleConfirmarEliminar(item),
        }),
      ])
    },
  },
]

const cargarGestiones = async () => {
  loadingGestiones.value = true
  try {
    const res = await backendService.get<PoaVersionLookup[]>('poa-versiones')
    gestionesCatalogo.value =
      ((res as { data?: PoaVersionLookup[] })?.data || res || []) as PoaVersionLookup[]
  } catch {
    gestionesCatalogo.value = []
  } finally {
    loadingGestiones.value = false
  }
}

const cargar = async () => {
  loading.value = true
  try {
    const filtro: FiltroPoaVersion = {
      pagina: page.value,
      limite: pageSize.value,
      gestion: filtroGestion.value === 'todas' ? undefined : filtroGestion.value,
    }
    const res = await backendService.post<RespuestaBusquedaPoaVersion>(
      'poa-versiones/buscar',
      filtro,
    )
    const data = (res as { data?: RespuestaBusquedaPoaVersion })?.data || res
    items.value = data.datos || []
    total.value = data.total || 0
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.add({
      title: 'Error de conexión',
      description: err?.message || 'No se pudieron cargar las versiones POA.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loading.value = false
  }
}

const limpiarFiltros = () => {
  filtroGestion.value = 'todas'
  page.value = 1
  cargar()
}

const onGuardado = () => {
  cargarGestiones()
  cargar()
}

const handleCrear = () => {
  itemToEdit.value = null
  isModalOpen.value = true
}

const handleEditar = (item: PoaVersion) => {
  itemToEdit.value = item
  isModalOpen.value = true
}

const handleConfirmarEliminar = (item: PoaVersion) => {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

const ejecutarEliminacion = async () => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete<PoaVersion>('poa-versiones', itemToDelete.value.gestion)
    toast.add({
      title: 'Versión eliminada',
      description: `Se eliminó la gestión ${itemToDelete.value.gestion}.`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    isDeleteOpen.value = false
    itemToDelete.value = null
    cargar()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo eliminar',
      description: err?.data?.message || err?.message || 'La versión puede estar en uso.',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  cargarGestiones()
  cargar()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Versiones POA"
      description="Gestiones / versiones del Plan Operativo Anual"
    >
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="justify-center h-10 rounded-md font-bold px-6 shadow-lg shadow-primary-500/20"
          @click="handleCrear"
        >
          Nueva Versión
        </UButton>
      </template>
    </PageHeader>

    <AppFilter>
      <AppFilterItem label="Gestión" min-w="280px" border>
        <USelect
          v-model="filtroGestion"
          :items="gestionFilterOptions"
          :loading="loadingGestiones"
          placeholder="Todas las gestiones..."
          class="w-full"
          @update:model-value="() => { page = 1; cargar() }"
        />
      </AppFilterItem>

      <div v-if="filtroGestion !== 'todas'" class="pl-3 flex items-center">
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

    <PoaVersionFormModal
      v-model:open="isModalOpen"
      :version="itemToEdit"
      @guardado="onGuardado"
    />

    <UModal
      v-model:open="isDeleteOpen"
      title="Confirmar Eliminación"
      description="¿Está seguro de eliminar esta versión POA?"
    >
      <template #body>
        <div v-if="itemToDelete" class="p-3 bg-error/10 rounded-md border border-error/20">
          <p class="font-bold text-sm">
            Gestión {{ itemToDelete.gestion }} — {{ itemToDelete.nombre }}
          </p>
          <p class="text-xs text-muted mt-2">
            La eliminación fallará si tiene ACP o formulaciones asociadas.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex items-center justify-end gap-3 w-full">
          <UButton label="Cancelar" color="neutral" variant="ghost" :disabled="deleting" @click="isDeleteOpen = false" />
          <UButton label="Eliminar" color="error" icon="i-lucide-trash" :loading="deleting" @click="ejecutarEliminacion" />
        </div>
      </template>
    </UModal>
  </div>
</template>
