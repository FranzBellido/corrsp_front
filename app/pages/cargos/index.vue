<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Cargo, FiltroCargo, RespuestaBusquedaCargo } from '~/types/cargo'
import { backendService } from '~/services/backend.service'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')

const toast = useToast()

// Estado de listado y paginación
const loading = ref(false)
const cargos = ref<Cargo[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// Filtros de búsqueda
const searchCriterio = ref('')
const selectedAreaId = ref<string | null>(null)

// Modal de Creación / Edición
const isModalOpen = ref(false)
const cargoToEdit = ref<Cargo | null>(null)

// Modal de Confirmación de Eliminación
const isDeleteOpen = ref(false)
const cargoToDelete = ref<Cargo | null>(null)
const deleting = ref(false)

// Columnas para CorTable
const columns: TableColumn<Cargo>[] = [
  {
    accessorKey: 'nombre',
    header: 'Cargo / Denominación',
    cell: ({ row }) => {
      const cargo = row.original
      return h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', { class: 'font-semibold text-gray-900 dark:text-white' }, cargo.nombre),
       
      ])
    },
  },
  {
    accessorKey: 'areas',
    header: 'Área / Unidad',
    cell: ({ row }) => {
      const area = row.original.areas
      if (!area) {
        return h('span', { class: 'text-xs text-gray-400 italic' }, 'Sin área asignada')
      }
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UIcon, { name: 'i-lucide-building-2', class: 'size-4 text-primary-500 shrink-0' }),
        h('span', { class: 'text-xs font-medium text-gray-700 dark:text-gray-300' }, area.nombre),
      ])
    },
  },
  {
    accessorKey: 'usuarios',
    header: 'Funcionarios',
    cell: ({ row }) => {
      const lista = row.original.usuarios ?? []
      if (lista.length === 0) {
        return h(
          UBadge,
          { color: 'neutral', variant: 'subtle', size: 'xs' },
          () => 'Vacante',
        )
      }
      if (lista.length === 1) {
        const usuario = lista[0]
        return h('div', { class: 'flex flex-col' }, [
          h('span', { class: 'font-medium text-xs text-gray-800 dark:text-gray-200' }, usuario.nombre_completo),
          h('span', { class: 'text-[11px] text-gray-400' }, usuario.email || `@${usuario.nombre_usuario}`),
        ])
      }
      return h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', { class: 'font-medium text-xs text-gray-800 dark:text-gray-200' }, lista.map((u) => u.nombre_completo).join(', ')),
        h('span', { class: 'text-[11px] text-gray-400' }, `${lista.length} funcionarios`),
      ])
    },
  },
 
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => {
      const cargo = row.original
      return h('div', { class: 'flex items-center justify-end gap-1.5' }, [
        h(UButton, {
          icon: 'i-lucide-pencil',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          title: 'Editar',
          onClick: () => handleEditar(cargo),
        }),
        h(UButton, {
          icon: 'i-lucide-trash-2',
          color: 'error',
          variant: 'ghost',
          size: 'xs',
          title: 'Eliminar',
          onClick: () => handleConfirmarEliminar(cargo),
        }),
      ])
    },
  },
]

// Cargar datos consumiendo el endpoint POST 'cargos/buscar'
const cargarCargos = async () => {
  loading.value = true
  try {
    const filtro: FiltroCargo = {
      pagina: page.value,
      limite: pageSize.value,
      criterio: searchCriterio.value?.trim() || undefined,
      area_id: selectedAreaId.value || undefined,
    }

    const res = await backendService.post<RespuestaBusquedaCargo>('cargos/buscar', filtro)
    // El backend devuelve los datos paginados (datos, total, ...)
    const data = (res as any)?.data || res
    cargos.value = data.datos || []
    total.value = data.total || 0
  } catch (error: any) {
    toast.add({
      title: 'Error de conexión',
      description: error?.message || 'No se pudieron cargar los cargos.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loading.value = false
  }
}

// Búsqueda con debounce o al pulsar enter
let debounceTimer: any = null
const onSearchInput = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    cargarCargos()
  }, 350)
}

