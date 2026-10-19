<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue'
import type { NavigationMenuItem, TableColumn } from '@nuxt/ui'
import type { Correspondencia, FiltroCorrespondencia, RespuestaBusquedaCorrespondencia } from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'
import CorrespondenciaFormModal from '~/components/correspondencia/CorrespondenciaFormModal.vue'
import CorrespondenciaCompartirModal from '~/components/correspondencia/CorrespondenciaCompartirModal.vue'
import DerivacionFormModal from '~/components/correspondencia/DerivacionFormModal.vue'
import CorrespondenciaDetalleModal from '~/components/correspondencia/CorrespondenciaDetalleModal.vue'
import CorrespondenciaAdjuntosModal from '~/components/correspondencia/CorrespondenciaAdjuntosModal.vue'
import CorTable from '~/components/CorTable.vue'
import {
  correspondenciaPuedeDerivar,
  correspondenciaSinNumerar,
  correspondenciaTieneCite,
  etiquetaNumeroCorrespondencia,
  MENSAJE_SIN_NUMERACION_HR,
} from '~/utils/correspondencia'

const props = withDefaults(
  defineProps<{
    modo: 'borrador' | 'archivo' | 'compartidos'
    titulo: string
    descripcion: string
    icono: string
  }>(),
  {
    modo: 'borrador',
    titulo: 'Bandeja de Borrador',
    descripcion: 'Correspondencias elaboradas por su cargo que aún no cuentan con derivaciones.',
    icono: 'i-lucide-file-edit',
  },
)

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')
const UNavigationMenu = resolveComponent('UNavigationMenu')

const toast = useToast()
const { profile, cargoActivo, resolveCargoOrigenId } = useProfile()
const { apiBaseUrl, apiPublicUrl } = useApiUrls()

