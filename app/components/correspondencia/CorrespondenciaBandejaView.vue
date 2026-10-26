<script setup lang="ts">
import { ref, computed, onMounted, watch, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Correspondencia, FiltroCorrespondencia, RespuestaBusquedaCorrespondencia } from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'
import CorrespondenciaFormModal from '~/components/correspondencia/CorrespondenciaFormModal.vue'
import CorrespondenciaCompartirModal from '~/components/correspondencia/CorrespondenciaCompartirModal.vue'
import DerivacionFormModal from '~/components/derivaciones/DerivacionFormModal.vue'
import CorrespondenciaDetalleModal from '~/components/correspondencia/CorrespondenciaDetalleModal.vue'
import CorrespondenciaAdjuntosModal from '~/components/correspondencia/CorrespondenciaAdjuntosModal.vue'
import CorAcciones from '~/components/correspondencia/CorAcciones.vue'
import CorTable from '~/components/CorTable.vue'
import BandejaViewHeader from '~/components/BandejaViewHeader.vue'
import {
  citeOrigenCorrespondencia,
  correspondenciaPuedeDerivar,
  correspondenciaSinNumerar,
  etiquetaNumeroCorrespondencia,
  mensajeNoDerivarCorrespondencia,
  MENSAJE_ELIMINAR_CORRELATIVO,
} from '~/utils/correspondencia'
import { META_COLUMNA_ACCIONES_TABLA } from '~/utils/acciones-menu'

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
const searchHojaRuta = ref('')
const compartidosAlcance = ref<'todos' | 'recibidos' | 'enviados'>('todos')
const compartidosAlcanceOptions = [
  { label: 'Todos', value: 'todos' },
  { label: 'Me compartieron', value: 'recibidos' },
  { label: 'Compartí yo', value: 'enviados' },
] as const

// Modales y Estados de Operación
const isModalOpen = ref(false)
const correspToEdit = ref<Correspondencia | null>(null)

const isCompartirOpen = ref(false)
const correspToCompartir = ref<Correspondencia | null>(null)

const isDerivacionOpen = ref(false)
const correspToDerivar = ref<Correspondencia | null>(null)

const isDetalleOpen = ref(false)
const detalleDocumentoId = ref<string | null>(null)

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

