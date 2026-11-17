<script setup lang="ts">
import { ref, onMounted, computed, h, watch } from 'vue'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type {
  SeguimientoActividad,
  SeguimientoActividadContexto,
  SeguimientoActividadListadoResponse,
  SeguimientoValidacionEnvio,
} from '~/types/poa/seguimiento-actividad'
import {
  POA_FORMULACION_ESTADO_ENVIADO_ID,
  POA_FORMULACION_ESTADO_OBSERVADO_ID,
  POA_FORMULACION_ESTADO_VALIDADO_ID,
} from '~/types/poa/formulacion'
import { backendService } from '~/services/backend.service'
import { useProfile } from '~/composables/comun/useProfile'
import AdjuntosModal from '~/components/comun/adjuntos/AdjuntosModal.vue'
import {
  CLASE_CONTENEDOR_ACCIONES_CELDA,
  enriquecerItemMenuAcciones,
  hMenuAccionesTabla,
  META_COLUMNA_ACCIONES_TABLA,
} from '~/utils/shared/acciones-menu'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const PoaEstadoBadge = resolveComponent('PoaEstadoBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()
const route = useRoute()
const { fetchProfile } = useProfile()

const modoAdmin = computed(
  () => String(route.query.modo || '') === 'admin' && Boolean(route.query.seguimiento_id),
)
const seguimientoAdminId = computed(() =>
  typeof route.query.seguimiento_id === 'string' ? route.query.seguimiento_id : '',
)

const loading = ref(true)
const items = ref<SeguimientoActividad[]>([])
const contexto = ref<SeguimientoActividadContexto | null>(null)
const filtroTexto = ref('')
const alertasEnvio = ref<string[]>([])

const isModalOpen = ref(false)
const itemToEdit = ref<SeguimientoActividad | null>(null)
const modalSoloLectura = ref(false)
const isClearOpen = ref(false)
const itemToClear = ref<SeguimientoActividad | null>(null)
const clearing = ref(false)

const isDetalleOpen = ref(false)
const isEnviarOpen = ref(false)
const isHistorialItemOpen = ref(false)
const historialItemId = ref<string | null>(null)
const historialItemApi = ref<string | null>(null)

const isMediosOpen = ref(false)
const mediosItemId = ref<string | null>(null)
const mediosSoloLectura = ref(false)
const mediosTitulo = ref('Medios de Verificación')
const mediosApiResource = computed(() =>
  modoAdmin.value ? 'seguimiento-actividades-admin' : 'seguimiento-actividades',
)

const isAdminEstadoOpen = ref(false)
const adminEstadoItemId = ref<string | null>(null)
const adminEstadoDestino = ref(0)
const adminEstadoTitulo = ref('')
const adminEstadoDescripcion = ref('')
const adminEstadoLabel = ref('')
const adminEstadoIcon = ref('i-lucide-check')
const adminEstadoColor = ref<'primary' | 'success' | 'warning'>('primary')

const permiteEditar = computed(
  () => !modoAdmin.value && contexto.value?.permite_editar !== false,
)

const seguimientoEnviado = computed(
  () => contexto.value?.seguimiento?.estado_id === POA_FORMULACION_ESTADO_ENVIADO_ID,
)

const puedeEnviarPorEstado = computed(() => {
  if (modoAdmin.value) return false
  const s = contexto.value?.seguimiento
  if (!s) return false
  if (s.estado_id === POA_FORMULACION_ESTADO_ENVIADO_ID) return false
  return s.estado_id === 1 || Boolean(s.poa_estado?.permite_enviar || contexto.value?.permite_enviar)
})

const puedeEnviar = computed(
  () => puedeEnviarPorEstado.value && alertasEnvio.value.length === 0,
)

const motivoEnvioDeshabilitado = computed(() => {
  if (modoAdmin.value) return 'Modo administrador: no se envía desde aquí.'
  if (!puedeEnviarPorEstado.value) {
    return 'El estado actual no permite enviar el seguimiento.'
  }
  if (alertasEnvio.value.length > 0) {
    return 'Corrija las observaciones de validación antes de enviar.'
  }
  return undefined
})

const menuSeguimientoItems = computed<DropdownMenuItem[]>(() => {
  if (modoAdmin.value) {
    return [
      {
        label: 'Volver al administrador',
        icon: 'i-lucide-arrow-left',
        onSelect: () => navigateTo('/seguimientos-admin'),
      },
    ]
  }
  return [
    enriquecerItemMenuAcciones(
      {
        label: 'Enviar seguimiento',
        icon: 'i-lucide-send',
        disabled: !puedeEnviar.value,
        onSelect: () => {
          isEnviarOpen.value = true
        },
      },
      motivoEnvioDeshabilitado.value,
    ),
  ]
})

const itemsFiltrados = computed(() => {
  const q = filtroTexto.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((row) => {
    const act = row.poa_actividades
    const blob = [
      act?.descripcion,
      act?.medios,
      act?.poa_operacion?.descripcion,
      act?.poa_operacion?.acp_resultados?.nombre,
      row.descripcion,
      row.justificacion,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return blob.includes(q)
  })
})

const resumen = computed(() => {
  const total = items.value.length
  const conAvance = items.value.filter(
    (i) => i.cant_ejecutada != null || !!i.descripcion?.trim(),
  ).length
  const incumplidos = items.value.filter((i) => {
    if (i.cant_ejecutada == null) return false
    return Number(i.cant_ejecutada) < Number(i.cant_programada)
  }).length
  return { total, conAvance, incumplidos }
})

const abrirAdminEstado = (
  item: SeguimientoActividad,
  estadoId: number,
  opts: {
    titulo: string
    descripcion: string
    label: string
    icon: string
    color: 'primary' | 'success' | 'warning'
  },
) => {
  adminEstadoItemId.value = item.id
  adminEstadoDestino.value = estadoId
  adminEstadoTitulo.value = opts.titulo
  adminEstadoDescripcion.value = opts.descripcion
  adminEstadoLabel.value = opts.label
  adminEstadoIcon.value = opts.icon
  adminEstadoColor.value = opts.color
  isAdminEstadoOpen.value = true
}

const abrirMediosVerificacion = (item: SeguimientoActividad, soloLectura: boolean) => {
  const act = item.poa_actividades
  mediosItemId.value = item.id
  mediosSoloLectura.value = soloLectura
  mediosTitulo.value = act
    ? `Medios de Verificación — ${act.numero}. ${act.descripcion || 'Actividad'}`
    : 'Medios de Verificación'
  isMediosOpen.value = true
}

const buildMenuItem = (item: SeguimientoActividad): DropdownMenuItem[] => {
  if (modoAdmin.value) {
    const activo = seguimientoEnviado.value
    const motivo = activo
      ? undefined
      : 'El informe debe estar Enviado para validar u observar.'
    const yaValidado = item.estado_id === POA_FORMULACION_ESTADO_VALIDADO_ID
    const yaObservado = item.estado_id === POA_FORMULACION_ESTADO_OBSERVADO_ID
    return [
      {
        label: 'Medios de Verificación',
        icon: 'i-lucide-paperclip',
        onSelect: () => abrirMediosVerificacion(item, true),
      },
      enriquecerItemMenuAcciones(
        {
          label: 'Validar',
          icon: 'i-lucide-badge-check',
          disabled: !activo || yaValidado,
          onSelect: () =>
            abrirAdminEstado(item, POA_FORMULACION_ESTADO_VALIDADO_ID, {
              titulo: 'Validar avance',
              descripcion: 'El ítem pasará al estado Validado (5).',
              label: 'Validar',
              icon: 'i-lucide-badge-check',
              color: 'success',
            }),
        },
        !activo ? motivo : yaValidado ? 'El ítem ya está validado.' : undefined,
      ),
      enriquecerItemMenuAcciones(
        {
          label: 'Observar',
          icon: 'i-lucide-message-square-warning',
          disabled: !activo || yaObservado,
          onSelect: () =>
            abrirAdminEstado(item, POA_FORMULACION_ESTADO_OBSERVADO_ID, {
              titulo: 'Observar avance',
              descripcion: 'El ítem pasará al estado Observado (4).',
              label: 'Observar',
              icon: 'i-lucide-message-square-warning',
              color: 'warning',
            }),
        },
        !activo ? motivo : yaObservado ? 'El ítem ya está observado.' : undefined,
      ),
    ]
  }

  return [
    enriquecerItemMenuAcciones(
      {
        label: 'Registrar avance',
        icon: 'i-lucide-pencil',
        disabled: !permiteEditar.value,
        onSelect: () => handleEditar(item),
      },
      !permiteEditar.value
        ? 'El estado del informe no permite editar avances.'
        : undefined,
    ),
    {
      label: 'Medios de Verificación',
      icon: 'i-lucide-paperclip',
      onSelect: () => abrirMediosVerificacion(item, !permiteEditar.value),
    },
    enriquecerItemMenuAcciones(
      {
        label: 'Limpiar avance',
        icon: 'i-lucide-eraser',
        disabled:
          !permiteEditar.value
          || (item.cant_ejecutada == null
            && !item.descripcion?.trim()
            && !item.justificacion?.trim()),
        onSelect: () => handleConfirmarLimpiar(item),
      },
      !permiteEditar.value
        ? 'El estado del informe no permite editar avances.'
        : undefined,
    ),
  ]
}

const columns: TableColumn<SeguimientoActividad>[] = [
  {
    id: 'actividad',
    header: 'Actividad (formulación)',
    cell: ({ row }) => {
      const a = row.original.poa_actividades
      return h('div', { class: 'min-w-0 max-w-md space-y-0.5' }, [
        h(
          'p',
          { class: 'font-semibold text-highlighted line-clamp-2' },
          a ? `${a.numero}. ${a.descripcion || '—'}` : '—',
        ),
        h(
          'p',
          { class: 'text-[11px] text-muted line-clamp-1' },
          a?.medios?.trim()
            ? `Medios: ${a.medios}`
            : 'Sin medios registrados',
        ),
      ])
    },
  },
  {
    id: 'pond',
    header: 'Pond.',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-sm font-mono' },
        `${row.original.poa_actividades?.ponderacion ?? '—'}%`,
      ),
  },
  {
    id: 'programada',
    header: 'Prog.',
    cell: ({ row }) => {
      const pct = row.original.poa_actividades?.porcentual
      return h(
        'span',
        { class: 'text-sm font-mono' },
        `${row.original.cant_programada}${pct ? '%' : ''}`,
      )
    },
  },
  {
    id: 'ejecutada',
    header: 'Ejec.',
    cell: ({ row }) => {
      const pct = row.original.poa_actividades?.porcentual
      const v = row.original.cant_ejecutada
      if (v == null) {
        return h('span', { class: 'text-xs text-muted' }, '—')
      }
      const bajo = Number(v) < Number(row.original.cant_programada)
      return h(
        UBadge,
        {
          color: bajo ? 'warning' : 'success',
          variant: 'subtle',
          size: 'xs',
          class: 'font-mono',
        },
        () => `${v}${pct ? '%' : ''}`,
      )
    },
  },
  {
    id: 'avance',
    header: 'Avance / justificación',
    cell: ({ row }) => {
      const d = row.original.descripcion?.trim()
      const j = row.original.justificacion?.trim()
      return h('div', { class: 'max-w-xs space-y-0.5 text-xs' }, [
        h('p', { class: 'line-clamp-2 text-default' }, d || 'Sin descripción'),
        j
          ? h('p', { class: 'line-clamp-1 text-warning' }, `Justif.: ${j}`)
          : null,
      ])
    },
  },
  {
    id: 'estado',
    header: 'Estado',
    cell: ({ row }) =>
      h(PoaEstadoBadge, {
        estado: row.original.poa_estado,
      }),
  },
  {
    id: 'acciones',
    header: 'Acciones',
    meta: META_COLUMNA_ACCIONES_TABLA,
    cell: ({ row }) => {
      const item = row.original
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
        h(UButton, {
          icon: 'i-lucide-history',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          title: 'Historial de estados',
          onClick: () => {
            historialItemId.value = item.id
            historialItemApi.value = modoAdmin.value
              ? 'seguimiento-actividades-admin'
              : 'seguimiento-actividades'
            isHistorialItemOpen.value = true
          },
        }),
        hMenuAccionesTabla(UDropdownMenu, UButton, buildMenuItem(item)),
      ])
    },
  },
]