// Estado de listado y paginación
const loading = ref(false)
const items = ref<Correspondencia[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// Filtros de búsqueda
const searchCriterio = ref('')

// Modal de Creación / Edición
const isModalOpen = ref(false)
const correspToEdit = ref<Correspondencia | null>(null)

// Modal de Compartir
const isCompartirOpen = ref(false)
const correspToCompartir = ref<Correspondencia | null>(null)

// Modal de Derivación
const isDerivacionOpen = ref(false)
const correspToDerivar = ref<Correspondencia | null>(null)

// Modal de Detalle
const isDetalleOpen = ref(false)
const detalleDocumentoId = ref<string | null>(null)

// Modal de Eliminación
const isDeleteOpen = ref(false)
const correspToDelete = ref<Correspondencia | null>(null)
const deleting = ref(false)
const generandoId = ref<string | null>(null)
const abriendoEditorId = ref<string | null>(null)

// Editor OnlyOffice
const showEditor = ref(false)
const editorKey = ref('')
const editorUrl = ref('')
const editorCallbackUrl = ref('')
const editorTitle = ref('Documento.docx')
const editorCorresp = ref<Correspondencia | null>(null)
const editorReadOnly = ref(false)

const isAdjuntosOpen = ref(false)
const correspAdjuntos = ref<Correspondencia | null>(null)
const adjuntosSoloLectura = ref(true)

// Configuración de columnas
const columns = computed<TableColumn<Correspondencia>[]>(() => [
  {
    accessorKey: 'nro',
    header: 'Nº / Correlativo',
    cell: ({ row }) => {
      const c = row.original
      return h('div', { class: 'flex flex-col' }, [
        h('span', {
          class: [
            'font-bold',
            correspondenciaSinNumerar(c) ? 'text-muted italic' : 'text-primary-600 dark:text-primary-400',
          ],
        }, etiquetaNumeroCorrespondencia(c)),
        c.cite_origen ? h('span', { class: 'text-[11px] text-gray-400 font-mono' }, c.cite_origen) : null,
      ])
    },
  },
  {
    accessorKey: 'hoja_ruta',
    header: 'Hoja de Ruta',
    cell: ({ row }) => {
      const hr = row.original.hoja_ruta
      if (!hr) {
        return h('span', { class: 'text-xs text-gray-400 italic' }, 'Sin HR')
      }
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UBadge, { color: 'neutral', variant: 'subtle', size: 'xs' }, () => `HR ${hr.numero}/${hr.anio}`),
      ])
    },
  },
  {
    accessorKey: 'referencia',
    header: 'Referencia',
    cell: ({ row }) => {
      const c = row.original
      return h('div', { class: 'flex flex-col gap-1 max-w-md' }, [
        h('span', { class: 'font-medium text-xs text-gray-900 dark:text-white line-clamp-2' }, c.referencia),
        h('div', { class: 'flex items-center gap-2' }, [
          c.confidencial
            ? h(UBadge, { color: 'error', variant: 'subtle', size: 'xs', icon: 'i-lucide-lock' }, () => 'Confidencial')
            : null,
          c.proceso
            ? h('span', { class: 'text-[10px] text-gray-500 dark:text-gray-400 truncate' }, c.proceso.nombre)
            : null,
        ]),
      ])
    },
  },
  {
    accessorKey: 'prioridad',
    header: 'Prioridad',
    cell: ({ row }) => {
      const prio = row.original.codificador
      const nombre = prio?.nombre?.trim() || 'Normal'
      const isUrgente = nombre.toLowerCase().includes('urgente') || nombre.toLowerCase().includes('alta')
      return h(
        UBadge,
        {
          color: isUrgente ? 'error' : 'primary',
          variant: 'subtle',
          size: 'xs',
        },
        () => nombre,
      )
    },
  },
  {
    accessorKey: 'remitente_id',
    header: props.modo === 'compartidos' ? 'Propietario / Permiso' : 'Remitente / Área',
    cell: ({ row }) => {
      const c = row.original
      const esCompartidos = props.modo === 'compartidos'
      const soloLectura = c.acceso_compartido?.solo_lectura

      return h('div', { class: 'flex flex-col text-xs gap-0.5' }, [
        h('span', { class: 'font-medium text-gray-800 dark:text-gray-200 truncate' }, c.cargos?.nombre || 'Sin cargo'),
        h('span', { class: 'text-[11px] text-gray-400 truncate' }, c.areas?.nombre || 'Sin área'),
        esCompartidos
          ? h('div', { class: 'flex items-center gap-1 mt-0.5' }, [
              h(
                UBadge,
                {
                  color: soloLectura ? 'warning' : 'success',
                  variant: 'subtle',
                  size: 'xs',
                },
                () => (soloLectura ? 'Solo Lectura' : 'Puede Editar contenido del documento'),
              ),
              c.acceso_compartido?.comentario
                ? h('span', { class: 'text-[10px] text-gray-400 italic truncate max-w-[120px]', title: c.acceso_compartido.comentario }, `"${c.acceso_compartido.comentario}"`)
                : null,
            ])
          : null,
      ])
    },
  },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => {
      const c = row.original
      const tienePlantilla = Boolean(c.proceso?.plantilla?.trim())
      const acciones = []

      const menuItems =
        props.modo === 'borrador'
          ? buildBorradorAccionesMenu(c, tienePlantilla)
          : props.modo === 'compartidos'
            ? buildCompartidosAccionesMenu(c)
            : buildArchivoAccionesMenu(c)

      acciones.push(
        h(UButton, {
          icon: 'i-lucide-eye',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          title: 'Ver detalle',
          onClick: () => handleVerDetalle(c),
        }),
        hAccionesNavigationMenu(menuItems),
      )

      return h('div', { class: 'flex items-center justify-end gap-1.5' }, acciones)
    },
  },
])

