<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import type { NavigationMenuItem, TableColumn } from '@nuxt/ui'
import type { Correspondencia } from '~/types/correspondencia'
import type {
  Derivacion,
  DestinatarioCopiaConDerivacion,
  FiltroDerivacion,
  RespuestaBusquedaDerivacion,
} from '~/types/derivacion'
import { EstadoDerivacionEnum, estadoPermite } from '~/types/estado'
import { backendService } from '~/services/backend.service'
import CorrespondenciaDetalleModal from '~/components/correspondencia/CorrespondenciaDetalleModal.vue'
import DerivacionFormModal from '~/components/correspondencia/DerivacionFormModal.vue'
import CambioEstadoDerivacionModal from '~/components/correspondencia/CambioEstadoDerivacionModal.vue'
import EstadoLogTimelineModal from '~/components/correspondencia/EstadoLogTimelineModal.vue'
import CorrespondenciaAdjuntosModal from '~/components/correspondencia/CorrespondenciaAdjuntosModal.vue'
import CorTable from '~/components/CorTable.vue'
import {
  correspondenciaPuedeDerivar,
  MENSAJE_SIN_NUMERACION_HR,
} from '~/utils/correspondencia'

const props = defineProps<{
  modo: 'salida' | 'ingreso' | 'con_copia'
  titulo: string
  descripcion: string
  icono: string
}>()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')
const UNavigationMenu = resolveComponent('UNavigationMenu')

const toast = useToast()
const { profile, cargoOrigen, resolveCargoOrigenId } = useProfile()
const { apiBaseUrl, apiPublicUrl } = useApiUrls()

const loading = ref(false)
const items = ref<Array<Derivacion | DestinatarioCopiaConDerivacion>>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const searchCriterio = ref('')

const isDetalleOpen = ref(false)
const detalleDocumentoId = ref<string | null>(null)

const isDerivacionOpen = ref(false)
const correspToDerivar = ref<Correspondencia | null>(null)

const isCambioEstadoOpen = ref(false)
const cambioDerivacionId = ref<string | null>(null)
const cambioEstadoId = ref<number | null>(null)
const cambioTitulo = ref('')
const cambioDescripcion = ref('')
const cambioConfirmLabel = ref('Confirmar')
const cambioConfirmIcon = ref('i-lucide-check')
const cambioConfirmColor = ref<'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info'>('primary')

const isEstadoLogOpen = ref(false)
const estadoLogDocumentoId = ref<string | null>(null)

const isAdjuntosOpen = ref(false)
const correspAdjuntos = ref<Correspondencia | null>(null)

const showEditor = ref(false)
const editorKey = ref('')
const editorUrl = ref('')
const editorCallbackUrl = ref('')
const editorTitle = ref('')
const editorCorresp = ref<Correspondencia | null>(null)
const editorReadOnly = ref(true)
const abriendoEditorId = ref<string | null>(null)

