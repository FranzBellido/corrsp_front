<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Area, FiltroArea, RespuestaBusquedaArea } from '~/types/area'
import { backendService } from '~/services/backend.service'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')

const toast = useToast()

// Estado de listado y paginación
const loading = ref(false)
const areas = ref<Area[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// Filtros de búsqueda
const searchCriterio = ref('')
const selectedPadreId = ref<string | null>(null)
const estadoActivo = ref<string>('todos')

// Modal de Creación / Edición
const isModalOpen = ref(false)
const areaToEdit = ref<Area | null>(null)

// Modal de Confirmación de Eliminación
const isDeleteOpen = ref(false)
const areaToDelete = ref<Area | null>(null)
const deleting = ref(false)

// Opciones de filtro de estado
const estadoOptions = [
  { label: 'Todos los estados', value: 'todos' },
  { label: 'Solo Activas', value: 'activas' },
  { label: 'Solo Inactivas', value: 'inactivas' },
]

// Columnas para CorTable
const columns: TableColumn<Area>[] = [
  {
    accessorKey: 'codigo',
    header: 'Código / Sigla',
    cell: ({ row }) => {
      const area = row.original
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UBadge, { color: 'primary', variant: 'subtle', size: 'xs', class: 'font-mono font-bold' }, () => area.codigo),
      ])
    },
  },
  {
    accessorKey: 'nombre',
    header: 'Área / Unidad Organizacional',
    cell: ({ row }) => {
      const area = row.original
      return h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', { class: 'font-semibold text-gray-900 dark:text-white' }, area.nombre),
        area.areas_areas_area_padre_idToareas
          ? h('span', { class: 'text-xs text-gray-400 flex items-center gap-1' }, [
              h(UIcon, { name: 'i-lucide-corner-down-right', class: 'size-3' }),
              `Depende de: ${area.areas_areas_area_padre_idToareas.nombre} (${area.areas_areas_area_padre_idToareas.codigo})`,
            ])
          : h('span', { class: 'text-[11px] text-primary-600 dark:text-primary-400 font-medium' }, 'Nivel Principal / Raíz'),
      ])
    },
  },
  {
    accessorKey: 'area_proceso',
    header: 'Procesos Habilitados',
    cell: ({ row }) => {
      const procesos = row.original.area_proceso || []
      if (procesos.length === 0) {
        return h('span', { class: 'text-xs text-gray-400 italic' }, 'Sin procesos asignados')
      }

      // Renderizar badges de procesos con límite visual
      const badges = procesos.slice(0, 3).map((ap) => {
        const proc = ap.proceso
        return h(
          UBadge,
          {
            color: 'neutral',
            variant: 'subtle',
            size: 'xs',
            class: 'rounded-md text-[11px]',
          },
          () => proc.codigo ? `[${proc.codigo.trim()}] ${proc.nombre}` : proc.nombre,
        )
      })

      if (procesos.length > 3) {
        badges.push(
          h(
            UBadge,
            { color: 'primary', variant: 'soft', size: 'xs', class: 'font-bold' },
            () => `+${procesos.length - 3}`,
          ),
        )
      }

      return h('div', { class: 'flex flex-wrap items-center gap-1.5 max-w-sm' }, badges)
    },
  },
  {
    accessorKey: 'activo',
    header: 'Estado',
    cell: ({ row }) => {
      const activo = row.original.activo
      return h(
        UBadge,
        {
          color: activo ? 'success' : 'neutral',
          variant: 'subtle',
          size: 'xs',
          class: 'capitalize',
        },
        () => (activo ? 'Activa' : 'Inactiva'),
      )
    },
  },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => {
      const area = row.original
      return h('div', { class: 'flex items-center justify-end gap-1.5' }, [
        h(UButton, {
          icon: 'i-lucide-pencil',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          title: 'Editar Área',
          onClick: () => handleEditar(area),
        }),
        h(UButton, {
          icon: 'i-lucide-trash-2',
          color: 'error',
          variant: 'ghost',
          size: 'xs',
          title: 'Eliminar Área',
          onClick: () => handleConfirmarEliminar(area),
        }),
      ])
    },
  },
]

