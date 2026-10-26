<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  FiltroRecDeposito,
  RecDepositoItem,
  RespuestaBusquedaRecDeposito,
} from '~/types/recaudacion'
import { backendService, getApi } from '~/services/backend.service'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const toast = useToast()

const loading = ref(false)
const items = ref<RecDepositoItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const searchCriterio = ref('')
const filtroVerificado = ref<'todos' | 'si' | 'no'>('todos')

const isModalOpen = ref(false)
const itemToEdit = ref<RecDepositoItem | null>(null)
const isDeleteOpen = ref(false)
const itemToDelete = ref<RecDepositoItem | null>(null)
const deleting = ref(false)
const verificandoId = ref<string | null>(null)

const verificadoOptions = [
  { label: 'Todos', value: 'todos' },
  { label: 'Verificados', value: 'si' },
  { label: 'Pendientes', value: 'no' },
]

function formatFecha(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO')
}

function formatImporte(val?: number): string {
  if (val == null || Number.isNaN(val)) return '—'
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
  }).format(val)
}

function hojaRutaLabel(item: RecDepositoItem): string {
  const hr = item.correspondencia?.hoja_ruta
  if (!hr?.anio) return '—'
  const n = hr.numero ?? '—'
  return `${n}/${hr.anio}`
}

const columns: TableColumn<RecDepositoItem>[] = [
  {
    accessorKey: 'numero',
    header: 'Nº boleta',
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-sm font-semibold' }, row.original.numero?.trim() || '—'),
  },
  {
    accessorKey: 'hoja_ruta',
    header: 'Hoja de ruta',
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-xs text-muted' }, hojaRutaLabel(row.original)),
  },
  {
    accessorKey: 'cite',
    header: 'CITE',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'font-mono text-[11px] text-muted max-w-[140px] truncate block' },
        row.original.correspondencia?.cite_origen?.trim() || '—',
      ),
  },
  {
    accessorKey: 'fecha_corresp',
    header: 'Fecha corresp.',
    cell: ({ row }) =>
      h('span', { class: 'text-xs' }, formatFecha(row.original.correspondencia?.fecha_emision)),
  },
  {
    accessorKey: 'referencia',
    header: 'Referencia',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-xs text-highlighted line-clamp-2 max-w-[200px]' },
        row.original.correspondencia?.referencia?.trim() || '—',
      ),
  },
  {
    accessorKey: 'importe',
    header: 'Importe',
    cell: ({ row }) =>
      h('span', { class: 'text-sm font-medium tabular-nums' }, formatImporte(row.original.importe)),
  },
  {
    accessorKey: 'fecha_deposito',
    header: 'Fecha depósito',
    cell: ({ row }) => h('span', { class: 'text-xs' }, formatFecha(row.original.fecha_deposito)),
  },
  {
    accessorKey: 'verificado',
    header: 'Estado',
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: row.original.verificado ? 'success' : 'warning',
          variant: 'subtle',
          size: 'xs',
        },
        () => (row.original.verificado ? 'Verificado' : 'Pendiente'),
      ),
  },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex items-center justify-end gap-1' }, [
        !item.verificado
          ? h(UButton, {
              icon: 'i-lucide-badge-check',
              color: 'success',
              variant: 'ghost',
              size: 'xs',
              title: 'Marcar verificado',
              loading: verificandoId.value === item.id,
              onClick: () => handleVerificar(item),
            })
          : null,
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
    const filtro: FiltroRecDeposito = {
      pagina: page.value,
      limite: pageSize.value,
      criterio: searchCriterio.value?.trim() || undefined,
      verificado:
        filtroVerificado.value === 'todos'
          ? undefined
          : filtroVerificado.value === 'si',
    }
    const res = await backendService.post<RespuestaBusquedaRecDeposito>(
      'recaudaciones/buscar',
      filtro,
    )
    const data = (res as { data?: RespuestaBusquedaRecDeposito })?.data ?? res
    items.value = data.datos ?? []
    total.value = data.total ?? 0
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.add({
      title: 'Error de conexión',
      description: err?.message || 'No se pudieron cargar los depósitos.',
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
  filtroVerificado.value = 'todos'
  page.value = 1
  cargar()
}

const handleEditar = (item: RecDepositoItem) => {
  itemToEdit.value = item
  isModalOpen.value = true
}

const handleVerificar = async (item: RecDepositoItem) => {
  verificandoId.value = item.id
  try {
    const api = getApi()
    await api<RecDepositoItem>(`recaudaciones/${item.id}/verificar`, {
      method: 'PATCH',
      body: {},
    })
    toast.add({
      title: 'Depósito verificado',
      description: `Boleta ${item.numero} marcada como verificada.`,
      color: 'success',
      icon: 'i-lucide-badge-check',
    })
    cargar()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo verificar',
      description: err?.data?.message || err?.message || 'Intente nuevamente.',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  } finally {
    verificandoId.value = null
  }
}

const handleConfirmarEliminar = (item: RecDepositoItem) => {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

const ejecutarEliminacion = async () => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete('recaudaciones', itemToDelete.value.id)
    toast.add({
      title: 'Depósito eliminado',
      description: `Se eliminó la boleta ${itemToDelete.value.numero}.`,
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
      description: err?.data?.message || err?.message || 'El depósito no pudo eliminarse.',
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
      title="Recaudaciones"
      description="Gestión y verificación de depósitos vinculados a correspondencia"
    />

    <AppFilter>
      <AppFilterItem label="Búsqueda" min-w="320px" flex1>
        <UInput
          v-model="searchCriterio"
          icon="i-lucide-search"
          placeholder="Boleta, referencia, CITE..."
          variant="ghost"
          class="w-full font-medium"
          @update:model-value="onSearchInput"
        />
      </AppFilterItem>

      <AppFilterItem label="Verificación" min-w="200px" border>
        <USelect
          v-model="filtroVerificado"
          :items="verificadoOptions"
          class="w-full"
          @update:model-value="() => { page = 1; cargar() }"
        />
      </AppFilterItem>

      <div
        v-if="searchCriterio || filtroVerificado !== 'todos'"
        class="pl-3 flex items-center"
      >
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

    <RecaudacionesRecDepositoFormModal
      v-model:open="isModalOpen"
      :deposito="itemToEdit"
      @guardado="cargar"
    />

    <UModal
      v-model:open="isDeleteOpen"
      title="Confirmar eliminación"
      description="¿Eliminar este registro de depósito?"
    >
      <template #body>
        <div v-if="itemToDelete" class="p-3 bg-error/10 rounded-md border border-error/20">
          <p class="font-bold text-sm font-mono">{{ itemToDelete.numero }}</p>
          <p class="text-xs text-muted mt-2">
            Se desvinculará de la correspondencia y se borrará el comprobante.
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
            label="Eliminar"
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
