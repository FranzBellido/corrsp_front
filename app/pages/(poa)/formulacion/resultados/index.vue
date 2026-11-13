<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { PoaFormulacionContexto } from '~/types/poa/formulacion'
import type {
  AcpResultado,
  FiltroAcpResultado,
  FormTreeRow,
  RespuestaBusquedaAcpResultado,
} from '~/types/poa/acp-resultado'
import type { PoaOperacion } from '~/types/poa/poa-operacion'
import type { PoaActividad } from '~/types/poa/poa-actividad'
import { backendService } from '~/services/backend.service'
import { useProfile } from '~/composables/comun/useProfile'
import {
  CLASE_CONTENEDOR_ACCIONES_CELDA,
  enriquecerItemMenuAcciones,
  hMenuAccionesTabla,
  META_COLUMNA_ACCIONES_TABLA,
} from '~/utils/shared/acciones-menu'
import type { PoaFormTreeDetallePayload } from '~/components/poa/formulacion/PoaFormTreeDetalleModal.vue'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()
const { fetchProfile } = useProfile()

const loadingContexto = ref(true)
const loading = ref(false)
const contexto = ref<PoaFormulacionContexto | null>(null)

const items = ref<AcpResultado[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filtroAcpId = ref<string | 'todos'>('todos')

const isModalOpen = ref(false)
const itemToEdit = ref<AcpResultado | null>(null)
const isDeleteOpen = ref(false)
const itemToDelete = ref<AcpResultado | null>(null)
const deleting = ref(false)

const isOperacionModalOpen = ref(false)
const operacionToEdit = ref<PoaOperacion | null>(null)
const operacionResultadoId = ref('')
const operacionResultadoNombre = ref('')
const isDeleteOperacionOpen = ref(false)
const operacionToDelete = ref<PoaOperacion | null>(null)
const deletingOperacion = ref(false)

const isActividadModalOpen = ref(false)
const actividadToEdit = ref<PoaActividad | null>(null)
const actividadOperacionId = ref('')
const actividadOperacionNombre = ref('')
const isDeleteActividadOpen = ref(false)
const actividadToDelete = ref<PoaActividad | null>(null)
const deletingActividad = ref(false)

const isDetalleOpen = ref(false)
const detalleItem = ref<PoaFormTreeDetallePayload | null>(null)

const handleVerDetalle = (row: FormTreeRow) => {
  detalleItem.value = {
    tipo: row.tipo,
    resultado: row.resultado,
    operacion: row.operacion,
    actividad: row.actividad,
    parentResultado: row.parentResultado,
    parentOperacion: row.parentOperacion,
  }
  isDetalleOpen.value = true
}

const acpFilterOptions = computed(() => {
  const base = [{ label: 'Todos los ACP', value: 'todos' as const }]
  const acps = contexto.value?.acps_disponibles ?? []
  return [
    ...base,
    ...acps.map((a) => ({
      label: `ACP ${a.numero} — ${a.descripcion}`,
      value: a.id,
    })),
  ]
})

const treeRows = computed<FormTreeRow[]>(() => {
  const rows: FormTreeRow[] = []
  for (const resultado of items.value) {
    rows.push({
      rowKey: `r-${resultado.id}`,
      tipo: 'resultado',
      id: resultado.id,
      numero: resultado.numero,
      titulo: resultado.nombre,
      ponderacion: resultado.ponderacion,
      estadoNombre: resultado.poa_estado?.nombre || '—',
      permite_editar: Boolean(resultado.poa_estado?.permite_editar),
      permite_eliminar: Boolean(resultado.poa_estado?.permite_eliminar),
      resultado,
    })
    for (const op of resultado.poa_operacion ?? []) {
      rows.push({
        rowKey: `o-${op.id}`,
        tipo: 'operacion',
        id: op.id,
        numero: op.numero,
        titulo: op.descripcion,
        ponderacion: op.ponderacion,
        estadoNombre: op.poa_estado?.nombre || '—',
        permite_editar: Boolean(op.poa_estado?.permite_editar),
        permite_eliminar: Boolean(op.poa_estado?.permite_eliminar),
        operacion: op,
        parentResultado: resultado,
      })
      for (const act of op.poa_actividades ?? []) {
        rows.push({
          rowKey: `a-${act.id}`,
          tipo: 'actividad',
          id: act.id,
          numero: act.numero,
          titulo: act.descripcion || '—',
          ponderacion: act.ponderacion,
          estadoNombre: op.poa_estado?.nombre || '—',
          permite_editar: Boolean(op.poa_estado?.permite_editar),
          permite_eliminar: Boolean(op.poa_estado?.permite_eliminar),
          actividad: act,
          parentOperacion: op,
          parentResultado: resultado,
        })
      }
    }
  }
  return rows
})

const buildMenuResultado = (resultado: AcpResultado): DropdownMenuItem[] => {
  const puedeEditar = Boolean(resultado.poa_estado?.permite_editar)
  const puedeEliminar = Boolean(resultado.poa_estado?.permite_eliminar)
  const tieneOps = (resultado._count?.poa_operacion ?? resultado.poa_operacion?.length ?? 0) > 0

  return [
    enriquecerItemMenuAcciones(
      {
        label: 'Editar resultado',
        icon: 'i-lucide-pencil',
        disabled: !puedeEditar,
        onSelect: () => handleEditar(resultado),
      },
      !puedeEditar ? 'El estado del resultado no permite editar.' : undefined,
    ),
    enriquecerItemMenuAcciones(
      {
        label: 'Registrar operación',
        icon: 'i-lucide-hammer',
        disabled: !puedeEditar,
        onSelect: () => handleCrearOperacion(resultado),
      },
      !puedeEditar
        ? 'El estado del resultado no permite registrar operaciones.'
        : undefined,
    ),
    enriquecerItemMenuAcciones(
      {
        label: 'Eliminar resultado',
        icon: 'i-lucide-trash-2',
        color: 'error',
        disabled: !puedeEliminar || tieneOps,
        onSelect: () => handleConfirmarEliminar(resultado),
      },
      !puedeEliminar
        ? 'El estado del resultado no permite eliminar.'
        : tieneOps
          ? 'Elimine primero las operaciones asociadas.'
          : undefined,
    ),
  ]
}

const buildMenuOperacion = (
  operacion: PoaOperacion,
  parent: AcpResultado,
): DropdownMenuItem[] => {
  const puedeEditar = Boolean(operacion.poa_estado?.permite_editar)
  const puedeEliminar = Boolean(operacion.poa_estado?.permite_eliminar)
  const tieneActs = (operacion._count?.poa_actividades ?? operacion.poa_actividades?.length ?? 0) > 0

  return [
    enriquecerItemMenuAcciones(
      {
        label: 'Editar operación',
        icon: 'i-lucide-pencil',
        disabled: !puedeEditar,
        onSelect: () => handleEditarOperacion(operacion, parent),
      },
      !puedeEditar ? 'El estado de la operación no permite editar.' : undefined,
    ),
    enriquecerItemMenuAcciones(
      {
        label: 'Registrar actividad',
        icon: 'i-lucide-list-todo',
        disabled: !puedeEditar,
        onSelect: () => handleCrearActividad(operacion),
      },
      !puedeEditar
        ? 'El estado de la operación no permite registrar actividades.'
        : undefined,
    ),
    enriquecerItemMenuAcciones(
      {
        label: 'Eliminar operación',
        icon: 'i-lucide-trash-2',
        color: 'error',
        disabled: !puedeEliminar || tieneActs,
        onSelect: () => handleConfirmarEliminarOperacion(operacion),
      },
      !puedeEliminar
        ? 'El estado de la operación no permite eliminar.'
        : tieneActs
          ? 'Elimine primero las actividades asociadas.'
          : undefined,
    ),
  ]
}

const buildMenuActividad = (
  actividad: PoaActividad,
  parentOp: PoaOperacion,
): DropdownMenuItem[] => {
  const puedeEditar = Boolean(parentOp.poa_estado?.permite_editar)
  const puedeEliminar = Boolean(parentOp.poa_estado?.permite_eliminar)
  const tieneSeg = (actividad._count?.seguimiento_actividades ?? 0) > 0

  return [
    enriquecerItemMenuAcciones(
      {
        label: 'Editar actividad',
        icon: 'i-lucide-pencil',
        disabled: !puedeEditar,
        onSelect: () => handleEditarActividad(actividad, parentOp),
      },
      !puedeEditar
        ? 'El estado de la operación no permite editar actividades.'
        : undefined,
    ),
    enriquecerItemMenuAcciones(
      {
        label: 'Eliminar actividad',
        icon: 'i-lucide-trash-2',
        color: 'error',
        disabled: !puedeEliminar || tieneSeg,
        onSelect: () => handleConfirmarEliminarActividad(actividad),
      },
      !puedeEliminar
        ? 'El estado de la operación no permite eliminar actividades.'
        : tieneSeg
          ? 'Elimine primero los seguimientos asociados.'
          : undefined,
    ),
  ]
}

const columns: TableColumn<FormTreeRow>[] = [
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    cell: ({ row }) => {
      const item = row.original
      if (item.tipo === 'resultado') {
        return h('div', { class: 'flex items-center gap-2' }, [
          h(UIcon, { name: 'i-lucide-target', class: 'size-3.5 text-primary' }),
          h(UBadge, { color: 'primary', variant: 'subtle', size: 'xs' }, () => 'Resultado'),
        ])
      }
      if (item.tipo === 'operacion') {
        return h('div', { class: 'flex items-center gap-2 pl-5' }, [
          h(UIcon, { name: 'i-lucide-corner-down-right', class: 'size-3.5 text-muted' }),
          h(UBadge, { color: 'neutral', variant: 'subtle', size: 'xs' }, () => 'Operación'),
        ])
      }
      return h('div', { class: 'flex items-center gap-2 pl-10' }, [
        h(UIcon, { name: 'i-lucide-corner-down-right', class: 'size-3.5 text-muted' }),
        h(UBadge, { color: 'success', variant: 'subtle', size: 'xs' }, () => 'Actividad'),
      ])
    },
  },
  {
    accessorKey: 'numero',
    header: 'Nº',
    cell: ({ row }) => {
      const item = row.original
      const acpNum = item.resultado?.acp?.numero ?? item.parentResultado?.acp?.numero
      const rNum = item.resultado?.numero ?? item.parentResultado?.numero
      const oNum = item.operacion?.numero ?? item.parentOperacion?.numero
      let label = String(item.numero)
      if (item.tipo === 'resultado') {
        label = `${acpNum != null ? `ACP${acpNum}.` : ''}${item.numero}`
      } else if (item.tipo === 'operacion') {
        label = `${acpNum != null ? `ACP${acpNum}.` : ''}${rNum ?? '?'}.${item.numero}`
      } else {
        label = `${acpNum != null ? `ACP${acpNum}.` : ''}${rNum ?? '?'}.${oNum ?? '?'}.${item.numero}`
      }
      return h(
        UBadge,
        {
          color:
            item.tipo === 'resultado'
              ? 'primary'
              : item.tipo === 'operacion'
                ? 'neutral'
                : 'success',
          variant: 'subtle',
          size: 'xs',
          class: 'font-mono',
        },
        () => label,
      )
    },
  },
  {
    accessorKey: 'titulo',
    header: 'Descripción',
    cell: ({ row }) => {
      const item = row.original
      const pad =
        item.tipo === 'resultado' ? '' : item.tipo === 'operacion' ? 'pl-5' : 'pl-10'
      return h(
        'div',
        {
          class: [
            'line-clamp-2 max-w-xl',
            pad,
            item.tipo === 'resultado'
              ? 'font-semibold text-highlighted'
              : 'text-sm text-default',
          ],
        },
        item.titulo || '—',
      )
    },
  },
  {
    accessorKey: 'ponderacion',
    header: 'Pond.',
    cell: ({ row }) => h('span', { class: 'text-sm' }, `${row.original.ponderacion}%`),
  },
  {
    accessorKey: 'estadoNombre',
    header: 'Estado',
    cell: ({ row }) => h('span', { class: 'text-xs' }, row.original.estadoNombre),
  },
  {
    id: 'acciones',
    header: 'Acciones',
    meta: META_COLUMNA_ACCIONES_TABLA,
    cell: ({ row }) => {
      const item = row.original
      let menu: DropdownMenuItem[] = []
      if (item.tipo === 'resultado' && item.resultado) {
        menu = buildMenuResultado(item.resultado)
      } else if (item.tipo === 'operacion' && item.operacion && item.parentResultado) {
        menu = buildMenuOperacion(item.operacion, item.parentResultado)
      } else if (item.tipo === 'actividad' && item.actividad && item.parentOperacion) {
        menu = buildMenuActividad(item.actividad, item.parentOperacion)
      }

      return h('div', { class: CLASE_CONTENEDOR_ACCIONES_CELDA }, [
        h(UButton, {
          icon: 'i-lucide-eye',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          class: 'shrink-0',
          title: 'Ver detalle',
          onClick: () => handleVerDetalle(item),
        }),
        hMenuAccionesTabla(UDropdownMenu, UButton, menu),
      ])
    },
  },
]