// Cargar datos consumiendo el endpoint POST 'areas/buscar'
const cargarAreas = async () => {
  loading.value = true
  try {
    const filtro: FiltroArea = {
      pagina: page.value,
      limite: pageSize.value,
      criterio: searchCriterio.value?.trim() || undefined,
      area_padre_id: selectedPadreId.value || undefined,
      activo:
        estadoActivo.value === 'activas'
          ? true
          : estadoActivo.value === 'inactivas'
            ? false
            : undefined,
    }

    const res = await backendService.post<RespuestaBusquedaArea>('areas/buscar', filtro)
    const data = (res as any)?.data || res
    areas.value = data.datos || []
    total.value = data.total || 0
  } catch (error: any) {
    toast.add({
      title: 'Error de conexión',
      description: error?.message || 'No se pudieron cargar las áreas.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loading.value = false
  }
}

// Búsqueda con debounce
let debounceTimer: any = null
const onSearchInput = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    cargarAreas()
  }, 350)
}

const limpiarFiltros = () => {
  searchCriterio.value = ''
  selectedPadreId.value = null
  estadoActivo.value = 'todos'
  page.value = 1
  cargarAreas()
}

// Acciones de CRUD
const handleCrear = () => {
  areaToEdit.value = null
  isModalOpen.value = true
}

const handleEditar = (area: Area) => {
  areaToEdit.value = area
  isModalOpen.value = true
}

const handleConfirmarEliminar = (area: Area) => {
  areaToDelete.value = area
  isDeleteOpen.value = true
}

const ejecutarEliminacion = async () => {
  if (!areaToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete<Area>('areas', areaToDelete.value.id)
    toast.add({
      title: 'Área eliminada',
      description: `El área "${areaToDelete.value.nombre}" fue eliminada exitosamente.`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    isDeleteOpen.value = false
    areaToDelete.value = null
    cargarAreas()
  } catch (error: any) {
    const msg =
      error?.data?.message ||
      error?.message ||
      'No se pudo eliminar el área. Puede tener cargos, correspondencia o subáreas asociadas.'
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
  cargarAreas()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado de página -->
    <PageHeader
      title="Administración de Áreas y Unidades"
      description="Estructura organizacional, jerarquías y configuración de procesos (area_proceso) del sistema"
    >
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="justify-center h-10 rounded-xl font-bold px-6 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-300 cursor-pointer"
          @click="handleCrear"
        >
          Nueva Área
        </UButton>
      </template>
    </PageHeader>

    <!-- Barra de Filtros (Glassmorphism con AppFilter) -->
    <AppFilter>
      <AppFilterItem label="Búsqueda" min-w="300px" flex1>
        <UInput
          v-model="searchCriterio"
          icon="i-lucide-search"
          placeholder="Buscar por código, nombre o dependencia..."
          variant="ghost"
          class="w-full font-medium text-neutral-800 dark:text-neutral-200"
          @update:model-value="onSearchInput"
        />
      </AppFilterItem>

      <AppFilterItem label="Dependencia Superior" min-w="260px" border>
        <CodificadorSelect
          v-model="selectedPadreId"
          endpoint="comun/codificador/areas"
          placeholder="Filtrar por Área Superior..."
          incluir-todos
          class="w-full"
          @update:model-value="() => { page = 1; cargarAreas() }"
        />
      </AppFilterItem>

      <AppFilterItem label="Estado" min-w="180px" border>
        <USelectMenu
          v-model="estadoActivo"
          :items="estadoOptions"
          value-key="value"
          label-key="label"
          class="w-full"
          @update:model-value="() => { page = 1; cargarAreas() }"
        />
      </AppFilterItem>

      <div v-if="searchCriterio || selectedPadreId || estadoActivo !== 'todos'" class="pl-3 flex items-center">
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
      :data="areas"
      :loading="loading"
      :total="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      @update:page="cargarAreas"
      @update:page-size="cargarAreas"
    />

    <!-- Modal de Creación / Edición -->
    <AreasAreaFormModal
      v-model:open="isModalOpen"
      :area="areaToEdit"
      @guardado="cargarAreas"
    />

    <!-- Modal de Confirmación de Eliminación -->
    <UModal
      v-model:open="isDeleteOpen"
      title="Confirmar Eliminación"
      description="¿Está seguro de que desea eliminar la siguiente unidad organizacional?"
    >
      <template #body>
        <div v-if="areaToDelete" class="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/50">
          <p class="font-bold text-red-900 dark:text-red-200 text-sm">
            [{{ areaToDelete.codigo }}] {{ areaToDelete.nombre }}
          </p>
          <p v-if="areaToDelete.areas_areas_area_padre_idToareas" class="text-xs text-red-700 dark:text-red-300 mt-1">
            Depende de: {{ areaToDelete.areas_areas_area_padre_idToareas.nombre }}
          </p>
          <p class="text-xs text-red-500 mt-2">
            Esta acción no se puede deshacer y fallará si el área contiene cargos, correspondencia histórica o subáreas vinculadas.
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
            label="Eliminar Área"
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
