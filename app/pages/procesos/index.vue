<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { FiltroProceso, Proceso, RespuestaBusquedaProceso } from '~/types/proceso'
import { backendService } from '~/services/backend.service'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const toast = useToast()

const loading = ref(false)
const items = ref<Proceso[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const searchCriterio = ref('')
const filtroInterna = ref<'todos' | 'si' | 'no'>('todos')

const isModalOpen = ref(false)
const itemToEdit = ref<Proceso | null>(null)
const isDeleteOpen = ref(false)
const itemToDelete = ref<Proceso | null>(null)
const deleting = ref(false)
const generandoId = ref<number | null>(null)

const internaOptions = [
  { label: 'Todos', value: 'todos' },
  { label: 'Internos', value: 'si' },
  { label: 'Externos', value: 'no' },
]

const columns = computed<TableColumn<Proceso>[]>(() => [
  {
    accessorKey: 'codigo',
    header: 'Código',
    cell: ({ row }) =>
      h(UBadge, { color: 'primary', variant: 'subtle', size: 'xs', class: 'font-mono font-bold' }, () =>
        row.original.codigo?.trim(),
      ),
  },
  {
    accessorKey: 'nombre',
    header: 'Proceso',
    cell: ({ row }) =>
      h('div', { class: 'flex flex-col gap-0.5' }, [
        h('span', { class: 'font-semibold text-highlighted' }, row.original.nombre),
        row.original.ndias_plazo
          ? h('span', { class: 'text-[11px] text-muted' }, `Plazo: ${row.original.ndias_plazo} día(s)`)
          : null,
      ]),
  },
  {
    accessorKey: 'flags',
    header: 'Configuración',
    cell: ({ row }) => {
      const p = row.original
      const badges = []
      badges.push(
        h(UBadge, { color: p.interna ? 'info' : 'neutral', variant: 'subtle', size: 'xs' }, () =>
          p.interna ? 'Interno' : 'Externo',
        ),
      )
      if (p.requiere_cooperativa) {
        badges.push(h(UBadge, { color: 'warning', variant: 'subtle', size: 'xs' }, () => 'Cooperativa'))
      }
      if (p.requiere_entidad) {
        badges.push(h(UBadge, { color: 'secondary', variant: 'subtle', size: 'xs' }, () => 'Entidad'))
      }
      if (p.requiere_pago) {
        badges.push(h(UBadge, { color: 'success', variant: 'subtle', size: 'xs' }, () => 'Depósito'))
      }
      if (p.requiere_corelativo) {
        badges.push(h(UBadge, { color: 'primary', variant: 'subtle', size: 'xs' }, () => 'Correlativo'))
      }
      if (p.requiere_destinatario === false) {
        badges.push(h(UBadge, { color: 'neutral', variant: 'subtle', size: 'xs' }, () => 'Sin dest.'))
      }
      if (p.requiere_documento) {
        badges.push(h(UBadge, { color: 'info', variant: 'subtle', size: 'xs' }, () => 'OnlyOffice'))
      }
      return h('div', { class: 'flex flex-wrap gap-1' }, badges)
    },
  },
  {
    accessorKey: '_count',
    header: 'Uso',
    cell: ({ row }) => {
      const count = row.original._count
      return h('span', { class: 'text-xs text-muted' }, [
        `${count?.area_proceso ?? 0} área(s) · ${count?.correspondencia ?? 0} corresp.`,
      ])
    },
  },
  {
    accessorKey: 'plantilla',
    header: 'Plantilla',
    cell: ({ row }) => {
      const tiene = Boolean(row.original.plantilla?.trim())
      return h(
        UBadge,
        {
          color: tiene ? 'success' : 'neutral',
          variant: 'subtle',
          size: 'xs',
        },
        () => (tiene ? 'Registrada' : 'Sin plantilla'),
      )
    },
  },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => {
      const item = row.original
      const tienePlantilla = Boolean(item.plantilla?.trim())
      return h('div', { class: 'flex items-center justify-end gap-1.5' }, [
        h(UButton, {
          icon: 'i-lucide-file-output',
          color: 'primary',
          variant: 'ghost',
          size: 'xs',
          title: tienePlantilla
            ? 'Generar documento desde plantilla'
            : 'Este proceso no tiene plantilla registrada',
          disabled: !tienePlantilla || generandoId.value === item.id,
          loading: generandoId.value === item.id,
          onClick: () => handleGenerarDocumento(item),
        }),
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
])

const cargar = async () => {
  loading.value = true
  try {
    const filtro: FiltroProceso = {
      pagina: page.value,
      limite: pageSize.value,
      criterio: searchCriterio.value?.trim() || undefined,
      interna: filtroInterna.value === 'todos' ? undefined : filtroInterna.value === 'si',
    }
    const res = await backendService.post<RespuestaBusquedaProceso>('procesos/buscar', filtro)
    const data = (res as any)?.data || res
    items.value = data.datos || []
    total.value = data.total || 0
  } catch (error: any) {
    toast.add({
      title: 'Error de conexión',
      description: error?.message || 'No se pudieron cargar los procesos.',
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
  filtroInterna.value = 'todos'
  page.value = 1
  cargar()
}

const handleCrear = () => {
  itemToEdit.value = null
  isModalOpen.value = true
}

const handleEditar = (item: Proceso) => {
  itemToEdit.value = item
  isModalOpen.value = true
}

const handleConfirmarEliminar = (item: Proceso) => {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

const handleGenerarDocumento = async (item: Proceso) => {
  if (!item.plantilla?.trim()) {
    toast.add({
      title: 'Sin plantilla',
      description: 'Registre una plantilla Word en el proceso antes de generar el documento.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  generandoId.value = item.id
  try {
    const res = await backendService.post<{ path?: string; message?: string }>(
      `procesos/${item.id}/generar-documento`,
      {},
    )
    const data = (res as { data?: { path?: string }; path?: string })?.data ?? res
    const path = data?.path

    if (!path) {
      throw new Error('El servidor no devolvió la ruta del documento generado.')
    }

    const blob = await backendService.descargarBlob(`storage/download/${path}`)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const nombreArchivo = path.split('/').pop() || `proceso_${item.codigo}.docx`
    link.href = url
    link.download = nombreArchivo
    link.click()
    URL.revokeObjectURL(url)

    toast.add({
      title: 'Documento generado',
      description: `Se generó el Word desde la plantilla de "${item.nombre}".`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } catch (error: any) {
    toast.add({
      title: 'No se pudo generar',
      description:
        error?.data?.message ||
        (Array.isArray(error?.data?.message) ? error.data.message.join(', ') : null) ||
        error?.message ||
        'Error al generar el documento desde la plantilla.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    generandoId.value = null
  }
}

const ejecutarEliminacion = async () => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete<Proceso>('procesos', itemToDelete.value.id)
    toast.add({
      title: 'Proceso eliminado',
      description: `El proceso "${itemToDelete.value.nombre}" fue eliminado.`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    isDeleteOpen.value = false
    itemToDelete.value = null
    cargar()
  } catch (error: any) {
    toast.add({
      title: 'No se pudo eliminar',
      description: error?.data?.message || error?.message || 'El proceso puede estar en uso.',
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
      title="Administración de Procesos"
      description="Catálogo de trámites y procesos del sistema de correspondencia"
    >
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="justify-center h-10 rounded-md font-bold px-6 shadow-lg shadow-primary-500/20"
          @click="handleCrear"
        >
          Nuevo Proceso
        </UButton>
      </template>
    </PageHeader>

    <AppFilter>
      <AppFilterItem label="Búsqueda" min-w="320px" flex1>
        <UInput
          v-model="searchCriterio"
          icon="i-lucide-search"
          placeholder="Buscar por código, nombre o plantilla..."
          variant="ghost"
          class="w-full font-medium"
          @update:model-value="onSearchInput"
        />
      </AppFilterItem>

      <AppFilterItem label="Tipo" min-w="180px" border>
        <USelect
          v-model="filtroInterna"
          :items="internaOptions"
          class="w-full"
          @update:model-value="() => { page = 1; cargar() }"
        />
      </AppFilterItem>

      <div v-if="searchCriterio || filtroInterna !== 'todos'" class="pl-3 flex items-center">
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

    <ProcesosProcesoFormModal
      v-model:open="isModalOpen"
      :proceso="itemToEdit"
      @guardado="cargar"
    />

    <UModal
      v-model:open="isDeleteOpen"
      title="Confirmar Eliminación"
      description="¿Está seguro de eliminar este proceso?"
    >
      <template #body>
        <div v-if="itemToDelete" class="p-3 bg-error/10 rounded-md border border-error/20">
          <p class="font-bold text-sm">
            [{{ itemToDelete.codigo }}] {{ itemToDelete.nombre }}
          </p>
          <p class="text-xs text-muted mt-2">
            La eliminación fallará si el proceso está asociado a áreas o correspondencia.
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
