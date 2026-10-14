<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Correspondencia, FiltroCorrespondencia, RespuestaBusquedaCorrespondencia } from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'
import CorrespondenciaFormModal from '~/components/correspondencia/CorrespondenciaFormModal.vue'
import CorTable from '~/components/CorTable.vue'

const props = withDefaults(
  defineProps<{
    modo: 'borrador' | 'archivo'
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
const { profile, cargoActivo } = useProfile()
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

// Configuración de columnas
const columns = computed<TableColumn<Correspondencia>[]>(() => [
  {
    accessorKey: 'nro',
    header: 'Nº / Correlativo',
    cell: ({ row }) => {
      const c = row.original
      return h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'font-bold text-primary-600 dark:text-primary-400' }, `Nº ${c.nro}/${c.gestion}`),
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
    header: 'Remitente / Área',
    cell: ({ row }) => {
      const c = row.original
      return h('div', { class: 'flex flex-col text-xs' }, [
        h('span', { class: 'font-medium text-gray-800 dark:text-gray-200 truncate' }, c.cargos?.nombre || 'Sin cargo'),
        h('span', { class: 'text-[11px] text-gray-400 truncate' }, c.areas?.nombre || 'Sin área'),
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

      if (props.modo === 'borrador') {
        const tieneDocumento = Boolean(c.contenido?.trim())
        acciones.push(
          h(UButton, {
            icon: 'i-lucide-file-output',
            color: 'primary',
            variant: 'ghost',
            size: 'xs',
            title: tienePlantilla
              ? 'Generar documento y abrir en OnlyOffice'
              : 'El proceso no tiene plantilla registrada',
            disabled: !tienePlantilla || generandoId.value === c.id || abriendoEditorId.value === c.id,
            loading: generandoId.value === c.id,
            onClick: () => handleGenerarDocumento(c),
          }),
        )
        if (tieneDocumento) {
          acciones.push(
            h(UButton, {
              icon: 'i-lucide-file-pen-line',
              color: 'info',
              variant: 'ghost',
              size: 'xs',
              title: 'Editar documento en OnlyOffice',
              disabled: abriendoEditorId.value === c.id || generandoId.value === c.id,
              loading: abriendoEditorId.value === c.id,
              onClick: () => handleEditarDocumentoOnlyOffice(c),
            }),
          )
        }
      }

      acciones.push(
        h(UButton, {
          icon: 'i-lucide-pencil',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          title: 'Editar',
          onClick: () => handleEditar(c),
        }),
        h(UButton, {
          icon: 'i-lucide-trash-2',
          color: 'error',
          variant: 'ghost',
          size: 'xs',
          title: 'Eliminar',
          onClick: () => handleConfirmarEliminar(c),
        }),
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
      // Borrador: remitente_id = cargo_activo_id y sin derivaciones
      const cargoId = profile.value?.cargo_activo_id || cargoActivo.value?.id
      if (cargoId) {
        filtro.remitente_id = cargoId
      }
      filtro.sin_derivaciones = true
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

const handleEditar = (corresp: Correspondencia) => {
  correspToEdit.value = corresp
  isModalOpen.value = true
}

const handleConfirmarEliminar = (corresp: Correspondencia) => {
  correspToDelete.value = corresp
  isDeleteOpen.value = true
}

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
    // Preferir URLs del backend (PUBLIC_DOCS_BASE_URL), accesibles desde OnlyOffice DS
    editorUrl.value =
      response.documentUrl ||
      `${apiPublicUrl}/documents/file/${encodeURIComponent(response.fileName)}`
    editorCallbackUrl.value =
      response.callbackUrl || `${apiPublicUrl}/documents/callback`
    editorTitle.value = `Oficio ${corresp.nro}-${corresp.gestion}.docx`
    editorCorresp.value = corresp
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
    await abrirEditorOnlyOffice({ ...corresp, contenido: path }, path)
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

const handleEditarDocumentoOnlyOffice = async (corresp: Correspondencia) => {
  const path = corresp.contenido?.trim()
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
    await abrirEditorOnlyOffice(corresp, path)
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

      <div class="flex items-center gap-2">
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
              <h3 class="text-sm font-semibold text-highlighted truncate">
                {{ editorTitle }}
              </h3>
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