const cargarContexto = async () => {
  loadingContexto.value = true
  try {
    await fetchProfile()
    const res = await backendService.get<PoaFormulacionContexto>('poa-formulacion/mi')
    const data = (res as { data?: PoaFormulacionContexto })?.data || res
    contexto.value = data as PoaFormulacionContexto
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    contexto.value = null
    toast.add({
      title: 'No se pudo iniciar formulación',
      description: err?.data?.message || err?.message || 'Verifique cargo y configuración POA.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loadingContexto.value = false
  }
}

const cargar = async () => {
  if (!contexto.value?.formulacion?.id) return
  loading.value = true
  try {
    const filtro: FiltroAcpResultado = {
      poa_formulacion_id: contexto.value.formulacion.id,
      pagina: page.value,
      limite: pageSize.value,
      acp_id: filtroAcpId.value === 'todos' ? undefined : filtroAcpId.value,
    }
    const res = await backendService.post<RespuestaBusquedaAcpResultado>(
      'acp-resultados/buscar',
      filtro,
    )
    const data = (res as { data?: RespuestaBusquedaAcpResultado })?.data || res
    items.value = data.datos || []
    total.value = data.total || 0
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.add({
      title: 'Error al cargar resultados',
      description: err?.message,
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

const onGuardado = async () => {
  await cargarContexto()
  await cargar()
}

const handleCrear = () => {
  itemToEdit.value = null
  isModalOpen.value = true
}

const handleEditar = (item: AcpResultado) => {
  itemToEdit.value = item
  isModalOpen.value = true
}

const handleConfirmarEliminar = (item: AcpResultado) => {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

const handleCrearOperacion = (resultado: AcpResultado) => {
  operacionToEdit.value = null
  operacionResultadoId.value = resultado.id
  operacionResultadoNombre.value = resultado.nombre
  isOperacionModalOpen.value = true
}

const handleEditarOperacion = (operacion: PoaOperacion, parent: AcpResultado) => {
  operacionToEdit.value = operacion
  operacionResultadoId.value = parent.id
  operacionResultadoNombre.value = parent.nombre
  isOperacionModalOpen.value = true
}

const handleConfirmarEliminarOperacion = (operacion: PoaOperacion) => {
  operacionToDelete.value = operacion
  isDeleteOperacionOpen.value = true
}

const handleCrearActividad = (operacion: PoaOperacion) => {
  actividadToEdit.value = null
  actividadOperacionId.value = operacion.id
  actividadOperacionNombre.value = operacion.descripcion
  isActividadModalOpen.value = true
}

const handleEditarActividad = (actividad: PoaActividad, parentOp: PoaOperacion) => {
  actividadToEdit.value = actividad
  actividadOperacionId.value = parentOp.id
  actividadOperacionNombre.value = parentOp.descripcion
  isActividadModalOpen.value = true
}

const handleConfirmarEliminarActividad = (actividad: PoaActividad) => {
  actividadToDelete.value = actividad
  isDeleteActividadOpen.value = true
}

const ejecutarEliminacion = async () => {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete<AcpResultado>('acp-resultados', itemToDelete.value.id)
    toast.add({ title: 'Resultado eliminado', color: 'success', icon: 'i-lucide-check-circle' })
    isDeleteOpen.value = false
    itemToDelete.value = null
    await cargar()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo eliminar',
      description: err?.data?.message || err?.message,
      color: 'error',
    })
  } finally {
    deleting.value = false
  }
}

const ejecutarEliminacionOperacion = async () => {
  if (!operacionToDelete.value) return
  deletingOperacion.value = true
  try {
    await backendService.delete<PoaOperacion>('poa-operaciones', operacionToDelete.value.id)
    toast.add({ title: 'Operación eliminada', color: 'success', icon: 'i-lucide-check-circle' })
    isDeleteOperacionOpen.value = false
    operacionToDelete.value = null
    await cargar()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo eliminar',
      description: err?.data?.message || err?.message,
      color: 'error',
    })
  } finally {
    deletingOperacion.value = false
  }
}

const ejecutarEliminacionActividad = async () => {
  if (!actividadToDelete.value) return
  deletingActividad.value = true
  try {
    await backendService.delete<PoaActividad>('poa-actividades', actividadToDelete.value.id)
    toast.add({ title: 'Actividad eliminada', color: 'success', icon: 'i-lucide-check-circle' })
    isDeleteActividadOpen.value = false
    actividadToDelete.value = null
    await cargar()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo eliminar',
      description: err?.data?.message || err?.message,
      color: 'error',
    })
  } finally {
    deletingActividad.value = false
  }
}

