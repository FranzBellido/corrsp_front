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
import { backendService, descargarBlob } from '~/services/backend.service'
import { useProfile } from '~/composables/comun/useProfile'
import {
  CLASE_CONTENEDOR_ACCIONES_CELDA,
  enriquecerItemMenuAcciones,
  hMenuAccionesTabla,
  META_COLUMNA_ACCIONES_TABLA,
} from '~/utils/shared/acciones-menu'
import type { PoaFormTreeDetallePayload } from '~/components/poa/formulacion/PoaFormTreeDetalleModal.vue'
import {
  POA_FORMULACION_ESTADO_ENVIADO_ID,
  POA_FORMULACION_ESTADO_OBSERVADO_ID,
  POA_FORMULACION_ESTADO_VALIDADO_ID,
  type PoaFormulacionValidacionEnvio,
} from '~/types/poa/formulacion'
import { observacionesParaFilaTree } from '~/utils/poa/formulacion-envio-alertas'

const UBadge = resolveComponent('UBadge')
const PoaEstadoBadge = resolveComponent('PoaEstadoBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UTooltip = resolveComponent('UTooltip')

const toast = useToast()
const { fetchProfile } = useProfile()
const route = useRoute()

const modoAdmin = computed(
  () =>
    String(route.query.modo || '') === 'admin' &&
    Boolean(route.query.formulacion_id),
)
const formulacionAdminId = computed(() =>
  modoAdmin.value ? String(route.query.formulacion_id) : null,
)

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

const isFormulacionDetalleOpen = ref(false)
const isFormulacionHistorialOpen = ref(false)
const descargandoPdf = ref(false)

const isItemHistorialOpen = ref(false)
const itemHistorialId = ref<string | null>(null)
const itemHistorialApi = ref<string | null>(null)
const itemHistorialTitulo = ref('Historial de estados')
const isEnviarFormulacionOpen = ref(false)
const alertasEnvio = ref<string[]>([])

const isAdminEstadoOpen = ref(false)
const adminEstadoItemId = ref<string | null>(null)
const adminEstadoApi = ref('acp-resultados-admin')
const adminEstadoDestino = ref(0)
const adminEstadoTitulo = ref('')
const adminEstadoDescripcion = ref('')
const adminEstadoLabel = ref('')
const adminEstadoIcon = ref('i-lucide-check')
const adminEstadoColor = ref<'primary' | 'success' | 'warning'>('primary')

const formulacionEnviada = computed(
  () =>
    contexto.value?.formulacion?.poa_estado_id ===
    POA_FORMULACION_ESTADO_ENVIADO_ID,
)

const puedeEnviarPorEstado = computed(() => {
  if (modoAdmin.value) return false
  const f = contexto.value?.formulacion
  if (!f) return false
  if (f.poa_estado_id === POA_FORMULACION_ESTADO_ENVIADO_ID) return false
  return f.poa_estado_id === 1 || Boolean(f.poa_estado?.permite_enviar)
})

const puedeEnviarFormulacion = computed(
  () =>
    !modoAdmin.value &&
    puedeEnviarPorEstado.value &&
    alertasEnvio.value.length === 0,
)

const motivoEnvioDeshabilitado = computed(() => {
  if (modoAdmin.value) return 'Modo administrador: no se envía desde aquí.'
  if (!puedeEnviarPorEstado.value) {
    return 'El estado actual no permite enviar la formulación.'
  }
  if (alertasEnvio.value.length > 0) {
    return 'Corrija las observaciones de validación antes de enviar.'
  }
  return undefined
})

const menuFormulacionItems = computed<DropdownMenuItem[]>(() => {
  if (modoAdmin.value) {
    return [
      {
        label: 'Volver al administrador',
        icon: 'i-lucide-arrow-left',
        onSelect: () => navigateTo('/formulaciones-admin'),
      },
    ]
  }
  return [
    enriquecerItemMenuAcciones(
      {
        label: 'Enviar formulación',
        icon: 'i-lucide-send',
        disabled: !puedeEnviarFormulacion.value,
        onSelect: () => {
          isEnviarFormulacionOpen.value = true
        },
      },
      motivoEnvioDeshabilitado.value,
    ),
  ]
})

const abrirAdminEstado = (
  itemId: string,
  apiResource: string,
  estadoId: number,
  opts: {
    titulo: string
    descripcion: string
    label: string
    icon: string
    color: 'primary' | 'success' | 'warning'
  },
) => {
  adminEstadoItemId.value = itemId
  adminEstadoApi.value = apiResource
  adminEstadoDestino.value = estadoId
  adminEstadoTitulo.value = opts.titulo
  adminEstadoDescripcion.value = opts.descripcion
  adminEstadoLabel.value = opts.label
  adminEstadoIcon.value = opts.icon
  adminEstadoColor.value = opts.color
  isAdminEstadoOpen.value = true
}

const onFormulacionEstadoCambiado = async () => {
  await cargarContexto()
  await cargarValidacionEnvio()
}

const onAdminRegistroEstadoCambiado = async () => {
  await cargar()
}

const cargarValidacionEnvio = async () => {
  const id = contexto.value?.formulacion?.id
  if (!id) {
    alertasEnvio.value = []
    return
  }
  try {
    const res = await backendService.getById<PoaFormulacionValidacionEnvio>(
      'poa-formulacion',
      `${id}/validacion-envio`,
    )
    const data =
      (res as { data?: PoaFormulacionValidacionEnvio })?.data ||
      (res as PoaFormulacionValidacionEnvio)
    alertasEnvio.value = data.observaciones ?? []
  } catch {
    alertasEnvio.value = []
  }
}

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

const descargarReporteFormulacionPdf = async () => {
  const id = contexto.value?.formulacion?.id
  if (!id || descargandoPdf.value) return

  descargandoPdf.value = true
  try {
    const resource = modoAdmin.value ? 'poa-formulacion-admin' : 'poa-formulacion'
    const blob = await descargarBlob(`${resource}/${id}/reporte/pdf`, undefined, {
      expectPdf: true,
    })
    const gestion = contexto.value?.formulacion?.version_id ?? ''
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `formulacion_poa_${gestion}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    toast.add({
      title: 'Reporte PDF generado',
      description: 'Formulario 01 — Formulación del Plan Operativo Anual.',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo generar el PDF',
      description: err?.data?.message || err?.message || 'Error al descargar el reporte.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    descargandoPdf.value = false
  }
}

const handleHistorialEstado = (row: FormTreeRow) => {
  if (row.tipo === 'resultado') {
    itemHistorialApi.value = modoAdmin.value ? 'acp-resultados-admin' : 'acp-resultados'
    itemHistorialTitulo.value = 'Historial — resultado'
  } else if (row.tipo === 'operacion') {
    itemHistorialApi.value = modoAdmin.value ? 'poa-operaciones-admin' : 'poa-operaciones'
    itemHistorialTitulo.value = 'Historial — operación'
  } else {
    return
  }
  itemHistorialId.value = row.id
  isItemHistorialOpen.value = true
}

const permiteEditarFormulacion = computed(
  () => contexto.value?.formulacion?.poa_estado?.permite_editar ?? true,
)

const permiteEliminarFormulacion = computed(
  () => contexto.value?.formulacion?.poa_estado?.permite_eliminar ?? true,
)

const motivoBloqueoFormulacion = computed(() => {
  if (permiteEditarFormulacion.value && permiteEliminarFormulacion.value) {
    return undefined
  }
  const nom = contexto.value?.formulacion?.poa_estado?.nombre
  return nom
    ? `La formulación está en estado «${nom}» y no admite cambios en los registros.`
    : 'La formulación no admite cambios en este estado.'
})

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
  const editForm = permiteEditarFormulacion.value
  const delForm = permiteEliminarFormulacion.value
  for (const resultado of items.value) {
    rows.push({
      rowKey: `r-${resultado.id}`,
      tipo: 'resultado',
      id: resultado.id,
      numero: resultado.numero,
      titulo: resultado.nombre,
      ponderacion: resultado.ponderacion,
      estadoNombre: resultado.poa_estado?.nombre || '—',
      estado: resultado.poa_estado ?? null,
      permite_editar: editForm && Boolean(resultado.poa_estado?.permite_editar),
      permite_eliminar: delForm && Boolean(resultado.poa_estado?.permite_eliminar),
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
        estado: op.poa_estado ?? null,
        permite_editar: editForm && Boolean(op.poa_estado?.permite_editar),
        permite_eliminar: delForm && Boolean(op.poa_estado?.permite_eliminar),
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
          estado: op.poa_estado ?? null,
          permite_editar: editForm && Boolean(op.poa_estado?.permite_editar),
          permite_eliminar: delForm && Boolean(op.poa_estado?.permite_eliminar),
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
  if (modoAdmin.value) {
    const activo = formulacionEnviada.value
    const motivo = activo
      ? undefined
      : 'La formulación debe estar Enviada para validar u observar.'
    const yaValidado = resultado.estado_id === POA_FORMULACION_ESTADO_VALIDADO_ID
    const yaObservado = resultado.estado_id === POA_FORMULACION_ESTADO_OBSERVADO_ID
    return [
      enriquecerItemMenuAcciones(
        {
          label: 'Validar',
          icon: 'i-lucide-badge-check',
          disabled: !activo || yaValidado,
          onSelect: () =>
            abrirAdminEstado(resultado.id, 'acp-resultados-admin', POA_FORMULACION_ESTADO_VALIDADO_ID, {
              titulo: 'Validar resultado',
              descripcion: 'El resultado pasará al estado Validado (5).',
              label: 'Validar',
              icon: 'i-lucide-badge-check',
              color: 'success',
            }),
        },
        !activo ? motivo : yaValidado ? 'El resultado ya está validado.' : undefined,
      ),
      enriquecerItemMenuAcciones(
        {
          label: 'Observar',
          icon: 'i-lucide-message-square-warning',
          disabled: !activo || yaObservado,
          onSelect: () =>
            abrirAdminEstado(resultado.id, 'acp-resultados-admin', POA_FORMULACION_ESTADO_OBSERVADO_ID, {
              titulo: 'Observar resultado',
              descripcion: 'El resultado pasará al estado Observado (4).',
              label: 'Observar',
              icon: 'i-lucide-message-square-warning',
              color: 'warning',
            }),
        },
        !activo ? motivo : yaObservado ? 'El resultado ya está observado.' : undefined,
      ),
    ]
  }

  const bloqueoForm = motivoBloqueoFormulacion.value
  const puedeEditar =
    permiteEditarFormulacion.value && Boolean(resultado.poa_estado?.permite_editar)
  const puedeEliminar =
    permiteEliminarFormulacion.value && Boolean(resultado.poa_estado?.permite_eliminar)
  const tieneOps = (resultado._count?.poa_operacion ?? resultado.poa_operacion?.length ?? 0) > 0

  return [
    enriquecerItemMenuAcciones(
      {
        label: 'Editar resultado',
        icon: 'i-lucide-pencil',
        disabled: !puedeEditar,
        onSelect: () => handleEditar(resultado),
      },
      !puedeEditar
        ? bloqueoForm || 'El estado del resultado no permite editar.'
        : undefined,
    ),
    enriquecerItemMenuAcciones(
      {
        label: 'Registrar operación',
        icon: 'i-lucide-hammer',
        disabled: !puedeEditar,
        onSelect: () => handleCrearOperacion(resultado),
      },
      !puedeEditar
        ? bloqueoForm || 'El estado del resultado no permite registrar operaciones.'
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
        ? bloqueoForm || 'El estado del resultado no permite eliminar.'
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
  if (modoAdmin.value) {
    const activo = formulacionEnviada.value
    const motivo = activo
      ? undefined
      : 'La formulación debe estar Enviada para validar u observar.'
    const yaValidado = operacion.estado_id === POA_FORMULACION_ESTADO_VALIDADO_ID
    const yaObservado = operacion.estado_id === POA_FORMULACION_ESTADO_OBSERVADO_ID
    return [
      enriquecerItemMenuAcciones(
        {
          label: 'Validar',
          icon: 'i-lucide-badge-check',
          disabled: !activo || yaValidado,
          onSelect: () =>
            abrirAdminEstado(operacion.id, 'poa-operaciones-admin', POA_FORMULACION_ESTADO_VALIDADO_ID, {
              titulo: 'Validar operación',
              descripcion: 'La operación pasará al estado Validado (5).',
              label: 'Validar',
              icon: 'i-lucide-badge-check',
              color: 'success',
            }),
        },
        !activo ? motivo : yaValidado ? 'La operación ya está validada.' : undefined,
      ),
      enriquecerItemMenuAcciones(
        {
          label: 'Observar',
          icon: 'i-lucide-message-square-warning',
          disabled: !activo || yaObservado,
          onSelect: () =>
            abrirAdminEstado(operacion.id, 'poa-operaciones-admin', POA_FORMULACION_ESTADO_OBSERVADO_ID, {
              titulo: 'Observar operación',
              descripcion: 'La operación pasará al estado Observado (4).',
              label: 'Observar',
              icon: 'i-lucide-message-square-warning',
              color: 'warning',
            }),
        },
        !activo ? motivo : yaObservado ? 'La operación ya está observada.' : undefined,
      ),
    ]
  }

  const bloqueoForm = motivoBloqueoFormulacion.value
  const puedeEditar =
    permiteEditarFormulacion.value && Boolean(operacion.poa_estado?.permite_editar)
  const puedeEliminar =
    permiteEliminarFormulacion.value && Boolean(operacion.poa_estado?.permite_eliminar)
  const tieneActs = (operacion._count?.poa_actividades ?? operacion.poa_actividades?.length ?? 0) > 0

  return [
    enriquecerItemMenuAcciones(
      {
        label: 'Editar operación',
        icon: 'i-lucide-pencil',
        disabled: !puedeEditar,
        onSelect: () => handleEditarOperacion(operacion, parent),
      },
      !puedeEditar
        ? bloqueoForm || 'El estado de la operación no permite editar.'
        : undefined,
    ),
    enriquecerItemMenuAcciones(
      {
        label: 'Registrar actividad',
        icon: 'i-lucide-list-todo',
        disabled: !puedeEditar,
        onSelect: () => handleCrearActividad(operacion),
      },
      !puedeEditar
        ? bloqueoForm || 'El estado de la operación no permite registrar actividades.'
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
        ? bloqueoForm || 'El estado de la operación no permite eliminar.'
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
  if (modoAdmin.value) {
    return [
      {
        label: 'Sin acciones de administración',
        disabled: true,
        icon: 'i-lucide-info',
      },
    ]
  }

  const bloqueoForm = motivoBloqueoFormulacion.value
  const puedeEditar =
    permiteEditarFormulacion.value && Boolean(parentOp.poa_estado?.permite_editar)
  const puedeEliminar =
    permiteEliminarFormulacion.value && Boolean(parentOp.poa_estado?.permite_eliminar)
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
        ? bloqueoForm || 'El estado de la operación no permite editar actividades.'
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
        ? bloqueoForm || 'El estado de la operación no permite eliminar actividades.'
        : tieneSeg
          ? 'Elimine primero los seguimientos asociados.'
          : undefined,
    ),
  ]
}

function hAlertaFilaEnvio(item: FormTreeRow, alertas: string[]) {
  const obs = observacionesParaFilaTree(item, alertas)
  if (!obs.length) return null

  return h(
    UTooltip,
    {
      delayDuration: 0,
      ui: { content: 'max-w-sm' },
    },
    {
      default: () =>
        h(UButton, {
          icon: 'i-lucide-triangle-alert',
          color: 'warning',
          variant: 'ghost',
          size: 'xs',
          class: 'shrink-0',
          'aria-label': 'Observaciones antes de enviar',
        }),
      content: () =>
        h(
          'ul',
          {
            class: 'list-disc ps-4 space-y-1 text-left text-xs max-h-48 overflow-y-auto',
          },
          obs.map((text, idx) => h('li', { key: idx }, text)),
        ),
    },
  )
}

const columns = computed<TableColumn<FormTreeRow>[]>(() => [
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
    cell: ({ row }) =>
      h(PoaEstadoBadge, {
        estado: row.original.estado,
        nombre: row.original.estado ? undefined : row.original.estadoNombre,
      }),
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

      const nodos = [
        hAlertaFilaEnvio(item, alertasEnvio.value),
        h(UButton, {
          icon: 'i-lucide-eye',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          class: 'shrink-0',
          title: 'Ver detalle',
          onClick: () => handleVerDetalle(item),
        }),
        item.tipo === 'resultado' || item.tipo === 'operacion'
          ? h(UButton, {
              icon: 'i-lucide-history',
              color: 'neutral',
              variant: 'ghost',
              size: 'xs',
              class: 'shrink-0',
              title: 'Historial de estados',
              onClick: () => handleHistorialEstado(item),
            })
          : null,
        hMenuAccionesTabla(UDropdownMenu, UButton, menu),
      ].filter(Boolean)

      return h('div', { class: CLASE_CONTENEDOR_ACCIONES_CELDA }, nodos)
    },
  },
])

const cargarContexto = async () => {
  loadingContexto.value = true
  try {
    await fetchProfile()
    if (modoAdmin.value && formulacionAdminId.value) {
      const res = await backendService.getById<PoaFormulacionContexto>(
        'poa-formulacion-admin',
        `${formulacionAdminId.value}/contexto`,
      )
      const data = (res as { data?: PoaFormulacionContexto })?.data || res
      contexto.value = { ...(data as PoaFormulacionContexto), modo_admin: true }
    } else {
      const res = await backendService.get<PoaFormulacionContexto>('poa-formulacion/mi')
      const data = (res as { data?: PoaFormulacionContexto })?.data || res
      contexto.value = data as PoaFormulacionContexto
    }
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    contexto.value = null
    toast.add({
      title: modoAdmin.value
        ? 'No se pudo cargar la formulación (admin)'
        : 'No se pudo iniciar formulación',
      description: err?.data?.message || err?.message || 'Verifique cargo y configuración POA.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loadingContexto.value = false
  }
  if (!modoAdmin.value) {
    await cargarValidacionEnvio()
  } else {
    alertasEnvio.value = []
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
    const endpoint = modoAdmin.value
      ? 'acp-resultados-admin/buscar'
      : 'acp-resultados/buscar'
    const res = await backendService.post<RespuestaBusquedaAcpResultado>(
      endpoint,
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
  await cargarValidacionEnvio()
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
      :title="modoAdmin ? 'Formulación (modo administrador)' : 'Formulación POA'"
      :description="
        modoAdmin
          ? 'Validación u observación de resultados y operaciones de la formulación del área.'
          : 'Resultados, operaciones y actividades de la formulación de su área'
      "
    >
      <template #actions>
        <UButton
          v-if="modoAdmin"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="outline"
          class="justify-center h-10 rounded-md font-bold px-6"
          @click="navigateTo('/formulaciones-admin')"
        >
          Volver
        </UButton>
        <UButton
          v-else
          icon="i-lucide-plus"
          color="primary"
          class="justify-center h-10 rounded-md font-bold px-6"
          :disabled="
            !contexto?.formulacion?.id
              || !(contexto?.acps_disponibles?.length)
              || !permiteEditarFormulacion
          "
          :title="
            !permiteEditarFormulacion ? (motivoBloqueoFormulacion || undefined) : undefined
          "
          @click="handleCrear"
        >
          Nuevo resultado ACP
        </UButton>
      </template>
    </PageHeader>

    <USkeleton v-if="loadingContexto" class="h-24 w-full rounded-md" />

    <UCard v-else-if="contexto?.formulacion" class="border border-default">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        <div>
          <p class="text-xs text-muted">Área POA</p>
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
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-muted">Estado</p>
            <div class="flex items-center gap-1 shrink-0">
              <UButton
                icon="i-lucide-file-down"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Descargar reporte PDF de formulación"
                title="Descargar Formulario 01 (PDF)"
                :loading="descargandoPdf"
                @click="descargarReporteFormulacionPdf"
              />
              <UButton
                icon="i-lucide-eye"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Ver detalle de la formulación"
                @click="isFormulacionDetalleOpen = true"
              />
              <UButton
                icon="i-lucide-history"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Historial de estados"
                title="Historial de estados"
                @click="isFormulacionHistorialOpen = true"
              />
              <UDropdownMenu :items="[menuFormulacionItems]" size="xs">
                <UButton
                  icon="i-lucide-ellipsis-vertical"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Acciones de la formulación"
                />
              </UDropdownMenu>
            </div>
          </div>
          <PoaEstadoBadge
            :estado="contexto.formulacion.poa_estado"
            size="sm"
          />
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
      v-if="!modoAdmin && contexto?.formulacion?.id"
      v-model:open="isModalOpen"
      :resultado="itemToEdit"
      :poa-formulacion-id="contexto.formulacion.id"
      :acps-disponibles="contexto.acps_disponibles || []"
      @guardado="onGuardado"
    />

    <PoaOperacionFormModal
      v-if="!modoAdmin"
      v-model:open="isOperacionModalOpen"
      :operacion="operacionToEdit"
      :resultado-id="operacionResultadoId"
      :resultado-nombre="operacionResultadoNombre"
      :areas-operacion="contexto?.areas_operacion ?? []"
      :area-raiz-id="contexto?.formulacion?.area_id"
      @guardado="cargar"
    />

    <PoaActividadFormModal
      v-if="!modoAdmin"
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

    <PoaFormulacionDetalleModal
      v-if="contexto?.formulacion?.id"
      v-model:open="isFormulacionDetalleOpen"
      :formulacion-id="contexto.formulacion.id"
      :api-resource="modoAdmin ? 'poa-formulacion-admin' : 'poa-formulacion'"
    />

    <PoaFormulacionHistorialEstadosModal
      v-if="contexto?.formulacion?.id"
      v-model:open="isFormulacionHistorialOpen"
      :formulacion-id="contexto.formulacion.id"
      :api-resource="modoAdmin ? 'poa-formulacion-admin' : 'poa-formulacion'"
    />

    <PoaItemHistorialEstadosModal
      v-model:open="isItemHistorialOpen"
      :item-id="itemHistorialId"
      :api-resource="itemHistorialApi"
      :titulo-modal="itemHistorialTitulo"
    />

    <PoaFormulacionCambioEstadoModal
      v-if="!modoAdmin && contexto?.formulacion?.id"
      v-model:open="isEnviarFormulacionOpen"
      :item-id="contexto.formulacion.id"
      :estado-id="POA_FORMULACION_ESTADO_ENVIADO_ID"
      titulo="Enviar formulación"
      descripcion="La formulación pasará al estado Enviado (2). Registre una observación si lo desea."
      confirm-label="Enviar formulación"
      confirm-icon="i-lucide-send"
      success-title="Formulación enviada"
      error-title="No se pudo enviar la formulación"
      @cambiado="onFormulacionEstadoCambiado"
    />

    <PoaFormulacionCambioEstadoModal
      v-if="modoAdmin"
      v-model:open="isAdminEstadoOpen"
      :item-id="adminEstadoItemId"
      :estado-id="adminEstadoDestino"
      :api-resource="adminEstadoApi"
      :titulo="adminEstadoTitulo"
      :descripcion="adminEstadoDescripcion"
      :confirm-label="adminEstadoLabel"
      :confirm-icon="adminEstadoIcon"
      :confirm-color="adminEstadoColor"
      success-title="Estado actualizado"
      @cambiado="onAdminRegistroEstadoCambiado"
    />
  </div>
</template>
