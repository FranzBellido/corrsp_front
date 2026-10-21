<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  CodificadorAdmin,
  FiltroCodificadorAdmin,
  RespuestaBusquedaCodificadorAdmin,
} from '~/types/codificador-admin'
import { backendService } from '~/services/backend.service'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const toast = useToast()

const loading = ref(false)
const items = ref<CodificadorAdmin[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const searchCriterio = ref('')
const selectedTipoId = ref<number | null>(null)

const isModalOpen = ref(false)
const itemToEdit = ref<CodificadorAdmin | null>(null)
const isDeleteOpen = ref(false)
const itemToDelete = ref<CodificadorAdmin | null>(null)
const deleting = ref(false)

const columns: TableColumn<CodificadorAdmin>[] = [
  {
    accessorKey: 'codificadorId',
    header: 'ID',
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-xs text-muted' }, String(row.original.codificadorId)),
  },
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', { class: 'font-semibold text-highlighted' }, row.original.nombre?.trim() || '—'),
        row.original.descripcion
          ? h('span', { class: 'text-[11px] text-muted line-clamp-1' }, row.original.descripcion.trim())
          : null,
      ]),
  },
  {
    accessorKey: 'tipo_codificador',
    header: 'Tipo',
    cell: ({ row }) => {
      const tipo = row.original.tipo_codificador
      if (!tipo) {
        return h('span', { class: 'text-xs text-muted italic' }, 'Sin tipo')
      }
      return h(UBadge, { color: 'primary', variant: 'subtle', size: 'xs' }, () => tipo.nombre?.trim())
    },
  },
  {
    accessorKey: '_count',
    header: 'Uso',
    cell: ({ row }) => {
      const count = row.original._count
      return h(
        'span',
        { class: 'text-xs text-muted' },
        `${count?.correspondencia ?? 0} corresp. · ${count?.derivaciones ?? 0} deriv.`,
      )
    },
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
    const filtro: FiltroCodificadorAdmin = {
      pagina: page.value,
      limite: pageSize.value,
      criterio: searchCriterio.value?.trim() || undefined,
      tipo_id: selectedTipoId.value || undefined,
    }
    const res = await backendService.post<RespuestaBusquedaCodificadorAdmin>('codificadores/buscar', filtro)
    const data = (res as any)?.data || res
    items.value = data.datos || []
    total.value = data.total || 0
  } catch (error: any) {
    toast.add({
      title: 'Error de conexión',
      description: error?.message || 'No se pudieron cargar los codificadores.',
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
  selectedTipoId.value = null
  page.value = 1
  cargar()
}

const handleCrear = () => {
  itemToEdit.value = null
  isModalOpen.value = true
}

const handleEditar = (item: CodificadorAdmin) => {
  itemToEdit.value = item
  isModalOpen.value = true
}

const handleConfirmarEliminar = (item: CodificadorAdmin) => {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

const ejecutarEliminacion = async () => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete<CodificadorAdmin>('codificadores', itemToDelete.value.codificadorId)
    toast.add({
      title: 'Codificador eliminado',
      description: `Se eliminó "${itemToDelete.value.nombre?.trim()}".`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    isDeleteOpen.value = false
    itemToDelete.value = null
    cargar()
  } catch (error: any) {
    toast.add({
      title: 'No se pudo eliminar',
      description: error?.data?.message || error?.message || 'El registro puede estar en uso.',
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
      title="Administración de Codificadores"
      description="Catálogo de valores paramétricos (prioridades, instrucciones y otros tipos)"
    >
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="justify-center h-10 rounded-md font-bold px-6 shadow-lg shadow-primary-500/20"
          @click="handleCrear"
        >
          Nuevo Codificador
        </UButton>
      </template>
    </PageHeader>

    <AppFilter>
      <AppFilterItem label="Búsqueda" min-w="320px" flex1>
        <UInput
          v-model="searchCriterio"
          icon="i-lucide-search"
          placeholder="Buscar por nombre o descripción..."
          variant="ghost"
          class="w-full font-medium"
          @update:model-value="onSearchInput"
        />
      </AppFilterItem>

      <AppFilterItem label="Tipo" min-w="240px" border>
        <CodificadorSelect
          v-model="selectedTipoId"
          endpoint="comun/codificador/tipos"
          placeholder="Filtrar por tipo..."
          incluir-todos
          class="w-full"
          @update:model-value="() => { page = 1; cargar() }"
        />
      </AppFilterItem>

      <div v-if="searchCriterio || selectedTipoId" class="pl-3 flex items-center">
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

    <CodificadoresCodificadorFormModal
      v-model:open="isModalOpen"
      :codificador="itemToEdit"
      @guardado="cargar"
    />

    <UModal
      v-model:open="isDeleteOpen"
      title="Confirmar Eliminación"
      description="¿Está seguro de eliminar este codificador?"
    >
      <template #body>
        <div v-if="itemToDelete" class="p-3 bg-error/10 rounded-md border border-error/20">
          <p class="font-bold text-sm">{{ itemToDelete.nombre?.trim() }}</p>
          <p v-if="itemToDelete.tipo_codificador" class="text-xs text-muted mt-1">
            Tipo: {{ itemToDelete.tipo_codificador.nombre?.trim() }}
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