const formatFecha = (valor?: string | null) => {
  if (!valor) return '—'
  try {
    return new Date(valor).toLocaleString('es-BO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return valor
  }
}

const esConCopia = computed(() => props.modo === 'con_copia')
const esIngreso = computed(() => props.modo === 'ingreso')
const esSalida = computed(() => props.modo === 'salida')
/** Salida e ingreso: sin columna Instrucción y tabla compacta */
const tablaCompacta = computed(() => esSalida.value || esIngreso.value)
/** Transferencia por baja: solo parámetro del cargo (no flags permite_* del estado). */
const puedeTransferirPorBaja = computed(
  () => cargoOrigen.value?.activa_transferencia === true,
)

const derivacionDeFila = (row: Derivacion | DestinatarioCopiaConDerivacion): Derivacion | null => {
  if (esConCopia.value) {
    return (row as DestinatarioCopiaConDerivacion).derivaciones || null
  }
  return row as Derivacion
}

const leidoDeFila = (row: Derivacion | DestinatarioCopiaConDerivacion): boolean => {
  if (esConCopia.value) {
    return Boolean((row as DestinatarioCopiaConDerivacion).leido)
  }
  return Boolean((row as Derivacion).leido)
}

const documentoIdDeFila = (row: Derivacion | DestinatarioCopiaConDerivacion): string | null => {
  const d = derivacionDeFila(row)
  return d?.documento_id || d?.correspondencia?.id || null
}

const correspondenciaDeFila = (
  row: Derivacion | DestinatarioCopiaConDerivacion,
): Correspondencia | null => {
  return derivacionDeFila(row)?.correspondencia || null
}

const textoNoLeido = (leido: boolean, base: string) =>
  leido
    ? `${base} text-muted`
    : `${base} text-gray-950 dark:text-white font-semibold`

const obtenerRutaDocumento = (c: Correspondencia | null | undefined): string =>
  (c?.url_documento || c?.contenido)?.trim() || ''

const tieneDocumento = (c: Correspondencia | null | undefined): boolean =>
  Boolean(obtenerRutaDocumento(c))

const buildEditorKey = (correspId: string) =>
  `c${correspId.replace(/-/g, '')}_${Date.now()}`

const abrirEditorOnlyOffice = async (corresp: Correspondencia, storagePath: string) => {
  abriendoEditorId.value = corresp.id
  try {
    const key = buildEditorKey(corresp.id)
    const response = await $fetch<{
      fileName: string
      key: string
      documentUrl?: string
      callbackUrl?: string
    }>(`${apiBaseUrl}/documents/open-storage`, {
      method: 'POST',
      body: {
        key,
        storagePath,
        correspondenciaId: corresp.id,
      },
    })

    editorKey.value = response.key || key
    editorUrl.value =
      response.documentUrl ||
      `${apiPublicUrl}/documents/file/${encodeURIComponent(response.fileName)}`
    editorCallbackUrl.value =
      response.callbackUrl || `${apiPublicUrl}/documents/callback`
    editorTitle.value = `Oficio ${corresp.nro}-${corresp.gestion}.docx`
    editorCorresp.value = corresp
    editorReadOnly.value = true
    showEditor.value = true
  } finally {
    abriendoEditorId.value = null
  }
}

const handleVerDocumento = async (row: Derivacion | DestinatarioCopiaConDerivacion) => {
  const corresp = correspondenciaDeFila(row)
  if (!corresp?.id) return
  const path = obtenerRutaDocumento(corresp)
  if (!path) {
    toast.add({
      title: 'Sin documento',
      description: 'Esta correspondencia aún no tiene documento generado.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }
  try {
    await abrirEditorOnlyOffice(corresp, path)
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo abrir el documento',
      description: err?.data?.message || err?.message || 'Error al preparar OnlyOffice.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

const cerrarEditorOnlyOffice = () => {
  showEditor.value = false
  editorKey.value = ''
  editorUrl.value = ''
  editorCallbackUrl.value = ''
  editorCorresp.value = null
}

const abrirDerivar = (row: Derivacion | DestinatarioCopiaConDerivacion) => {
  const corresp = correspondenciaDeFila(row)
  if (!corresp) return
  if (!correspondenciaPuedeDerivar(corresp)) {
    toast.add({
      title: 'No se puede derivar',
      description: MENSAJE_SIN_NUMERACION_HR,
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }
  correspToDerivar.value = corresp
  isDerivacionOpen.value = true
}

const abrirCambioEstado = (
  row: Derivacion | DestinatarioCopiaConDerivacion,
  estadoId: number,
  opts: {
    titulo: string
    descripcion?: string
    confirmLabel?: string
    confirmIcon?: string
    confirmColor?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info'
  },
) => {
  const d = derivacionDeFila(row)
  if (!d?.id) return
  cambioDerivacionId.value = d.id
  cambioEstadoId.value = estadoId
  cambioTitulo.value = opts.titulo
  cambioDescripcion.value = opts.descripcion || ''
  cambioConfirmLabel.value = opts.confirmLabel || 'Confirmar'
  cambioConfirmIcon.value = opts.confirmIcon || 'i-lucide-check'
  cambioConfirmColor.value = opts.confirmColor || 'primary'
  isCambioEstadoOpen.value = true
}

const abrirRecepcionar = (row: Derivacion | DestinatarioCopiaConDerivacion) => {
  abrirCambioEstado(row, EstadoDerivacionEnum.RECEPCIONADO, {
    titulo: 'Recepcionar derivación',
    descripcion: 'Confirme la recepción del documento. Se registrará en el historial de estados.',
    confirmLabel: 'Recepcionar',
    confirmIcon: 'i-lucide-inbox',
    confirmColor: 'success',
  })
}

const abrirArchivar = (row: Derivacion | DestinatarioCopiaConDerivacion) => {
  abrirCambioEstado(row, EstadoDerivacionEnum.ARCHIVADO, {
    titulo: 'Archivar derivación',
    descripcion: 'El documento pasará a estado archivado.',
    confirmLabel: 'Archivar',
    confirmIcon: 'i-lucide-archive',
    confirmColor: 'warning',
  })
}

const abrirTransferirBaja = (row: Derivacion | DestinatarioCopiaConDerivacion) => {
  abrirCambioEstado(row, EstadoDerivacionEnum.TRANSFERIDO_BAJA, {
    titulo: 'Transferir por baja',
    descripcion: 'Registre la transferencia por baja del documento.',
    confirmLabel: 'Transferir',
    confirmIcon: 'i-lucide-user-minus',
    confirmColor: 'error',
  })
}

const abrirEstadoLog = (row: Derivacion | DestinatarioCopiaConDerivacion) => {
  const docId = documentoIdDeFila(row)
  if (!docId) return
  estadoLogDocumentoId.value = docId
  isEstadoLogOpen.value = true
}

const abrirAdjuntos = (row: Derivacion | DestinatarioCopiaConDerivacion) => {
  const corresp = correspondenciaDeFila(row)
  if (!corresp?.id) return
  correspAdjuntos.value = corresp
  isAdjuntosOpen.value = true
}

const wrapAccionesMenu = (children: NavigationMenuItem[]): NavigationMenuItem[][] => [
  [{
    label: 'Acciones',
    icon: 'i-lucide-ellipsis-vertical',
    tooltip: { text: 'Acciones' },
    children,
  }],
]

const hAccionesNavigationMenu = (items: NavigationMenuItem[][]) =>
  h(UNavigationMenu, {
    items,
    orientation: 'vertical',
    collapsed: true,
    popover: {
      mode: 'click',
      content: { side: 'bottom', align: 'end', collisionPadding: 8 },
    },
    tooltip: false,
    class: 'inline-flex w-auto shrink-0',
    ui: {
      root: 'w-auto',
      list: 'w-auto',
      link: 'px-1.5 py-1 justify-center',
      linkLeadingIcon: 'size-4',
    },
  })

const buildDerivacionAccionesMenu = (
  original: Derivacion | DestinatarioCopiaConDerivacion,
): NavigationMenuItem[][] => {
  const docId = documentoIdDeFila(original)
  const d = derivacionDeFila(original)
  const corresp = correspondenciaDeFila(original)
  const estado = d?.estado

  const children: NavigationMenuItem[] = [
    {
      label: 'Historial de estados',
      icon: 'i-lucide-history',
      disabled: !docId,
      onSelect: (e) => {
        e.preventDefault()
        abrirEstadoLog(original)
      },
    },
    {
      label: 'Adjuntos',
      icon: 'i-lucide-paperclip',
      disabled: !docId,
      onSelect: (e) => {
        e.preventDefault()
        abrirAdjuntos(original)
      },
    },
  ]

  if (esIngreso.value) {
    if (estadoPermite(estado, 'permite_editar') && tieneDocumento(corresp)) {
      children.push({
        label: abriendoEditorId.value === corresp?.id
          ? 'Abriendo documento…'
          : 'Ver documento (solo lectura)',
        icon: 'i-lucide-file-text',
        disabled: abriendoEditorId.value === corresp?.id,
        onSelect: (e) => {
          e.preventDefault()
          void handleVerDocumento(original)
        },
      })
    }

    if (estadoPermite(estado, 'permite_recepcionar')) {
      children.push({
        label: 'Recepcionar',
        icon: 'i-lucide-inbox',
        onSelect: (e) => {
          e.preventDefault()
          abrirRecepcionar(original)
        },
      })
    }

    if (estadoPermite(estado, 'permite_derivar')) {
      const correspDerivar = correspondenciaDeFila(original)
      const puedeDerivar = correspDerivar && correspondenciaPuedeDerivar(correspDerivar)
      children.push({
        label: 'Derivar',
        icon: 'i-lucide-share-2',
        disabled: !puedeDerivar,
        onSelect: (e) => {
          e.preventDefault()
          abrirDerivar(original)
        },
      })
    }

    if (estadoPermite(estado, 'permite_archivar')) {
      children.push({
        label: 'Archivar',
        icon: 'i-lucide-archive',
        onSelect: (e) => {
          e.preventDefault()
          abrirArchivar(original)
        },
      })
    }

    if (
      puedeTransferirPorBaja.value &&
      d?.estado_id !== EstadoDerivacionEnum.TRANSFERIDO_BAJA
    ) {
      children.push({
        label: 'Transferir por baja',
        icon: 'i-lucide-user-minus',
        class: 'text-error',
        onSelect: (e) => {
          e.preventDefault()
          abrirTransferirBaja(original)
        },
      })
    }
  }

  return wrapAccionesMenu(children)
}

const columns = computed<TableColumn<Derivacion | DestinatarioCopiaConDerivacion>[]>(() => {
  const compacto = tablaCompacta.value

  const cols: TableColumn<Derivacion | DestinatarioCopiaConDerivacion>[] = [
    {
      id: 'documento',
      header: compacto ? 'Documento' : 'Documento / Referencia',
      cell: ({ row }) => {
        const leido = leidoDeFila(row.original)
        const corresp = correspondenciaDeFila(row.original)
        if (!corresp) {
          return h('span', { class: 'text-xs text-muted' }, '—')
        }
        return h(
          'div',
          {
            class: [
              'flex flex-col gap-0.5 min-w-0 pl-2 border-l-2',
              leido ? 'border-transparent' : 'border-primary-600',
            ],
          },
          [
            h(
              'span',
              { class: textoNoLeido(leido, 'text-[11px] font-mono') },
              `Nº ${corresp.nro}/${corresp.gestion}`,
            ),
            h(
              'span',
              {
                class: textoNoLeido(
                  leido,
                  compacto
                    ? 'text-[11px] truncate block'
                    : 'text-sm truncate max-w-md',
                ),
                title: corresp.referencia || '',
              },
              corresp.referencia || 'Sin referencia',
            ),
            !compacto && corresp.proceso
              ? h('span', { class: 'text-[11px] text-muted truncate' }, corresp.proceso.nombre)
              : null,
          ],
        )
      },
    },
    {
      id: 'destinatario',
      header: props.modo === 'salida'
        ? 'Destinatario'
        : props.modo === 'ingreso'
          ? (compacto ? 'Origen / Dest.' : 'Remitente / Destino')
          : 'Copia a mí',
      cell: ({ row }) => {
        const leido = leidoDeFila(row.original)
        if (esConCopia.value) {
          const cc = row.original as DestinatarioCopiaConDerivacion
          return h(
            'span',
            {
              class: textoNoLeido(leido, 'text-[11px] truncate block'),
              title: cc.nombre || cc.cargos?.nombre || '',
            },
            cc.nombre || cc.cargos?.nombre || '—',
          )
        }
        const d = row.original as Derivacion
        return h('div', { class: 'flex flex-col text-[11px] gap-0.5 min-w-0' }, [
          h(
            'span',
            {
              class: `${textoNoLeido(leido, '')} truncate`,
              title: d.nombre || '',
            },
            d.nombre || '—',
          ),
          h(
            'span',
            { class: 'text-[10px] text-muted truncate', title: d.codificador?.nombre || '' },
            d.codificador?.nombre || '',
          ),
        ])
      },
    },
  ]

  if (!compacto) {
    cols.push({
      accessorKey: 'instruccion',
      header: 'Instrucción',
      cell: ({ row }) => {
        const leido = leidoDeFila(row.original)
        const texto = derivacionDeFila(row.original)?.instruccion
        return h(
          'span',
          {
            class: textoNoLeido(leido, 'text-xs line-clamp-2 max-w-xs'),
            title: texto || '',
          },
          texto || '—',
        )
      },
    })
  }

  cols.push(
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const estado = derivacionDeFila(row.original)?.estado
        if (!estado) {
          return h('span', { class: 'text-xs text-muted' }, '—')
        }
        const color =
          estado.id === EstadoDerivacionEnum.ARCHIVADO
            ? 'neutral'
            : estado.id === EstadoDerivacionEnum.RECEPCIONADO
              ? 'success'
              : estado.id === EstadoDerivacionEnum.TRANSFERIDO_BAJA
                ? 'error'
                : 'warning'
        return h(
          UBadge,
          { color, variant: 'subtle', size: 'xs' },
          () => estado.nombre,
        )
      },
    },
    {
      id: 'fecha',
      header: compacto ? 'Fecha' : 'Fecha envío',
      cell: ({ row }) => {
        const leido = leidoDeFila(row.original)
        const fecha = derivacionDeFila(row.original)?.fecha_envio
        return h(
          'span',
          { class: textoNoLeido(leido, 'text-[10px] font-mono whitespace-nowrap') },
          formatFecha(fecha),
        )
      },
    },
    {
      id: 'leido',
      header: compacto ? 'Lect.' : 'Lectura',
      cell: ({ row }) => {
        const leido = leidoDeFila(row.original)
        return h(
          UBadge,
          {
            color: leido ? 'success' : 'neutral',
            variant: leido ? 'subtle' : 'solid',
            size: 'xs',
          },
          () => (compacto ? (leido ? 'Sí' : 'No') : (leido ? 'Leído' : 'No leído')),
        )
      },
    },
    {
      id: 'acciones',
      header: compacto ? '' : 'Acciones',
      cell: ({ row }) => {
        const original = row.original
        const docId = documentoIdDeFila(original)

        return h('div', { class: 'flex items-center justify-end gap-1 shrink-0' }, [
          h(UButton, {
            icon: 'i-lucide-eye',
            color: 'neutral',
            variant: 'ghost',
            size: 'xs',
            title: 'Ver detalle',
            disabled: !docId,
            onClick: () => {
              if (!docId) return
              detalleDocumentoId.value = docId
              isDetalleOpen.value = true
            },
          }),
          hAccionesNavigationMenu(buildDerivacionAccionesMenu(original)),
        ])
      },
    },
  )

  return cols
})

const fetchItems = async () => {
  loading.value = true
  try {
    const filtro: FiltroDerivacion = {
      modo: props.modo,
      pagina: page.value,
      limite: pageSize.value,
      criterio: searchCriterio.value.trim() || undefined,
      cargo_id: resolveCargoOrigenId() || undefined,
    }
    const res = await backendService.post<RespuestaBusquedaDerivacion>('derivaciones/buscar', filtro)
    const data = ((res as { data?: RespuestaBusquedaDerivacion })?.data || res) as RespuestaBusquedaDerivacion
    items.value = data.items || []
    total.value = data.total || 0
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'Error al cargar',
      description: err?.data?.message || err?.message || 'No se pudieron cargar las derivaciones.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const onSearchInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    fetchItems()
  }, 350)
}

onMounted(() => {
  fetchItems()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="titulo" :description="descripcion">
      <template #actions>
        <div class="flex items-center gap-2 text-primary-600 dark:text-primary-400">
          <UIcon :name="icono" class="size-6" />
        </div>
      </template>
    </PageHeader>

    <AppFilter>
      <AppFilterItem label="Búsqueda" min-w="320px" flex1>
        <UInput
          v-model="searchCriterio"
          icon="i-lucide-search"
          placeholder="Buscar por referencia, instrucción..."
          variant="ghost"
          class="w-full"
          @update:model-value="onSearchInput"
        />
      </AppFilterItem>
    </AppFilter>

    <div
      class="derivacion-bandeja-tabla min-w-0"
      :class="{ 'derivacion-bandeja-tabla--compacta': tablaCompacta }"
    >
      <CorTable
        :columns="columns"
        :data="items"
        :loading="loading"
        :total="total"
        v-model:page="page"
        v-model:page-size="pageSize"
        @update:page="fetchItems"
        @update:page-size="fetchItems"
      />
    </div>

    <CorrespondenciaDetalleModal
      v-model:open="isDetalleOpen"
      :correspondencia-id="detalleDocumentoId"
      @leido="fetchItems"
    />

    <DerivacionFormModal
      v-model:open="isDerivacionOpen"
      :correspondencia="correspToDerivar"
      @derivado="fetchItems"
    />

    <CambioEstadoDerivacionModal
      v-model:open="isCambioEstadoOpen"
      :derivacion-id="cambioDerivacionId"
      :estado-id="cambioEstadoId"
      :titulo="cambioTitulo"
      :descripcion="cambioDescripcion"
      :confirm-label="cambioConfirmLabel"
      :confirm-icon="cambioConfirmIcon"
      :confirm-color="cambioConfirmColor"
      @cambiado="fetchItems"
    />

    <EstadoLogTimelineModal
      v-model:open="isEstadoLogOpen"
      :documento-id="estadoLogDocumentoId"
    />

    <CorrespondenciaAdjuntosModal
      v-model:open="isAdjuntosOpen"
      :correspondencia="correspAdjuntos"
      :solo-lectura="true"
    />

    <UModal
      v-model:open="showEditor"
      fullscreen
      :ui="{ content: 'h-screen w-screen max-w-none rounded-none' }"
      @update:open="(v: boolean) => { if (!v) cerrarEditorOnlyOffice() }"
    >
      <template #content>
        <div class="flex flex-col h-full w-full bg-white dark:bg-gray-950">
          <div class="flex items-center justify-between px-4 py-3 border-b border-default shrink-0">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-highlighted truncate">
                  {{ editorTitle }}
                </h3>
                <UBadge color="warning" variant="subtle" size="xs">
                  Solo Lectura
                </UBadge>
              </div>
              <p v-if="editorCorresp" class="text-xs text-muted truncate">
                Nº {{ editorCorresp.nro }}/{{ editorCorresp.gestion }} — {{ editorCorresp.referencia }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              label="Cerrar"
              @click="cerrarEditorOnlyOffice"
            />
          </div>
          <div class="flex-1 w-full overflow-hidden min-h-0">
            <OnlyOfficeEditor
              v-if="showEditor && editorKey && editorUrl"
              :key="editorKey"
              :document-key="editorKey"
              :document-url="editorUrl"
              :callback-url="editorCallbackUrl"
              :title="editorTitle"
              :read-only="true"
              :user-id="profile?.id || 'uid-1'"
              :user-name="profile?.nombre_completo || 'Usuario'"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* Salida e ingreso: tabla fija, sin Instrucción */
.derivacion-bandeja-tabla--compacta :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.derivacion-bandeja-tabla--compacta :deep(thead th:nth-child(1)),
.derivacion-bandeja-tabla--compacta :deep(tbody td:nth-child(1)) {
  width: 24%;
}

.derivacion-bandeja-tabla--compacta :deep(thead th:nth-child(2)),
.derivacion-bandeja-tabla--compacta :deep(tbody td:nth-child(2)) {
  width: 24%;
}

.derivacion-bandeja-tabla--compacta :deep(thead th:nth-child(3)),
.derivacion-bandeja-tabla--compacta :deep(tbody td:nth-child(3)) {
  width: 13%;
}

.derivacion-bandeja-tabla--compacta :deep(thead th:nth-child(4)),
.derivacion-bandeja-tabla--compacta :deep(tbody td:nth-child(4)) {
  width: 15%;
}

.derivacion-bandeja-tabla--compacta :deep(thead th:nth-child(5)),
.derivacion-bandeja-tabla--compacta :deep(tbody td:nth-child(5)) {
  width: 9%;
}

.derivacion-bandeja-tabla--compacta :deep(thead th:nth-child(6)),
.derivacion-bandeja-tabla--compacta :deep(tbody td:nth-child(6)) {
  width: 15%;
}

.derivacion-bandeja-tabla--compacta :deep(th),
.derivacion-bandeja-tabla--compacta :deep(td) {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