const cargarValidacionEnvio = async () => {
  const id = contexto.value?.seguimiento?.id
  if (!id || modoAdmin.value) {
    alertasEnvio.value = []
    return
  }
  try {
    const res = await backendService.getById<SeguimientoValidacionEnvio>(
      'seguimiento',
      `${id}/validacion-envio`,
    )
    const data =
      (res as { data?: SeguimientoValidacionEnvio })?.data ||
      (res as SeguimientoValidacionEnvio)
    alertasEnvio.value = data.observaciones ?? []
  } catch {
    alertasEnvio.value = []
  }
}

const cargar = async () => {
  loading.value = true
  try {
    await fetchProfile()
    if (modoAdmin.value && seguimientoAdminId.value) {
      const res = await backendService.getById<SeguimientoActividadListadoResponse>(
        'seguimiento-admin',
        `${seguimientoAdminId.value}/contexto`,
      )
      const data =
        (res as { data?: SeguimientoActividadListadoResponse })?.data ||
        (res as SeguimientoActividadListadoResponse)
      contexto.value = { ...data.contexto, modo_admin: true }
      items.value = data.datos || []
    } else {
      const res = await backendService.get<SeguimientoActividadListadoResponse>(
        'seguimiento-actividades/mi',
      )
      const data =
        (res as { data?: SeguimientoActividadListadoResponse })?.data ||
        (res as SeguimientoActividadListadoResponse)
      contexto.value = data.contexto
      items.value = data.datos || []
    }
    await cargarValidacionEnvio()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    contexto.value = null
    items.value = []
    toast.add({
      title: modoAdmin.value
        ? 'No se pudo cargar el seguimiento (admin)'
        : 'No se pudo cargar el seguimiento',
      description:
        err?.data?.message ||
        err?.message ||
        'Verifique área POA, formulación y configuración.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loading.value = false
  }
}

const handleVerDetalle = (item: SeguimientoActividad) => {
  itemToEdit.value = item
  modalSoloLectura.value = true
  isModalOpen.value = true
}

const handleEditar = (item: SeguimientoActividad) => {
  itemToEdit.value = item
  modalSoloLectura.value = false
  isModalOpen.value = true
}

const handleConfirmarLimpiar = (item: SeguimientoActividad) => {
  itemToClear.value = item
  isClearOpen.value = true
}

const confirmarLimpiar = async () => {
  if (!itemToClear.value?.id) return
  clearing.value = true
  try {
    await backendService.delete('seguimiento-actividades', itemToClear.value.id)
    toast.add({
      title: 'Avance limpiado',
      description: 'Se reiniciaron descripción, justificación y cantidad ejecutada.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    isClearOpen.value = false
    itemToClear.value = null
    await cargar()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo limpiar',
      description: err?.data?.message || err?.message,
      color: 'error',
    })
  } finally {
    clearing.value = false
  }
}

watch(
  () => [route.query.modo, route.query.seguimiento_id],
  () => {
    void cargar()
  },
)

onMounted(() => {
  void cargar()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="modoAdmin ? 'Seguimiento (administrador)' : 'Seguimiento de actividades'"
      :description="modoAdmin
        ? 'Revise, valide u observe los avances del trimestre informado.'
        : 'Registre la ejecución del trimestre activo y envíe el informe de seguimiento.'"
    >
      <template #actions>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="soft"
          label="Actualizar"
          :loading="loading"
          @click="cargar"
        />
      </template>
    </PageHeader>

    <USkeleton v-if="loading" class="h-28 w-full rounded-md" />

    <template v-else-if="contexto">
      <UCard class="border border-default">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p class="text-xs text-muted">Área POA</p>
            <p class="font-semibold">
              {{ contexto.area_cargo.nombre }}
              <span
                v-if="contexto.area_cargo.codigo"
                class="text-muted font-mono text-xs"
              >
                [{{ contexto.area_cargo.codigo }}]
              </span>
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">Formulación</p>
            <p class="font-semibold line-clamp-2">{{ contexto.formulacion.nombre }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">Informe / trimestre</p>
            <p class="font-semibold">
              T{{ contexto.trimestre_activo }}
              <span class="text-muted font-normal text-xs">
                — {{ contexto.seguimiento.nombre }}
              </span>
            </p>
          </div>
          <div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-muted">Estado</p>
              <div class="flex items-center gap-1 shrink-0">
                <UButton
                  icon="i-lucide-eye"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Ver detalle del seguimiento"
                  @click="isDetalleOpen = true"
                />
                <UDropdownMenu :items="menuSeguimientoItems">
                  <UButton
                    icon="i-lucide-ellipsis-vertical"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    aria-label="Acciones del seguimiento"
                  />
                </UDropdownMenu>
              </div>
            </div>
            <PoaEstadoBadge :estado="contexto.seguimiento.poa_estado" />
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-3 text-xs text-muted">
          <span>{{ resumen.total }} actividad(es)</span>
          <span>· {{ resumen.conAvance }} con avance</span>
          <span v-if="resumen.incumplidos" class="text-warning">
            · {{ resumen.incumplidos }} bajo lo programado
          </span>
        </div>
      </UCard>

      <UAlert
        v-if="!modoAdmin && alertasEnvio.length"
        color="warning"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Observaciones antes de enviar"
        :description="alertasEnvio.join(' ')"
      />

      <AppFilter>
        <AppFilterItem label="Buscar">
          <UInput
            v-model="filtroTexto"
            icon="i-lucide-search"
            placeholder="Actividad, medios, avance..."
            class="w-full sm:w-72"
          />
        </AppFilterItem>
      </AppFilter>

      <CorTable
        :columns="columns"
        :data="itemsFiltrados"
        :loading="loading"
        :total="itemsFiltrados.length"
        :page="1"
        :page-size="Math.max(itemsFiltrados.length, 10)"
      />
    </template>

    <UAlert
      v-else
      color="warning"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      title="Sin seguimiento disponible"
      description="Asigne un área POA al usuario y complete la formulación de la gestión vigente."
    />

    <SeguimientoActividadFormModal
      v-model:open="isModalOpen"
      :item="itemToEdit"
      :permite-editar="modalSoloLectura ? false : permiteEditar"
      @guardado="cargar"
    />

    <AdjuntosModal
      v-model:open="isMediosOpen"
      :title="mediosTitulo"
      :description="mediosSoloLectura
        ? 'Documentos que respaldan el avance registrado en el trimestre.'
        : 'Suba los documentos que respaldan el avance registrado en el trimestre.'"
      :api-resource="mediosApiResource"
      :item-id="mediosItemId"
      :solo-lectura="mediosSoloLectura"
    />

    <SeguimientoDetalleModal
      v-if="contexto?.seguimiento?.id"
      v-model:open="isDetalleOpen"
      :seguimiento-id="contexto.seguimiento.id"
      :api-resource="modoAdmin ? 'seguimiento-admin' : 'seguimiento'"
    />

    <PoaFormulacionCambioEstadoModal
      v-if="!modoAdmin && contexto?.seguimiento?.id"
      v-model:open="isEnviarOpen"
      :item-id="contexto.seguimiento.id"
      :estado-id="POA_FORMULACION_ESTADO_ENVIADO_ID"
      api-resource="seguimiento"
      titulo="Enviar seguimiento"
      descripcion="El informe pasará al estado Enviado (2). Registre una observación si lo desea."
      confirm-label="Enviar seguimiento"
      confirm-icon="i-lucide-send"
      success-title="Seguimiento enviado"
      error-title="No se pudo enviar el seguimiento"
      @cambiado="cargar"
    />

    <PoaFormulacionCambioEstadoModal
      v-if="modoAdmin"
      v-model:open="isAdminEstadoOpen"
      :item-id="adminEstadoItemId"
      :estado-id="adminEstadoDestino"
      api-resource="seguimiento-actividades-admin"
      :titulo="adminEstadoTitulo"
      :descripcion="adminEstadoDescripcion"
      :confirm-label="adminEstadoLabel"
      :confirm-icon="adminEstadoIcon"
      :confirm-color="adminEstadoColor"
      success-title="Estado actualizado"
      @cambiado="cargar"
    />

    <PoaItemHistorialEstadosModal
      v-model:open="isHistorialItemOpen"
      :item-id="historialItemId"
      :api-resource="historialItemApi"
      titulo-modal="Historial — avance de actividad"
    />

    <UModal
      v-model:open="isClearOpen"
      title="Limpiar avance"
      description="Se borrarán descripción, justificación y cantidad ejecutada. La cantidad programada se conserva."
    >
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            :disabled="clearing"
            @click="isClearOpen = false"
          />
          <UButton
            label="Limpiar"
            color="warning"
            icon="i-lucide-eraser"
            :loading="clearing"
            @click="confirmarLimpiar"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
