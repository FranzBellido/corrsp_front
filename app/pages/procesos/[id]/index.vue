<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Proceso } from '~/types/proceso'
import type { FlujoAccion, FlujoAccionEstado } from '~/types/flujo-accion'
import { backendService } from '~/services/backend.service'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const procId = computed(() => {
  const raw = route.params.id
  const n = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(n) ? n : 0
})

const proceso = ref<Proceso | null>(null)
const loadingProceso = ref(true)
const loading = ref(false)
const acciones = ref<FlujoAccion[]>([])
const estados = ref<FlujoAccionEstado[]>([])

const isModalOpen = ref(false)
const accionToEdit = ref<FlujoAccion | null>(null)
const isDeleteOpen = ref(false)
const accionToDelete = ref<FlujoAccion | null>(null)
const deleting = ref(false)

const endpointFlujo = computed(() => `procesos/${procId.value}/flujo-acciones`)

const columns = computed<TableColumn<FlujoAccion>[]>(() => [
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => {
      const est = row.original.estado
      if (!est) {
        return h('span', { class: 'text-xs text-muted italic' }, '—')
      }
      return h(UBadge, { color: 'neutral', variant: 'subtle', size: 'xs' }, () => est.nombre)
    },
  },
  {
    accessorKey: 'desc_operacion',
    header: 'Operación',
    cell: ({ row }) =>
      h('span', { class: 'text-sm font-medium' }, row.original.desc_operacion?.trim() || '—'),
  },
  {
    accessorKey: 'cargo_origen',
    header: 'Origen → Destino',
    cell: ({ row }) => {
      const o = row.original.cargo_origen?.nombre || '—'
      const d = row.original.cargo_destino?.nombre || '—'
      return h('div', { class: 'text-xs leading-snug' }, [
        h('span', { class: 'font-semibold text-highlighted' }, o),
        h('span', { class: 'text-muted mx-1' }, '→'),
        h('span', { class: 'font-semibold text-highlighted' }, d),
      ])
    },
  },
  {
    accessorKey: 'instruccion',
    header: 'Instrucción',
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-muted line-clamp-2' }, row.original.instruccion),
  },
  {
    accessorKey: 'activo',
    header: 'Activo',
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: row.original.activo ? 'success' : 'neutral',
          variant: 'subtle',
          size: 'xs',
        },
        () => (row.original.activo ? 'Sí' : 'No'),
      ),
  },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex justify-end gap-1' }, [
        h(UButton, {
          icon: 'i-lucide-pencil',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          onClick: () => handleEditar(item),
        }),
        h(UButton, {
          icon: 'i-lucide-trash-2',
          color: 'error',
          variant: 'ghost',
          size: 'xs',
          onClick: () => handleConfirmarEliminar(item),
        }),
      ])
    },
  },
])

const unwrapData = <T,>(res: unknown): T => {
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data
    if (data && typeof data === 'object' && 'data' in data) {
      return (data as { data: T }).data
    }
    return data as T
  }
  return res as T
}

const cargarProceso = async () => {
  if (!procId.value) return
  loadingProceso.value = true
  try {
    const res = await backendService.getById<Proceso>('procesos', procId.value)
    const data = unwrapData<Proceso>(res)
    proceso.value = data?.id ? data : null
  } catch {
    proceso.value = null
    toast.add({
      title: 'Proceso no encontrado',
      description: 'Verifique el identificador en la URL.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loadingProceso.value = false
  }
}

const cargarEstados = async () => {
  if (!procId.value) return
  try {
    const res = await backendService.get<FlujoAccionEstado[]>(
      `${endpointFlujo.value}/estados`,
    )
    const data = (res as { data?: FlujoAccionEstado[] })?.data ?? res
    estados.value = Array.isArray(data) ? data : []
  } catch {
    estados.value = []
  }
}

const cargarAcciones = async () => {
  if (!procId.value) return
  loading.value = true
  try {
    const res = await backendService.get<FlujoAccion[]>(endpointFlujo.value)
    const data = (res as { data?: FlujoAccion[] })?.data ?? res
    acciones.value = Array.isArray(data) ? data : []
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.add({
      title: 'Error al cargar acciones',
      description: err?.message || 'No se pudo obtener el flujo del proceso.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    acciones.value = []
  } finally {
    loading.value = false
  }
}

const cargarTodo = async () => {
  await cargarProceso()
  if (proceso.value) {
    await Promise.all([cargarEstados(), cargarAcciones()])
  }
}

const handleCrear = () => {
  accionToEdit.value = null
  isModalOpen.value = true
}

const handleEditar = (item: FlujoAccion) => {
  accionToEdit.value = item
  isModalOpen.value = true
}

const handleConfirmarEliminar = (item: FlujoAccion) => {
  accionToDelete.value = item
  isDeleteOpen.value = true
}

const ejecutarEliminacion = async () => {
  if (!accionToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete(endpointFlujo.value, accionToDelete.value.id)
    toast.add({
      title: 'Acción eliminada',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    isDeleteOpen.value = false
    accionToDelete.value = null
    await cargarAcciones()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo eliminar',
      description: err?.data?.message || err?.message || 'Error al eliminar.',
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  if (!procId.value) {
    void router.replace('/procesos')
    return
  }
  void cargarTodo()
})

definePageMeta({
  title: 'Flujo del proceso',
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="proceso ? `Flujo: ${proceso.nombre}` : 'Flujo del proceso'"
      :description="proceso
        ? `Acciones disponibles para el trámite ${proceso.codigo} (ID ${procId})`
        : 'Configuración de acciones por proceso'"
    >
      <template #actions>
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          class="h-10"
          to="/procesos"
        >
          Volver a procesos
        </UButton>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="h-10 font-bold px-5"
          :disabled="!procId || loadingProceso"
          @click="handleCrear"
        >
          Nueva acción
        </UButton>
      </template>
    </PageHeader>

    <CorTable
      :columns="columns"
      :data="acciones"
      :loading="loading || loadingProceso"
    />

    <ProcesosFlujoAccionFormModal
      v-if="procId"
      v-model:open="isModalOpen"
      :proc-id="procId"
      :accion="accionToEdit"
      :estados="estados"
      @guardado="cargarAcciones"
    />

    <UModal v-model:open="isDeleteOpen" title="Eliminar acción">
      <template #body>
        <p class="text-sm text-muted">
          ¿Eliminar la acción
          <strong>{{ accionToDelete?.desc_operacion || accionToDelete?.instruccion }}</strong>?
          Esta operación no se puede deshacer.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            @click="isDeleteOpen = false"
          />
          <UButton
            label="Eliminar"
            color="error"
            :loading="deleting"
            @click="ejecutarEliminacion"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
