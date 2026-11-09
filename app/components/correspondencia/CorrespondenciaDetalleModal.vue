<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { TabsItem } from '@nuxt/ui'
import type {
  CorrespCooperativa,
  CorrespEntidad,
  HojaRutaCorrespondenciaItem,
  HojaRutaCorrespondenciasData,
  RecDeposito,
} from '~/types/correspondencia'
import type { CorrespondenciaDetalle, Derivacion } from '~/types/derivacion'
import type { RespuestaApi } from '~/types/respuestas'
import { backendService } from '~/services/backend.service'
import {
  citeOrigenCorrespondencia,
  correspondenciaTieneDocumentoOficial,
  etiquetaNumeroCorrespondencia,
} from '~/utils/correspondencia'

const props = defineProps<{
  correspondenciaId?: string | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'leido'): void
}>()

const toast = useToast()
const { profile } = useProfile()
const { apiBaseUrl, apiPublicUrl } = useApiUrls()

const loading = ref(false)
const detalle = ref<CorrespondenciaDetalle | null>(null)
const activeTab = ref('info')

const loadingHojaRuta = ref(false)
const hojaRutaData = ref<HojaRutaCorrespondenciasData | null>(null)

const showEditor = ref(false)
const editorKey = ref('')
const editorUrl = ref('')
const editorCallbackUrl = ref('')
const editorTitle = ref('')
const abriendoDocumento = ref(false)
const descargandoDocumento = ref(false)
const descargandoHr = ref(false)

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

const formatFechaSolo = (valor?: string | null) => {
  if (!valor) return '—'
  try {
    return new Date(valor).toLocaleDateString('es-BO', { dateStyle: 'medium' })
  } catch {
    return valor
  }
}

const formatImporteBs = (valor?: number | null) => {
  if (valor == null || Number.isNaN(Number(valor))) return '—'
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
  }).format(Number(valor))
}

const cargarDetalle = async (id: string) => {
  loading.value = true
  detalle.value = null
  try {
    const res = await backendService.get<CorrespondenciaDetalle>(`derivaciones/detalle/${id}`)
    const data = (res as RespuestaApi<CorrespondenciaDetalle>)?.data ?? (res as CorrespondenciaDetalle)
    detalle.value = data
    if (data.marcado_leido) {
      emit('leido')
    }
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo cargar el detalle',
      description: err?.data?.message || err?.message || 'Error al consultar la correspondencia.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    open.value = false
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.correspondenciaId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      activeTab.value = 'info'
      cargarDetalle(id)
    }
    if (!isOpen) {
      detalle.value = null
      hojaRutaData.value = null
      activeTab.value = 'info'
      cerrarEditorOnlyOffice()
    }
  },
)

const hrIdDetalle = computed(
  () => detalle.value?.hr_id || detalle.value?.hoja_ruta?.id || null,
)

const muestraTabHojaRuta = computed(() => Boolean(hrIdDetalle.value))

const totalCorrespHojaRuta = computed(
  () => hojaRutaData.value?.total ?? (detalle.value?.hoja_ruta ? 1 : 0),
)

const cargarHojaRutaCorresp = async () => {
  const hrId = hrIdDetalle.value
  if (!hrId) {
    hojaRutaData.value = null
    return
  }
  loadingHojaRuta.value = true
  try {
    const res = await backendService.get<HojaRutaCorrespondenciasData>(
      `correspondencia/hoja-ruta/${hrId}/correspondencias`,
    )
    hojaRutaData.value =
      (res as RespuestaApi<HojaRutaCorrespondenciasData>)?.data ?? null
  } catch (error: unknown) {
    hojaRutaData.value = null
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo cargar la hoja de ruta',
      description: err?.data?.message || err?.message || 'Error al listar procesos de la HR.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loadingHojaRuta.value = false
  }
}

const abrirCorrespondenciaHr = (item: HojaRutaCorrespondenciaItem) => {
  if (!item.id || item.id === detalle.value?.id) return
  activeTab.value = 'info'
  void cargarDetalle(item.id)
}