// Cargar correspondencias
const fetchCorrespondencias = async () => {
  loading.value = true
  try {
    const filtro: FiltroCorrespondencia = {
      pagina: page.value,
      limite: pageSize.value,
      criterio: searchCriterio.value.trim() || undefined,
    }

    if (props.modo === 'borrador') {
      const cargoOrigen = resolveCargoOrigenId() || profile.value?.cargo_activo_id || cargoActivo.value?.id
      if (cargoOrigen) {
        filtro.cargo_origen_id = cargoOrigen
      }
      filtro.sin_derivaciones = true
    } else if (props.modo === 'compartidos') {
      // Compartidos conmigo: documentos compartidos vía corresp_usuario
      filtro.solo_compartidos = true
    } else if (props.modo === 'archivo') {
      // Archivo: área_origen = área_activa_id de session storage (o profile)
      const areaId =
        (import.meta.client ? sessionStorage.getItem('area_activa_id') : null) ||
        profile.value?.area_activa_id
      if (areaId) {
        filtro.area_origen_id = areaId
      }
    }

    const response = await backendService.post<RespuestaBusquedaCorrespondencia>('correspondencia/buscar', filtro)

    const resData = ((response as any)?.data || response) as RespuestaBusquedaCorrespondencia
    if (resData) {
      items.value = resData.items || []
      total.value = resData.total || 0
    }
  } catch (error: any) {
    toast.add({
      title: 'Error al cargar registros',
      description: error?.data?.message || error?.message || 'No se pudo conectar con el servidor',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleBuscar = () => {
  page.value = 1
  fetchCorrespondencias()
}

const handleLimpiarFiltros = () => {
  searchCriterio.value = ''
  page.value = 1
  fetchCorrespondencias()
}

const handleNuevo = () => {
  correspToEdit.value = null
  isModalOpen.value = true
}

watch(isModalOpen, (isOpen) => {
  if (!isOpen) {
    correspToEdit.value = null
  }
})

const handleEditar = (corresp: Correspondencia) => {
  correspToEdit.value = corresp
  isModalOpen.value = true
}

const handleCompartir = (corresp: Correspondencia) => {
  correspToCompartir.value = corresp
  isCompartirOpen.value = true
}

const handleDerivar = (corresp: Correspondencia) => {
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

const handleVerDetalle = (corresp: Correspondencia) => {
  detalleDocumentoId.value = corresp.id
  isDetalleOpen.value = true
}

const handleAdjuntos = (corresp: Correspondencia, soloLectura: boolean) => {
  correspAdjuntos.value = corresp
  adjuntosSoloLectura.value = soloLectura
  isAdjuntosOpen.value = true
}

const handleConfirmarEliminar = (corresp: Correspondencia) => {
  correspToDelete.value = corresp
  isDeleteOpen.value = true
}

const obtenerRutaDocumento = (c: Correspondencia): string =>
  (c.url_documento || c.contenido)?.trim() || ''

const tieneDocumentoGenerado = (c: Correspondencia): boolean =>
  Boolean(obtenerRutaDocumento(c))

const buildEditorKey = (correspId: string) =>
  `c${correspId.replace(/-/g, '')}_${Date.now()}`

const abrirEditorOnlyOffice = async (
  corresp: Correspondencia,
  storagePath: string,
  readOnly: boolean = false,
) => {
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
    // Preferir URLs del backend (PUBLIC_DOCS_BASE_URL), accesibles desde OnlyOffice DS
    editorUrl.value =
      response.documentUrl ||
      `${apiPublicUrl}/documents/file/${encodeURIComponent(response.fileName)}`
    editorCallbackUrl.value =
      response.callbackUrl || `${apiPublicUrl}/documents/callback`
    editorTitle.value = `Oficio ${corresp.nro}-${corresp.gestion}.docx`
    editorCorresp.value = corresp
    editorReadOnly.value = readOnly
    showEditor.value = true
  } finally {
    abriendoEditorId.value = null
  }
}

const handleGenerarDocumento = async (corresp: Correspondencia) => {
  if (!corresp.id) {
    return
  }

  if (!corresp.proceso?.plantilla?.trim()) {
    toast.add({
      title: 'Sin plantilla',
      description: 'El proceso de esta correspondencia no tiene plantilla Word registrada.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  generandoId.value = corresp.id
  try {
    const res = await backendService.post<{ path?: string; message?: string }>(
      `correspondencia/${corresp.id}/generar-documento`,
      {},
    )
    const data = (res as { data?: { path?: string }; path?: string })?.data ?? res
    const path = data?.path

    if (!path) {
      throw new Error('El servidor no devolvió la ruta del documento generado.')
    }

    toast.add({
      title: 'Documento generado',
      description: 'Abriendo editor OnlyOffice...',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

    await fetchCorrespondencias()
    await abrirEditorOnlyOffice({ ...corresp, url_documento: path }, path, false)
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

const handleEditarDocumentoOnlyOffice = async (
  corresp: Correspondencia,
  readOnly: boolean = false,
) => {
  const path = obtenerRutaDocumento(corresp)
  if (!path) {
    toast.add({
      title: 'Sin documento',
      description: 'Primero genere el documento desde la plantilla del proceso.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  try {
    await abrirEditorOnlyOffice(corresp, path, readOnly)
  } catch (error: any) {
    toast.add({
      title: 'No se pudo abrir el editor',
      description:
        error?.data?.message ||
        error?.message ||
        'Error al preparar el documento para OnlyOffice.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
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

const buildCompartidosAccionesMenu = (c: Correspondencia): NavigationMenuItem[][] => {
  const tieneDocumento = tieneDocumentoGenerado(c)
  const esSoloLectura = c.acceso_compartido?.solo_lectura ?? false
  const busyEditor = abriendoEditorId.value === c.id

  const children: NavigationMenuItem[] = [
    {
      label: 'Adjuntos',
      icon: 'i-lucide-paperclip',
      onSelect: (e) => {
        e.preventDefault()
        handleAdjuntos(c, true)
      },
    },
  ]

  if (tieneDocumento) {
    children.push({
      label: busyEditor
        ? 'Abriendo documento…'
        : esSoloLectura
          ? 'Ver contenido del documento (solo lectura)'
          : 'Editar contenido del documento',
      icon: esSoloLectura ? 'i-lucide-file-text' : 'i-lucide-file-pen-line',
      disabled: busyEditor,
      onSelect: (e) => {
        e.preventDefault()
        void handleEditarDocumentoOnlyOffice(c, esSoloLectura)
      },
    })
  }

  return wrapAccionesMenu(children)
}

const buildArchivoAccionesMenu = (c: Correspondencia): NavigationMenuItem[][] => {
  const children: NavigationMenuItem[] = [
    {
      label: 'Adjuntos',
      icon: 'i-lucide-paperclip',
      onSelect: (e) => {
        e.preventDefault()
        handleAdjuntos(c, true)
      },
    },
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: (e) => {
        e.preventDefault()
        handleEditar(c)
      },
    },
  ]

  if (!correspondenciaTieneCite(c)) {
    children.push({
      label: 'Eliminar',
      icon: 'i-lucide-trash-2',
      class: 'text-error',
      onSelect: (e) => {
        e.preventDefault()
        handleConfirmarEliminar(c)
      },
    })
  }

  return wrapAccionesMenu(children)
}

const buildBorradorAccionesMenu = (
  c: Correspondencia,
  tienePlantilla: boolean,
): NavigationMenuItem[][] => {
  const tieneDocumento = tieneDocumentoGenerado(c)
  const compartidos = c._count?.corresp_usuario || c.corresp_usuario?.length || 0
  const busyGenerar = generandoId.value === c.id
  const busyEditor = abriendoEditorId.value === c.id

  const children: NavigationMenuItem[] = [
    {
      label: busyGenerar ? 'Generando documento…' : 'Generar documento',
      icon: 'i-lucide-file-output',
      disabled: !tienePlantilla || busyGenerar || busyEditor,
      onSelect: (e) => {
        e.preventDefault()
        void handleGenerarDocumento(c)
      },
    },
  ]

  if (tieneDocumento) {
    children.push({
      label: busyEditor ? 'Abriendo editor…' : 'Editar contenido del documento',
      icon: 'i-lucide-file-pen-line',
      disabled: busyEditor || busyGenerar,
      onSelect: (e) => {
        e.preventDefault()
        void handleEditarDocumentoOnlyOffice(c)
      },
    })
  }

  children.push(
    {
      label: 'Adjuntos',
      icon: 'i-lucide-paperclip',
      onSelect: (e) => {
        e.preventDefault()
        handleAdjuntos(c, false)
      },
    },
    {
      label: 'Derivar correspondencia',
      icon: 'i-lucide-send',
      disabled: !correspondenciaPuedeDerivar(c),
      onSelect: (e) => {
        e.preventDefault()
        handleDerivar(c)
      },
    },
    {
      label: compartidos
        ? `Compartir (${compartidos} usuario${compartidos === 1 ? '' : 's'})`
        : 'Compartir documento',
      icon: 'i-lucide-share-2',
      onSelect: (e) => {
        e.preventDefault()
        handleCompartir(c)
      },
    },
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: (e) => {
        e.preventDefault()
        handleEditar(c)
      },
    },
  )

  if (!correspondenciaTieneCite(c)) {
    children.push({
      label: 'Eliminar',
      icon: 'i-lucide-trash-2',
      class: 'text-error',
      onSelect: (e) => {
        e.preventDefault()
        handleConfirmarEliminar(c)
      },
    })
  }

  return wrapAccionesMenu(children)
}

const cerrarEditorOnlyOffice = () => {
  showEditor.value = false
  editorKey.value = ''
  editorUrl.value = ''
  editorCallbackUrl.value = ''
  editorCorresp.value = null
  fetchCorrespondencias()
}

const handleEliminar = async () => {
  if (!correspToDelete.value?.id) return

  deleting.value = true
  try {
    await backendService.delete('correspondencia', correspToDelete.value.id)
    toast.add({
      title: 'Registro eliminado',
      description: 'La correspondencia ha sido eliminada exitosamente.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    isDeleteOpen.value = false
    correspToDelete.value = null
    fetchCorrespondencias()
  } catch (error: any) {
    toast.add({
      title: 'Error al eliminar',
      description: error?.data?.message || error?.message || 'No se pudo eliminar el registro',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchCorrespondencias()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header de la Bandeja -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
            <UIcon :name="icono" class="size-6" />
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{{ titulo }}</h1>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ descripcion }}</p>
          </div>
        </div>
      </div>

      <div v-if="props.modo !== 'compartidos'" class="flex items-center gap-2">
        <UButton
          label="Nueva Correspondencia"
          icon="i-lucide-plus"
          color="primary"
          class="rounded-xl shadow-xs"
          @click="handleNuevo"
        />
      </div>
    </div>

    <!-- Barra de Filtros y Búsqueda -->
    <div class="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row items-center gap-3">
      <div class="w-full sm:flex-1 relative">
        <UInput
          v-model="searchCriterio"
          placeholder="Buscar por referencia, CITE, área o proceso..."
          icon="i-lucide-search"
          class="w-full"
          @keyup.enter="handleBuscar"
        />
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
        <UButton
          label="Buscar"
          icon="i-lucide-search"
          color="neutral"
          variant="subtle"
          @click="handleBuscar"
        />
        <UButton
          v-if="searchCriterio"
          label="Limpiar"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="handleLimpiarFiltros"
        />
      </div>
    </div>

    <!-- Tabla de Registros -->
    <CorTable
      :columns="columns"
      :data="items"
      :loading="loading"
      :total="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      @update:page="fetchCorrespondencias"
      @update:page-size="fetchCorrespondencias"
    />

    <!-- Modal Formulario de Creación / Edición -->
    <CorrespondenciaFormModal
      v-model:open="isModalOpen"
      :correspondencia="correspToEdit"
      @guardado="fetchCorrespondencias"
    />

    <!-- Modal Compartir Correspondencia -->
    <CorrespondenciaCompartirModal
      v-model:open="isCompartirOpen"
      :correspondencia="correspToCompartir"
      @actualizado="fetchCorrespondencias"
    />

    <DerivacionFormModal
      v-model:open="isDerivacionOpen"
      :correspondencia="correspToDerivar"
      @derivado="fetchCorrespondencias"
    />

    <CorrespondenciaDetalleModal
      v-model:open="isDetalleOpen"
      :correspondencia-id="detalleDocumentoId"
      @leido="fetchCorrespondencias"
    />

    <CorrespondenciaAdjuntosModal
      v-model:open="isAdjuntosOpen"
      :correspondencia="correspAdjuntos"
      :solo-lectura="adjuntosSoloLectura"
    />

    <!-- Editor OnlyOffice (documento generado) -->
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
                <UBadge
                  v-if="editorReadOnly"
                  color="warning"
                  variant="subtle"
                  size="xs"
                >
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
              :read-only="editorReadOnly"
              :user-id="profile?.id || 'uid-1'"
              :user-name="profile?.nombre_completo || 'Usuario'"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal Confirmación de Eliminación -->
    <UModal
      v-model:open="isDeleteOpen"
      title="Eliminar Correspondencia"
      description="¿Está seguro de que desea eliminar este registro? Esta acción no se puede deshacer."
      :ui="{ content: 'sm:max-w-md' }"
    >
      <template #body>
        <div v-if="correspToDelete" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300">
          <p class="font-bold">Nº {{ correspToDelete.nro }}/{{ correspToDelete.gestion }}</p>
          <p class="mt-1 line-clamp-2">{{ correspToDelete.referencia }}</p>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-3 w-full">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="outline"
            :disabled="deleting"
            @click="isDeleteOpen = false"
          />
          <UButton
            label="Eliminar Definitivamente"
            icon="i-lucide-trash-2"
            color="error"
            :loading="deleting"
            @click="handleEliminar"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