// Configuración de columnas utilizando el componente encapsulado CorAcciones
const columns = computed<TableColumn<Correspondencia>[]>(() => {
  const cols: TableColumn<Correspondencia>[] = [
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
        citeOrigenCorrespondencia(c)
          ? h('span', { class: 'text-[11px] text-gray-400 font-mono' }, citeOrigenCorrespondencia(c))
          : null,
      ])
    },
  },
  {
    accessorKey: 'referencia',
    header: 'Referencia',
    cell: ({ row }) => {
      const c = row.original
      return h('div', { class: 'flex flex-col gap-1 min-w-0 max-w-xs' }, [
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
  ]

  if (props.modo === 'compartidos') {
    cols.push({
      id: 'compartido_contexto',
      header: 'Compartición',
      cell: ({ row }) => {
        const esEnviado = row.original.compartido_contexto === 'enviado'
        const nCompartidos =
          row.original._count?.corresp_usuario ?? row.original.corresp_usuario?.length ?? 0
        return h('div', { class: 'flex flex-col gap-1' }, [
          h(
            UBadge,
            {
              color: esEnviado ? 'primary' : 'info',
              variant: 'subtle',
              size: 'xs',
              icon: esEnviado ? 'i-lucide-share-2' : 'i-lucide-inbox',
            },
            () => (esEnviado ? 'Compartí yo' : 'Me compartieron'),
          ),
          esEnviado && nCompartidos > 0
            ? h('span', { class: 'text-[10px] text-muted' }, `${nCompartidos} usuario${nCompartidos === 1 ? '' : 's'}`)
            : null,
        ])
      },
    })
  }

  cols.push({
    accessorKey: 'remitente_id',
    header: 'Remitente / Área',
    cell: ({ row }) => {
      const c = row.original
      const esCompartidos = props.modo === 'compartidos'
      const soloLectura = c.acceso_compartido?.solo_lectura
      const esRecibido = c.compartido_contexto !== 'enviado'

      return h('div', { class: 'flex flex-col text-xs gap-0.5' }, [
        h('span', { class: 'font-medium text-gray-800 dark:text-gray-200 truncate' }, c.cargos?.nombre || 'Sin cargo'),
        h('span', { class: 'text-[11px] text-gray-400 truncate' }, c.areas?.nombre || 'Sin área'),
        esCompartidos && esRecibido
          ? h('div', { class: 'flex flex-col items-start gap-1 mt-0.5' }, [
              h(
                UBadge,
                {
                  color: soloLectura ? 'warning' : 'success',
                  variant: 'subtle',
                  size: 'xs',
                },
                () => (soloLectura ? 'Solo lectura' : 'Puede editar documento'),
              ),
              c.acceso_compartido?.comentario
                ? h('span', { class: 'text-[10px] text-gray-400 italic truncate max-w-[160px]', title: c.acceso_compartido.comentario }, `"${c.acceso_compartido.comentario}"`)
                : null,
            ])
          : null,
      ])
    },
  })

  cols.push({
    id: 'acciones',
    header: '',
    meta: META_COLUMNA_ACCIONES_TABLA,
    cell: ({ row }) => {
      const c = row.original

      return h(CorAcciones, {
        correspondencia: c,
        modo: props.modo,
        generandoId: generandoId.value,
        abriendoEditorId: abriendoEditorId.value,
        onVerDetalle: (item) => handleVerDetalle(item),
        onEditarDoc: (item, readOnly) => void handleEditarDocumentoOnlyOffice(item, readOnly),
        onGenerarDoc: (item) => void handleGenerarDocumento(item),
        onAdjuntos: (item) => handleAdjuntos(item, false),
        onDerivar: (item) => handleDerivar(item),
        onCompartir: (item) => handleCompartir(item),
        onEditarInfo: (item) => handleEditar(item),
        onEliminar: (item) => handleConfirmarEliminar(item),
      })
    },
  })

  return cols
})

// Cargar correspondencias
const fetchCorrespondencias = async () => {
  loading.value = true
  try {
    const filtro: FiltroCorrespondencia = {
      pagina: page.value,
      limite: pageSize.value,
      criterio: searchCriterio.value.trim() || undefined,
      hoja_ruta: searchHojaRuta.value.trim() || undefined,
    }

    if (props.modo === 'borrador') {
      const cargoOrigen = resolveCargoOrigenId() || profile.value?.cargo_activo_id || cargoActivo.value?.id
      if (cargoOrigen) {
        filtro.cargo_origen_id = cargoOrigen
      }
      filtro.sin_derivaciones = true
    } else if (props.modo === 'compartidos') {
      filtro.solo_compartidos = true
      if (compartidosAlcance.value !== 'todos') {
        filtro.compartidos_alcance = compartidosAlcance.value
      }
    } else if (props.modo === 'archivo') {
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

watch(compartidosAlcance, () => {
  if (props.modo !== 'compartidos') return
  page.value = 1
  fetchCorrespondencias()
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const onSearchInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    fetchCorrespondencias()
  }, 350)
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
      description: mensajeNoDerivarCorrespondencia(corresp),
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
  if (!corresp.id) return

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
      description: 'Abriendo editor del Documento...',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

    await fetchCorrespondencias()
    await abrirEditorOnlyOffice({ ...corresp, url_documento: path }, path, false)
  } catch (error: any) {
    toast.add({
      title: 'No se pudo generar',
      description: error?.data?.message || error?.message || 'Error al generar el documento desde la plantilla.',
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
      description: error?.data?.message || error?.message || 'Error al preparar el documento.',
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
    <BandejaViewHeader
      v-if="props.modo === 'compartidos'"
      :titulo="props.titulo"
      :descripcion="props.descripcion"
      :icono="props.icono"
    />
    <BandejaViewHeader
      v-else
      :titulo="props.titulo"
      :descripcion="props.descripcion"
      :icono="props.icono"
    >
      <template #actions>
        <UButton
          label="Nuevo Proceso"
          icon="i-lucide-plus"
          color="primary"
          class="rounded-md shadow-xs"
          @click="handleNuevo"
        />
      </template>
    </BandejaViewHeader>

    <!-- Barra de Filtros y Búsqueda -->
    <div class="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row items-center gap-3">
      <div
        v-if="props.modo === 'compartidos'"
        class="w-full sm:w-52 shrink-0"
      >
       
        <USelect
          v-model="compartidosAlcance"
          :items="[...compartidosAlcanceOptions]"
          value-key="value"
          class="w-full"
        />
      </div>

      <div class="w-full sm:w-44 shrink-0">
        <UInput
          v-model="searchHojaRuta"
          placeholder="Hoja de Ruta (142/2025)"
          icon="i-lucide-file-stack"
          class="w-full"
          @update:model-value="onSearchInput"
        />
      </div>

      <div class="w-full sm:flex-1 relative">
        <UInput
          v-model="searchCriterio"
          placeholder="Buscar por referencia, CITE, área o proceso..."
          icon="i-lucide-search"
          class="w-full"
          @update:model-value="onSearchInput"
        />
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
        <UButton
          label="Actualizar"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          title="Volver a cargar la bandeja"
          :loading="loading"
          @click="fetchCorrespondencias"
        />
      </div>
    </div>

    <!-- Tabla de Registros -->
    <div
      class="corresp-bandeja-tabla min-w-0"
      :class="{
        'corresp-bandeja-tabla--borrador': modo === 'borrador',
        'corresp-bandeja-tabla--compartidos': modo === 'compartidos',
      }"
    >
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
    </div>

    <!-- Modales -->
    <CorrespondenciaFormModal
      v-model:open="isModalOpen"
      :correspondencia="correspToEdit"
      @guardado="fetchCorrespondencias"
    />

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

    <!-- Editor OnlyOffice -->
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
      :description="MENSAJE_ELIMINAR_CORRELATIVO"
      :ui="{ content: 'sm:max-w-md' }"
    >
      <template #body>
        <div v-if="correspToDelete" class="p-3 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300">
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

<style scoped>
.corresp-bandeja-tabla :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.corresp-bandeja-tabla :deep(thead th:nth-child(1)),
.corresp-bandeja-tabla :deep(tbody td:nth-child(1)) {
  width: 9%;
}

.corresp-bandeja-tabla :deep(thead th:nth-child(2)),
.corresp-bandeja-tabla :deep(tbody td:nth-child(2)) {
  width: 12%;
}

.corresp-bandeja-tabla :deep(thead th:nth-child(3)),
.corresp-bandeja-tabla :deep(tbody td:nth-child(3)) {
  width: 26%;
}

.corresp-bandeja-tabla :deep(thead th:nth-child(4)),
.corresp-bandeja-tabla :deep(tbody td:nth-child(4)) {
  width: 10%;
}

.corresp-bandeja-tabla :deep(thead th:nth-child(5)),
.corresp-bandeja-tabla :deep(tbody td:nth-child(5)) {
  width: 18%;
}

.corresp-bandeja-tabla--compartidos :deep(thead th:nth-child(5)),
.corresp-bandeja-tabla--compartidos :deep(tbody td:nth-child(5)) {
  width: 12%;
}

.corresp-bandeja-tabla--compartidos :deep(thead th:nth-child(6)),
.corresp-bandeja-tabla--compartidos :deep(tbody td:nth-child(6)) {
  width: 14%;
}

.corresp-bandeja-tabla :deep(thead th:last-child),
.corresp-bandeja-tabla :deep(tbody td:last-child) {
  width: 5.5rem !important;
  min-width: 5.5rem !important;
  max-width: 5.5rem !important;
  overflow: visible;
}

.corresp-bandeja-tabla--borrador :deep(thead th:last-child),
.corresp-bandeja-tabla--borrador :deep(tbody td:last-child) {
  width: 6.5rem !important;
  min-width: 6.5rem !important;
  max-width: 6.5rem !important;
}

.corresp-bandeja-tabla :deep(thead th:not(:last-child)),
.corresp-bandeja-tabla :deep(tbody td:not(:last-child)) {
  overflow: hidden;
}
</style>