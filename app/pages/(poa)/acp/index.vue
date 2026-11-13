<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Acp, FiltroAcp, RespuestaBusquedaAcp } from '~/types/poa/acp'
import type { PoaVersionLookup } from '~/types/poa/poa-version'
import { backendService } from '~/services/backend.service'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const toast = useToast()

const loading = ref(false)
const items = ref<Acp[]>([])
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
const itemToEdit = ref<Acp | null>(null)
const isDeleteOpen = ref(false)
const itemToDelete = ref<Acp | null>(null)
const deleting = ref(false)

const columns: TableColumn<Acp>[] = [
  {
    accessorKey: 'version_id',
    header: 'Gestión',
    cell: ({ row }) =>
      h(UBadge, { color: 'primary', variant: 'subtle', size: 'xs', class: 'font-mono font-bold' }, () =>
        String(row.original.version_id),
      ),
  },
  {
    accessorKey: 'numero',
    header: 'Nº',
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-sm' }, String(row.original.numero)),
  },
  {
    accessorKey: 'descripcion',
    header: 'Descripción',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'font-semibold text-highlighted line-clamp-2 max-w-md' },
        row.original.descripcion || '—',
      ),
  },
  {
    accessorKey: 'aei',
    header: 'AEI',
    cell: ({ row }) => {
      const aei = row.original.aei
      if (!aei) return h('span', { class: 'text-xs text-muted' }, '—')
      return h('div', { class: 'flex flex-col gap-0.5 max-w-xs' }, [
        h('span', { class: 'text-xs font-mono text-muted' }, `AEI ${aei.numero}`),
        h('span', { class: 'text-xs line-clamp-1' }, aei.descripcion),
      ])
    },
  },
  {
    accessorKey: 'ponderacion',
    header: 'Pond.',
    cell: ({ row }) =>
      h('span', { class: 'text-sm' }, String(row.original.ponderacion)),
  },
  {
    accessorKey: '_count',
    header: 'Áreas',
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-muted' }, String(row.original._count?.acp_area ?? 0)),
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
          title: 'Editar / Áreas',
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
    const filtro: FiltroAcp = {
      pagina: page.value,
      limite: pageSize.value,
      gestion: filtroGestion.value === 'todas' ? undefined : filtroGestion.value,
    }
    const res = await backendService.post<RespuestaBusquedaAcp>('acp/buscar', filtro)
    const data = (res as { data?: RespuestaBusquedaAcp })?.data || res
    items.value = data.datos || []
    total.value = data.total || 0
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.add({
      title: 'Error de conexión',
      description: err?.message || 'No se pudieron cargar los ACP.',
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

const handleCrear = () => {
  itemToEdit.value = null
  isModalOpen.value = true
}

const handleEditar = (item: Acp) => {
  itemToEdit.value = item
  isModalOpen.value = true
}

const handleConfirmarEliminar = (item: Acp) => {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

const ejecutarEliminacion = async () => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete<Acp>('acp', itemToDelete.value.id)
    toast.add({
      title: 'ACP eliminado',
      description: 'El registro fue eliminado correctamente.',
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
      description: err?.data?.message || err?.message || 'El ACP puede tener resultados asociados.',
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
      title="ACP — Acciones de Corto Plazo"
      description="Catálogo de ACP por gestión, con asignación de áreas responsables"
    >
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="justify-center h-10 rounded-md font-bold px-6 shadow-lg shadow-primary-500/20"
          @click="handleCrear"
        >
          Nuevo ACP
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

    <AcpFormModal
      v-model:open="isModalOpen"
      :acp="itemToEdit"
      @guardado="cargar"
    />

    <UModal
      v-model:open="isDeleteOpen"
      title="Confirmar Eliminación"
      description="¿Está seguro de eliminar este ACP?"
    >
      <template #body>
        <div v-if="itemToDelete" class="p-3 bg-error/10 rounded-md border border-error/20">
          <p class="font-bold text-sm line-clamp-2">{{ itemToDelete.descripcion }}</p>
          <p class="text-xs text-muted mt-2">
            Gestión {{ itemToDelete.version_id }} · Nº {{ itemToDelete.numero }}.
            Fallará si tiene resultados o áreas asignadas.
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