watch(
  () => [detalle.value?.id, hrIdDetalle.value] as const,
  () => {
    if (hrIdDetalle.value) {
      void cargarHojaRutaCorresp()
    } else {
      hojaRutaData.value = null
    }
  },
)

watch(activeTab, (tab) => {
  if (tab === 'hoja_ruta' && hrIdDetalle.value && !hojaRutaData.value && !loadingHojaRuta.value) {
    void cargarHojaRutaCorresp()
  }
})

const etiquetaDerivacion = (d: Derivacion) =>
  d.nombre || d.codificador?.nombre || 'Derivación'

const totalDerivaciones = computed(() => detalle.value?.derivaciones?.length ?? 0)

const muestraTabEntidad = computed(() => {
  const d = detalle.value
  if (!d) return false
  return Boolean(d.proceso?.requiere_entidad || (d.corresp_entidad?.length ?? 0) > 0)
})

const muestraTabCooperativa = computed(
  () => (detalle.value?.corresp_cooperativa?.length ?? 0) > 0,
)

const depositosDetalle = computed((): RecDeposito[] => detalle.value?.depositos ?? [])

const muestraTabDepositos = computed(() => depositosDetalle.value.length > 0)

const muestraTabLegalizacion = computed(
  () => Boolean(detalle.value?.proceso?.requiere_legalizacion),
)

const totalImporteDepositos = computed(() =>
  depositosDetalle.value.reduce((sum, d) => sum + (Number(d.importe) || 0), 0),
)

const citeEnTabExtension = computed(
  () => muestraTabEntidad.value || muestraTabCooperativa.value,
)

const nombreCooperativaDetalle = (c: CorrespCooperativa): string =>
  c.nombre_cooperativa?.trim()
  || c.cooperativa?.denominacion?.trim()
  || c.cooperativa?.razon_social?.trim()
  || '—'

const nombreEntidadDetalle = (e: CorrespEntidad): string =>
  e.entidad?.nombre_ent?.trim() || `Entidad #${e.entidad_id}`

const tieneDocumentoOficial = computed(() =>
  detalle.value ? correspondenciaTieneDocumentoOficial(detalle.value) : false,
)

const obtenerRutaDocumento = (): string => {
  if (!detalle.value) return ''
  return (detalle.value.url_documento || detalle.value.contenido)?.trim() || ''
}

const buildEditorKey = (correspId: string) =>
  `c${correspId.replace(/-/g, '')}_${Date.now()}`

const cerrarEditorOnlyOffice = () => {
  showEditor.value = false
  editorKey.value = ''
  editorUrl.value = ''
  editorCallbackUrl.value = ''
}