const limpiarFiltros = () => {
  searchCriterio.value = ''
  selectedAreaId.value = null
  page.value = 1
  cargarCargos()
}

// Acciones de CRUD
const handleCrear = () => {
  cargoToEdit.value = null
  isModalOpen.value = true
}

const handleEditar = (cargo: Cargo) => {
  cargoToEdit.value = cargo
  isModalOpen.value = true
}

const handleConfirmarEliminar = (cargo: Cargo) => {
  cargoToDelete.value = cargo
  isDeleteOpen.value = true
}

const ejecutarEliminacion = async () => {
  if (!cargoToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete<Cargo>('cargos', cargoToDelete.value.id)
    toast.add({
      title: 'Cargo eliminado',
      description: `El cargo "${cargoToDelete.value.nombre}" fue eliminado exitosamente.`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    isDeleteOpen.value = false
    cargoToDelete.value = null
    cargarCargos()
  } catch (error: any) {
    const msg =
      error?.data?.message ||
      error?.message ||
      'No se pudo eliminar el cargo. Puede tener correspondencias vinculadas.'
    toast.add({
      title: 'No se pudo eliminar',
      description: msg,
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  cargarCargos()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado de página -->
    <PageHeader
      title="Administración de Cargos"
      description="Listado institucional, asignación de áreas y funcionarios del sistema de correspondencia"
    >
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="justify-center h-10 rounded-md font-bold px-6 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-300 cursor-pointer"
          @click="handleCrear"
        >
          Nuevo Cargo
        </UButton>
      </template>
    </PageHeader>

    <!-- Barra de Filtros (Glassmorphism con AppFilter) -->
    <AppFilter>
      <AppFilterItem label="Búsqueda" min-w="320px" flex1>
        <UInput
          v-model="searchCriterio"
          icon="i-lucide-search"
          placeholder="Buscar por cargo, código o funcionario..."
          variant="ghost"
          class="w-full font-medium text-neutral-800 dark:text-neutral-200"
          @update:model-value="onSearchInput"
        />
      </AppFilterItem>

      <AppFilterItem label="Área / Unidad" min-w="260px" border>
        <CodificadorSelect
          v-model="selectedAreaId"
          endpoint="comun/codificador/areas"
          placeholder="Filtrar por Área..."
          incluir-todos
          class="w-full"
          @update:model-value="() => { page = 1; cargarCargos() }"
        />
      </AppFilterItem>

      <div v-if="searchCriterio || selectedAreaId" class="pl-3 flex items-center">
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

    <!-- Tabla con CorTable -->
    <CorTable
      :columns="columns"
      :data="cargos"
      :loading="loading"
      :total="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      @update:page="cargarCargos"
      @update:page-size="cargarCargos"
    />

      <!-- Modal de Creación / Edición -->
      <CargosCargoFormModal
        v-model:open="isModalOpen"
        :cargo="cargoToEdit"
        @guardado="cargarCargos"
      />

      <!-- Modal de Confirmación de Eliminación -->
      <UModal
        v-model:open="isDeleteOpen"
        title="Confirmar Eliminación"
        description="¿Está seguro de que desea eliminar el siguiente cargo institucional?"
      >
        <template #body>
          <div v-if="cargoToDelete" class="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900/50">
            <p class="font-bold text-red-900 dark:text-red-200 text-sm">
              {{ cargoToDelete.nombre }}
            </p>
            <p v-if="cargoToDelete.areas" class="text-xs text-red-700 dark:text-red-300 mt-1">
              Área: {{ cargoToDelete.areas.nombre }}
            </p>
            <p class="text-xs text-red-500 mt-2">
              Esta acción no se puede deshacer y fallará si el cargo está asociado a correspondencia histórica.
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex items-center justify-end gap-3 w-full">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              :disabled="deleting"
              @click="isDeleteOpen = false"
            />
            <UButton
              label="Eliminar Cargo"
              color="error"
              icon="i-lucide-trash"
              :loading="deleting"
              @click="ejecutarEliminacion"
            />
          </div>
        </template>
      </UModal>
  </div>
</template>
