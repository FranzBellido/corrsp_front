<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Entidad, FiltroEntidad, RespuestaBusquedaEntidad } from '~/types/entidad'
import { backendService } from '~/services/backend.service'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const toast = useToast()

const loading = ref(false)
const items = ref<Entidad[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const searchCriterio = ref('')
const filtroEstado = ref<'todos' | 'activas' | 'inactivas'>('todos')

const isModalOpen = ref(false)
const itemToEdit = ref<Entidad | null>(null)
const isDeleteOpen = ref(false)
const itemToDelete = ref<Entidad | null>(null)
const deleting = ref(false)

const estadoOptions = [
  { label: 'Todos los estados', value: 'todos' },
  { label: 'Solo activas', value: 'activas' },
  { label: 'Solo inactivas', value: 'inactivas' },
]

const columns: TableColumn<Entidad>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-xs text-muted' }, String(row.original.id)),
  },
  {
    accessorKey: 'nombre_ent',
    header: 'Entidad',
    cell: ({ row }) =>
      h('span', { class: 'font-semibold text-highlighted' }, row.original.nombre_ent?.trim() || '—'),
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => {
      const activo = row.original.estado === 1
      return h(
        UBadge,
        { color: activo ? 'success' : 'neutral', variant: 'subtle', size: 'xs' },
        () => (activo ? 'Activa' : 'Inactiva'),
      )
    },
  },
  {
    accessorKey: 'creado',
    header: 'Creado',
    cell: ({ row }) => {
      const fecha = row.original.creado ? new Date(row.original.creado) : null
      return h(
        'span',
        { class: 'text-xs text-muted' },
        fecha ? fecha.toLocaleDateString('es-BO') : '—',
      )
    },
  },
  {
    accessorKey: '_count',
    header: 'Uso',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-xs text-muted' },
        `${row.original._count?.corresp_entidad ?? 0} correspondencia(s)`,
      ),
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

const cargar = async () => {
  loading.value = true
  try {
    const filtro: FiltroEntidad = {
      pagina: page.value,
      limite: pageSize.value,
      criterio: searchCriterio.value?.trim() || undefined,
      estado:
        filtroEstado.value === 'todos'
          ? undefined
          : filtroEstado.value === 'activas'
            ? 1
            : 0,
    }
    const res = await backendService.post<RespuestaBusquedaEntidad>('entidades/buscar', filtro)
    const data = (res as any)?.data || res
    items.value = data.datos || []
    total.value = data.total || 0
  } catch (error: any) {
    toast.add({
      title: 'Error de conexión',
      description: error?.message || 'No se pudieron cargar las entidades.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const onSearchInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    cargar()
  }, 350)
}

const limpiarFiltros = () => {
  searchCriterio.value = ''
  filtroEstado.value = 'todos'
  page.value = 1
  cargar()
}

const handleCrear = () => {
  itemToEdit.value = null
  isModalOpen.value = true
}

const handleEditar = (item: Entidad) => {
  itemToEdit.value = item
  isModalOpen.value = true
}

const handleConfirmarEliminar = (item: Entidad) => {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

const ejecutarEliminacion = async () => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete<Entidad>('entidades', itemToDelete.value.id)
    toast.add({
      title: 'Entidad eliminada',
      description: `Se eliminó "${itemToDelete.value.nombre_ent?.trim()}".`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    isDeleteOpen.value = false
    itemToDelete.value = null
    cargar()
  } catch (error: any) {
    toast.add({
      title: 'No se pudo eliminar',
      description: error?.data?.message || error?.message || 'La entidad puede estar en uso.',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  cargar()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Administración de Entidades"
      description="Catálogo de entidades externas vinculadas a correspondencia"
    >
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="justify-center h-10 rounded-xl font-bold px-6 shadow-lg shadow-primary-500/20"
          @click="handleCrear"
        >
          Nueva Entidad
        </UButton>
      </template>
    </PageHeader>

    <AppFilter>
      <AppFilterItem label="Búsqueda" min-w="320px" flex1>
        <UInput
          v-model="searchCriterio"
          icon="i-lucide-search"
          placeholder="Buscar por nombre de entidad..."
          variant="ghost"
          class="w-full font-medium"
          @update:model-value="onSearchInput"
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

      <div v-if="searchCriterio || filtroEstado !== 'todos'" class="pl-3 flex items-center">
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" label="Limpiar" @click="limpiarFiltros" />
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

    <EntidadesEntidadFormModal
      v-model:open="isModalOpen"
      :entidad="itemToEdit"
      @guardado="cargar"
    />

    <UModal
      v-model:open="isDeleteOpen"
      title="Confirmar Eliminación"
      description="¿Está seguro de eliminar esta entidad?"
    >
      <template #body>
        <div v-if="itemToDelete" class="p-3 bg-error/10 rounded-lg border border-error/20">
          <p class="font-bold text-sm">{{ itemToDelete.nombre_ent?.trim() }}</p>
          <p class="text-xs text-muted mt-2">
            La eliminación fallará si la entidad está asociada a correspondencia.
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