const verDocumentoOnlyOffice = async () => {
  const d = detalle.value
  const path = obtenerRutaDocumento()
  if (!d?.id || !path) {
    toast.add({
      title: 'Sin documento',
      description: 'Esta correspondencia no tiene documento generado en OnlyOffice.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  abriendoDocumento.value = true
  try {
    const key = buildEditorKey(d.id)
    const response = await $fetch<{
      fileName: string
      key: string
      documentUrl?: string
      callbackUrl?: string
    }>(`${apiBaseUrl}/documents/open-storage`, {
      method: 'POST',
      body: {
        key,
        storagePath: path,
        correspondenciaId: d.id,
      },
    })

    editorKey.value = response.key || key
    editorUrl.value =
      response.documentUrl ||
      `${apiPublicUrl}/documents/file/${encodeURIComponent(response.fileName)}`
    editorCallbackUrl.value =
      response.callbackUrl || `${apiPublicUrl}/documents/callback`
    editorTitle.value = `Oficio ${d.nro}-${d.gestion}.docx`
    showEditor.value = true
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo abrir el documento',
      description: err?.data?.message || err?.message || 'Error al preparar OnlyOffice.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    abriendoDocumento.value = false
  }
}

const descargarDocumentoOficial = async () => {
  const d = detalle.value
  const path = obtenerRutaDocumento()
  if (!d?.id || !path) {
    toast.add({
      title: 'Sin documento',
      description: 'No hay archivo para descargar.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  descargandoDocumento.value = true
  try {
    const blob = await backendService.descargarBlob(`storage/download/${path}`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const nombre = `Oficio_${d.nro}-${d.gestion}.docx`
    a.href = url
    a.download = nombre
    a.rel = 'noopener'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo descargar',
      description: err?.data?.message || err?.message || 'Error al obtener el documento.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    descargandoDocumento.value = false
  }
}

const descargarHojaRutaPdf = async () => {
  const d = detalle.value
  if (!d?.id) return

  descargandoHr.value = true
  try {
    const blob = await backendService.descargarBlob(
      `correspondencia/${d.id}/hoja-ruta/pdf`,
      undefined,
      { expectPdf: true },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const hr = d.hoja_ruta
    const sufijo =
      hr?.numero && hr.numero > 0
        ? `${hr.numero}_${hr.anio}`
        : d.id.slice(0, 8)
    a.href = url
    a.download = `hoja_ruta_${sufijo}.pdf`
    a.rel = 'noopener'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    toast.add({
      title: 'Hoja de Ruta generada',
      description: 'Se descargó el PDF con los datos de la correspondencia.',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo generar la HR',
      description: err?.data?.message || err?.message || 'Error al generar el PDF.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    descargandoHr.value = false
  }
}

const tabItems = computed<TabsItem[]>(() => {
  const items: TabsItem[] = [
    {
      label: 'Información',
      icon: 'i-lucide-file-text',
      value: 'info',
      slot: 'info',
    },
  ]

  if (muestraTabEntidad.value) {
    items.push({
      label: 'Entidad externa',
      icon: 'i-lucide-building-2',
      value: 'entidad',
      slot: 'entidad',
      badge: detalle.value?.corresp_entidad?.length || undefined,
    })
  }

  if (muestraTabCooperativa.value) {
    items.push({
      label: 'Cooperativa',
      icon: 'i-lucide-handshake',
      value: 'cooperativa',
      slot: 'cooperativa',
      badge: detalle.value?.corresp_cooperativa?.length || undefined,
    })
  }

  if (muestraTabDepositos.value) {
    items.push({
      label: 'Depósitos',
      icon: 'i-lucide-receipt',
      value: 'depositos',
      slot: 'depositos',
      badge: depositosDetalle.value.length,
    })
  }

  if (muestraTabLegalizacion.value) {
    items.push({
      label: 'Legalización',
      icon: 'i-lucide-stamp',
      value: 'legalizacion',
      slot: 'legalizacion',
    })
  }

  if (muestraTabHojaRuta.value) {
    items.push({
      label: 'Hoja de ruta',
      icon: 'i-lucide-route',
      value: 'hoja_ruta',
      slot: 'hoja_ruta',
      badge: totalCorrespHojaRuta.value > 0 ? totalCorrespHojaRuta.value : undefined,
    })
  }

  items.push(
    {
      label: 'Adjuntos',
      icon: 'i-lucide-paperclip',
      value: 'adjuntos',
      slot: 'adjuntos',
    },
    {
      label: 'Derivaciones',
      icon: 'i-lucide-git-branch',
      value: 'derivaciones',
      slot: 'derivaciones',
      badge: totalDerivaciones.value > 0 ? totalDerivaciones.value : undefined,
    },
  )

  return items
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Detalle del Proceso"
    description="Consulte datos del documento, adjuntos e historial de derivaciones."
    :ui="{
      content:
        'w-[calc(100vw-1.5rem)] sm:max-w-5xl lg:max-w-6xl max-h-[min(92vh,56rem)] flex flex-col',
      body: 'overflow-y-auto min-h-0 flex-1',
    }"
  >
    <template #body>
      <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-3">
        <UIcon name="i-lucide-loader-circle" class="size-8 text-primary animate-spin" />
        <p class="text-sm text-muted">Cargando detalle...</p>
      </div>

      <div v-else-if="detalle" class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3 pb-1 border-b border-default">
          <div class="min-w-0">
            <p class="text-xs font-mono text-muted">
              {{ etiquetaNumeroCorrespondencia(detalle) }}
              <span v-if="detalle.hoja_ruta">
                · HR {{ detalle.hoja_ruta.numero }}/{{ detalle.hoja_ruta.anio }}
              </span>
            </p>
            <h3 class="text-base font-bold text-highlighted mt-1 leading-snug">
              {{ detalle.referencia }}
            </h3>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-if="detalle.estado"
              :color="detalle.estado.nombre?.toLowerCase().includes('borrador') ? 'neutral' : 'primary'"
              variant="subtle"
              size="xs"
            >
              {{ detalle.estado.nombre }}
            </UBadge>
            <UBadge
              v-if="detalle.confidencial"
              color="warning"
              variant="subtle"
              size="xs"
            >
              Confidencial
            </UBadge>
          </div>
        </div>

        <UTabs
          v-model="activeTab"
          :items="tabItems"
          variant="link"
          color="primary"
          class="w-full min-h-[min(28rem,55vh)]"
          :ui="{
            list: 'border-b border-default flex-wrap gap-x-1 gap-y-0.5 pb-px',
            trigger: 'px-2.5 sm:px-3 text-sm whitespace-nowrap',
          }"
        >
          <template #info>
            <div class="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div class="p-3 rounded-md bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Proceso</p>
                <p class="text-default">{{ detalle.proceso?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-md bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Prioridad</p>
                <p class="text-default">{{ detalle.codificador?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-md bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Área origen</p>
                <p class="text-default">{{ detalle.areas?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-md bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Cargo origen</p>
                <p class="text-default">{{ detalle.cargo_origen?.nombre || detalle.cargos?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-md bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Remitente</p>
                <p class="text-default">{{ detalle.cargos?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-md bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Destinatario (doc.)</p>
                <p class="text-default">{{ detalle.cargo_destinatario?.nombre || '—' }}</p>
              </div>
              <div class="p-3 rounded-md bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Fecha emisión</p>
                <p class="text-default">{{ formatFecha(detalle.fecha_emision) }}</p>
              </div>
              <div class="p-3 rounded-md bg-elevated/50 border border-default">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Fecha plazo</p>
                <p class="text-default">{{ formatFecha(detalle.fecha_plazo) }}</p>
              </div>
              <div
                v-if="detalle && !citeEnTabExtension && citeOrigenCorrespondencia(detalle)"
                class="p-3 rounded-md bg-elevated/50 border border-default sm:col-span-2"
              >
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">CITE origen</p>
                <p class="font-mono text-xs text-default">{{ citeOrigenCorrespondencia(detalle) }}</p>
              </div>
            </div>
          </template>

          <template #entidad>
            <div class="pt-4">
              <div
                v-if="detalle.corresp_entidad?.length"
                class="space-y-3 max-h-[min(28rem,58vh)] overflow-y-auto pr-1"
              >
                <div
                  v-for="(row, idx) in detalle.corresp_entidad"
                  :key="`${row.entidad_id}-${idx}`"
                  class="p-4 rounded-md border border-sky-200/80 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 space-y-3"
                >
                  <div class="flex items-start gap-2">
                    <UIcon name="i-lucide-building-2" class="size-4 text-sky-600 shrink-0 mt-0.5" />
                    <p class="text-sm font-semibold text-highlighted">
                      {{ nombreEntidadDetalle(row) }}
                    </p>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Remitente</p>
                      <p class="text-default">{{ row.remitente_entidad || '—' }}</p>
                    </div>
                    <div class="sm:col-span-2">
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">CITE origen</p>
                      <p class="font-mono text-xs text-default">{{ row.cite_origen || citeOrigenCorrespondencia(detalle) || '—' }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="py-10 text-center">
                <UIcon name="i-lucide-building-2" class="size-10 text-dimmed mx-auto mb-2" />
                <p class="text-sm text-muted">Sin datos de entidad externa registrados.</p>
              </div>
            </div>
          </template>

          <template #cooperativa>
            <div class="pt-4">
              <div
                v-if="detalle.corresp_cooperativa?.length"
                class="space-y-3 max-h-[min(28rem,58vh)] overflow-y-auto pr-1"
              >
                <div
                  v-for="(row, idx) in detalle.corresp_cooperativa"
                  :key="row.corresp_id || idx"
                  class="p-4 rounded-md border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-highlighted truncate">
                        {{ nombreCooperativaDetalle(row) }}
                      </p>
                      <p
                        v-if="row.cooperativa?.nro_registro"
                        class="text-xs text-muted mt-0.5"
                      >
                        Registro {{ row.cooperativa.nro_registro }}
                      </p>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Solicitante</p>
                      <p class="text-default">{{ row.solicitante || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Nro. carnet</p>
                      <p class="text-default">{{ row.nro_carnet || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Cargo</p>
                      <p class="text-default">
                        {{ row.cargo_solicitante || row.codificador?.nombre?.trim() || '—' }}
                      </p>
                    </div>
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Teléfono</p>
                      <p class="text-default">{{ row.telefono || '—' }}</p>
                    </div>
                    <div class="sm:col-span-2">
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Correo</p>
                      <p class="text-default break-all">{{ row.correo_solicitante || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Nro. poder</p>
                      <p class="text-default">{{ row.nro_poder || '—' }}</p>
                    </div>
                    <div class="sm:col-span-2">
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Documento de Respaldo</p>
                      <p class="text-default">{{ row.doc_respaldo || '—' }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="py-10 text-center">
                <UIcon name="i-lucide-handshake" class="size-10 text-dimmed mx-auto mb-2" />
                <p class="text-sm text-muted">Sin datos de cooperativa registrados.</p>
              </div>
            </div>
          </template>

          <template #depositos>
            <div class="pt-4 space-y-3">
              <div
                class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md border border-default bg-elevated/40"
              >
                <p class="text-xs text-muted">
                  {{ depositosDetalle.length }} boleta(s) registrada(s)
                </p>
                <p class="text-sm font-semibold text-highlighted">
                  Total: {{ formatImporteBs(totalImporteDepositos) }}
                </p>
              </div>

              <div class="space-y-2 max-h-[min(28rem,58vh)] overflow-y-auto pr-1">
                <div
                  v-for="(dep, idx) in depositosDetalle"
                  :key="dep.id || `${dep.numero}-${idx}`"
                  class="p-4 rounded-md border border-default bg-elevated/30 space-y-3"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <UIcon name="i-lucide-receipt" class="size-4 text-primary shrink-0" />
                      <p class="text-sm font-semibold text-highlighted font-mono truncate">
                        {{ dep.numero || '—' }}
                      </p>
                    </div>
                    <UBadge
                      :color="dep.verificado ? 'success' : 'warning'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ dep.verificado ? 'Verificado' : 'Pendiente' }}
                    </UBadge>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Importe</p>
                      <p class="text-default font-medium">{{ formatImporteBs(dep.importe) }}</p>
                    </div>
                    <div>
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Fecha depósito</p>
                      <p class="text-default">{{ formatFechaSolo(dep.fecha_deposito) }}</p>
                    </div>
                    <div v-if="dep.observacion?.trim()" class="sm:col-span-2">
                      <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Observación</p>
                      <p class="text-default whitespace-pre-wrap">{{ dep.observacion }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template #legalizacion>
            <LegalizacionDetallePanel
              :correspondencia-id="detalle.id"
              :derivaciones="detalle.derivaciones"
              :active="activeTab === 'legalizacion'"
            />
          </template>

          <template #hoja_ruta>
            <div class="pt-4 space-y-4">
              <div
                v-if="hojaRutaData?.hoja_ruta || detalle.hoja_ruta"
                class="p-4 rounded-md border border-default bg-elevated/40 space-y-3"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-bold uppercase tracking-wider text-muted">
                      Hoja de ruta
                    </p>
                    <p class="text-lg font-semibold text-highlighted tabular-nums mt-0.5">
                      HR
                      {{
                        hojaRutaData?.hoja_ruta?.numero ?? detalle.hoja_ruta?.numero
                      }}/{{
                        hojaRutaData?.hoja_ruta?.anio ?? detalle.hoja_ruta?.anio
                      }}
                    </p>
                  </div>
                  <UBadge color="primary" variant="subtle" size="sm">
                    {{ hojaRutaData?.total ?? '—' }} proceso(s)
                  </UBadge>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Área</p>
                    <p class="text-default">
                      {{
                        hojaRutaData?.hoja_ruta?.areas?.nombre
                          || detalle.hoja_ruta?.areas?.nombre
                          || '—'
                      }}
                    </p>
                  </div>
                  <div class="sm:col-span-2">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Referencia HR</p>
                    <p class="text-default line-clamp-3">
                      {{
                        hojaRutaData?.hoja_ruta?.referencia?.trim()
                          || detalle.hoja_ruta?.referencia?.trim()
                          || '—'
                      }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-if="loadingHojaRuta" class="space-y-2">
                <USkeleton class="h-12 w-full" />
                <USkeleton class="h-12 w-full" />
                <USkeleton class="h-12 w-full" />
              </div>

              <div v-else-if="hojaRutaData?.correspondencias?.length" class="space-y-2">
                <p class="text-xs font-semibold text-muted uppercase tracking-wider">
                  Correspondencias en esta HR
                </p>
                <ul class="divide-y divide-default border border-default rounded-md overflow-hidden max-h-[min(28rem,58vh)] overflow-y-auto">
                  <li
                    v-for="item in hojaRutaData.correspondencias"
                    :key="item.id"
                    class="p-3 bg-default/30 hover:bg-elevated/50 transition-colors"
                    :class="item.id === detalle.id ? 'ring-1 ring-inset ring-primary/40 bg-primary/5' : ''"
                  >
                    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div class="min-w-0 flex-1 space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="text-xs font-mono text-primary-600 dark:text-primary-400 font-semibold">
                            {{
                              item.cite_origen?.trim()
                                || `Nº ${item.nro}/${item.gestion}`
                            }}
                          </span>
                          <UBadge
                            v-if="item.id === detalle.id"
                            color="primary"
                            variant="subtle"
                            size="xs"
                          >
                            Actual
                          </UBadge>
                          <UBadge
                            v-if="item.estado?.nombre"
                            color="neutral"
                            variant="outline"
                            size="xs"
                          >
                            {{ item.estado.nombre }}
                          </UBadge>
                        </div>
                        <p class="text-sm font-medium text-highlighted line-clamp-2">
                          {{ item.referencia }}
                        </p>
                        <p class="text-xs text-muted">
                          <span class="font-medium">Proceso:</span>
                          {{ item.proceso?.nombre || '—' }}
                          <span v-if="item.proceso?.codigo" class="font-mono opacity-80">
                            ({{ item.proceso.codigo }})
                          </span>
                          · Emisión: {{ formatFechaSolo(item.fecha_emision) }}
                        </p>
                      </div>
                      <UButton
                        v-if="item.id !== detalle.id"
                        size="xs"
                        color="neutral"
                        variant="soft"
                        icon="i-lucide-external-link"
                        label="Ver"
                        @click="abrirCorrespondenciaHr(item)"
                      />
                    </div>
                  </li>
                </ul>
              </div>

              <div v-else class="py-8 text-center">
                <UIcon name="i-lucide-route" class="size-10 text-dimmed mx-auto mb-2" />
                <p class="text-sm text-muted">No hay otros procesos vinculados a esta hoja de ruta.</p>
              </div>
            </div>
          </template>

          <template #adjuntos>
            <div class="pt-4">
              <CorrespondenciaAdjuntosPanel
                :correspondencia-id="detalle.id"
                :correspondencia="detalle"
                :solo-lectura="true"
                :active="activeTab === 'adjuntos'"
              />
            </div>
          </template>

          <template #derivaciones>
            <div class="pt-4">
              <div v-if="detalle.derivaciones?.length" class="space-y-2 max-h-[min(28rem,58vh)] overflow-y-auto pr-1">
                <div
                  v-for="d in detalle.derivaciones"
                  :key="d.id"
                  class="p-3 rounded-md border border-default bg-default/50"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-sm font-semibold truncate text-highlighted">{{ etiquetaDerivacion(d) }}</p>
                      <p class="text-xs text-muted mt-0.5">
                        {{ d.codificador?.nombre || 'Instrucción' }} · {{ formatFecha(d.fecha_envio) }}
                      </p>
                    </div>
                    <UBadge
                      :color="d.leido ? 'success' : 'warning'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ d.leido ? 'Leído' : 'No leído' }}
                    </UBadge>
                  </div>
                  <p class="text-xs mt-2 text-default whitespace-pre-wrap">
                    {{ d.instruccion }}
                  </p>
                  <div
                    v-if="d.destinatarios_copia?.length"
                    class="mt-2 flex flex-wrap gap-1"
                  >
                    <UBadge
                      v-for="cc in d.destinatarios_copia"
                      :key="cc.id"
                      color="neutral"
                      variant="outline"
                      size="xs"
                    >
                      CC: {{ cc.nombre || cc.cargos?.nombre || '—' }}
                      <span class="opacity-70">({{ cc.leido ? 'leído' : 'pendiente' }})</span>
                    </UBadge>
                  </div>
                </div>
              </div>
              <div v-else class="py-10 text-center">
                <UIcon name="i-lucide-git-branch" class="size-10 text-dimmed mx-auto mb-2" />
                <p class="text-sm text-muted">Sin derivaciones registradas.</p>
              </div>
            </div>
          </template>
        </UTabs>
      </div>
    </template>

    <template #footer>
      <div class="flex flex-wrap items-center justify-end gap-2 w-full">
        <UButton
          label="Generar HR"
          icon="i-lucide-route"
          color="primary"
          variant="soft"
          :loading="descargandoHr"
          :disabled="!detalle?.id || loading"
          @click="descargarHojaRutaPdf"
        />
        <UButton
          v-if="tieneDocumentoOficial"
          label="Ver documento"
          icon="i-lucide-file-text"
          color="primary"
          variant="soft"
          :loading="abriendoDocumento"
          @click="verDocumentoOnlyOffice"
        />
        <UButton
          v-if="tieneDocumentoOficial"
          label="Descargar"
          icon="i-lucide-download"
          color="neutral"
          variant="outline"
          :loading="descargandoDocumento"
          @click="descargarDocumentoOficial"
        />
        <UButton label="Cerrar" color="neutral" variant="outline" @click="open = false" />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="showEditor"
    fullscreen
    :ui="{ content: 'h-screen w-screen max-w-none rounded-none' }"
    @update:open="(v: boolean) => { if (!v) cerrarEditorOnlyOffice() }"
  >
    <template #content>
      <div class="flex flex-col h-full w-full bg-default">
        <div class="flex items-center justify-between px-4 py-3 border-b border-default shrink-0">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-semibold text-highlighted truncate">
                {{ editorTitle }}
              </h3>
              <UBadge color="warning" variant="subtle" size="xs">
                Solo lectura
              </UBadge>
            </div>
            <p v-if="detalle" class="text-xs text-muted truncate">
              {{ etiquetaNumeroCorrespondencia(detalle) }} — {{ detalle.referencia }}
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
</template>