onMounted(async () => {
  await cargarContexto()
  await cargar()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Resultados — Formulación POA"
      description="Resultados, operaciones y actividades de la formulación de su área"
    >
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="justify-center h-10 rounded-md font-bold px-6"
          :disabled="!contexto?.formulacion?.id || !(contexto?.acps_disponibles?.length)"
          @click="handleCrear"
        >
          Nuevo resultado
        </UButton>
      </template>
    </PageHeader>

    <USkeleton v-if="loadingContexto" class="h-24 w-full rounded-md" />

    <UCard v-else-if="contexto?.formulacion" class="border border-default">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        <div>
          <p class="text-xs text-muted">Área (cargo activo)</p>
          <p class="font-semibold">
            {{ contexto.area_cargo.nombre }}
            <span v-if="contexto.area_cargo.codigo" class="text-muted font-mono text-xs">
              [{{ contexto.area_cargo.codigo }}]
            </span>
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">Formulación</p>
          <p class="font-semibold line-clamp-2">{{ contexto.formulacion.nombre }}</p>
        </div>
        <div>
          <p class="text-xs text-muted">Estado</p>
          <p class="font-semibold">{{ contexto.formulacion.poa_estado?.nombre || '—' }}</p>
        </div>
      </div>
    </UCard>

    <UAlert
      v-else
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
      title="Sin formulación"
      description="No se pudo crear ni recuperar la formulación. Revise cargo activo y configuración POA."
    />

    <AppFilter v-if="contexto?.formulacion">
      <AppFilterItem label="ACP" min-w="320px" border>
        <USelect
          v-model="filtroAcpId"
          :items="acpFilterOptions"
          class="w-full"
          @update:model-value="() => { page = 1; cargar() }"
        />
      </AppFilterItem>
    </AppFilter>

    <CorTable
      v-if="contexto?.formulacion"
      :columns="columns"
      :data="treeRows"
      :loading="loading"
      :total="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      @update:page="cargar"
      @update:page-size="cargar"
    />

    <AcpResultadoFormModal
      v-if="contexto?.formulacion?.id"
      v-model:open="isModalOpen"
      :resultado="itemToEdit"
      :poa-formulacion-id="contexto.formulacion.id"
      :acps-disponibles="contexto.acps_disponibles || []"
      @guardado="onGuardado"
    />

    <PoaOperacionFormModal
      v-model:open="isOperacionModalOpen"
      :operacion="operacionToEdit"
      :resultado-id="operacionResultadoId"
      :resultado-nombre="operacionResultadoNombre"
      @guardado="cargar"
    />

    <PoaActividadFormModal
      v-model:open="isActividadModalOpen"
      :actividad="actividadToEdit"
      :operacion-id="actividadOperacionId"
      :operacion-nombre="actividadOperacionNombre"
      :trimestre-activo="contexto?.trimestre_activo ?? 1"
      @guardado="cargar"
    />

    <PoaFormTreeDetalleModal
      v-model:open="isDetalleOpen"
      :detalle="detalleItem"
    />

    <UModal v-model:open="isDeleteOpen" title="Eliminar resultado">
      <template #body>
        <p v-if="itemToDelete" class="text-sm font-medium">{{ itemToDelete.nombre }}</p>
        <p class="text-xs text-muted mt-2">No se puede eliminar si tiene operaciones asociadas.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton label="Cancelar" color="neutral" variant="ghost" :disabled="deleting" @click="isDeleteOpen = false" />
          <UButton label="Eliminar" color="error" :loading="deleting" @click="ejecutarEliminacion" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isDeleteOperacionOpen" title="Eliminar operación">
      <template #body>
        <p v-if="operacionToDelete" class="text-sm font-medium line-clamp-3">
          {{ operacionToDelete.descripcion }}
        </p>
        <p class="text-xs text-muted mt-2">No se puede eliminar si tiene actividades asociadas.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            :disabled="deletingOperacion"
            @click="isDeleteOperacionOpen = false"
          />
          <UButton
            label="Eliminar"
            color="error"
            :loading="deletingOperacion"
            @click="ejecutarEliminacionOperacion"
          />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isDeleteActividadOpen" title="Eliminar actividad">
      <template #body>
        <p v-if="actividadToDelete" class="text-sm font-medium line-clamp-3">
          {{ actividadToDelete.descripcion }}
        </p>
        <p class="text-xs text-muted mt-2">No se puede eliminar si tiene seguimientos asociados.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            :disabled="deletingActividad"
            @click="isDeleteActividadOpen = false"
          />
          <UButton
            label="Eliminar"
            color="error"
            :loading="deletingActividad"
            @click="ejecutarEliminacionActividad"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
