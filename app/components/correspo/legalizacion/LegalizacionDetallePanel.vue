<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Derivacion } from '~/types/derivacion'
import type { LegalizacionResumen } from '~/types/legalizacion'
import type { RespuestaApi } from '~/types/respuestas'
import { EstadoDerivacionEnum } from '~/types/estado'
import { get, descargarBlob } from '~/services/backend.service'

const props = defineProps<{
  correspondenciaId: string
  /** Derivaciones del documento (para resolver permiso de reportes). */
  derivaciones?: Derivacion[] | null
  /** Solo cargar cuando el tab está activo. */
  active?: boolean
}>()

const toast = useToast()
const { resolveCargoOrigenId } = useProfile()

const loading = ref(false)
const resumen = ref<LegalizacionResumen | null>(null)
const descargandoPdf = ref(false)
const descargandoVerificadorPdf = ref(false)

function formatImporte(n: number): string {
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)
}

function formatFechaLegalizacion(valor?: string | Date | null): string {
  if (!valor) return '—'
  const d = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const coopLegalizacion = computed(() => resumen.value?.corresp_cooperativa ?? null)

const muestraBloqueCooperativa = computed(
  () =>
    Boolean(
      coopLegalizacion.value?.fecha_legalizacion
      || coopLegalizacion.value?.doc_respaldo
      || coopLegalizacion.value?.nombre_usuario_elabora,
    ),
)

const tieneDetalle = computed(() => (resumen.value?.items?.length ?? 0) > 0)

const derivacionParaReporte = computed(() => {
  const lista = props.derivaciones ?? []
  if (!lista.length) return null
  const legalizada = lista.find(
    (d) => d.estado_id === EstadoDerivacionEnum.LEGALIZADO || d.estado?.id === EstadoDerivacionEnum.LEGALIZADO,
  )
  if (legalizada) return legalizada
  return [...lista].sort((a, b) => {
    const ta = a.fecha_envio ? new Date(a.fecha_envio).getTime() : 0
    const tb = b.fecha_envio ? new Date(b.fecha_envio).getTime() : 0
    return tb - ta
  })[0] ?? null
})

async function cargar() {
  if (!props.correspondenciaId) return
  loading.value = true
  try {
    const res = await get<LegalizacionResumen>(`legalizacion/${props.correspondenciaId}`)
    resumen.value =
      (res as RespuestaApi<LegalizacionResumen>)?.data
      ?? (res as LegalizacionResumen)
      ?? null
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo cargar la legalización',
      description: err?.data?.message || err?.message || 'Error al consultar.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    resumen.value = null
  } finally {
    loading.value = false
  }
}

async function descargarReporte(
  path: string,
  filename: string,
  loadingRef: typeof descargandoPdf,
  okTitle: string,
  okDescription: string,
) {
  const id = props.correspondenciaId
  const derivacionId = derivacionParaReporte.value?.id
  if (!id || !derivacionId) {
    toast.add({
      title: 'No se puede generar el reporte',
      description:
        'No hay una derivación asociada para autorizar la descarga, o aún no se registró legalización.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
    })
    return
  }

  const modos: Array<'ingreso' | 'salida' | 'con_copia'> = ['ingreso', 'salida', 'con_copia']
  loadingRef.value = true
  let ultimoError: string | null = null

  try {
    for (const modo of modos) {
      try {
        const blob = await descargarBlob(
          path,
          {
            derivacion_id: derivacionId,
            modo,
            cargo_id: resolveCargoOrigenId() || undefined,
          },
          { expectPdf: true },
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        toast.add({
          title: okTitle,
          description: okDescription,
          color: 'success',
          icon: 'i-lucide-check',
        })
        return
      } catch (error: unknown) {
        const err = error as { data?: { message?: string }; message?: string }
        ultimoError = err?.data?.message || err?.message || 'Error al generar PDF'
      }
    }
    toast.add({
      title: 'No se pudo generar el PDF',
      description: ultimoError || 'Verifique permisos y parámetros del sistema.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loadingRef.value = false
  }
}

function descargarReportePdf() {
  const id = props.correspondenciaId
  void descargarReporte(
    `legalizacion/${id}/reporte/pdf`,
    `legalizacion_${id.slice(0, 8)}.pdf`,
    descargandoPdf,
    'Reporte PDF generado',
    'Hoja con código QR de seguimiento.',
  )
}

function descargarReporteVerificador() {
  const id = props.correspondenciaId
  void descargarReporte(
    `legalizacion/${id}/reporte/verificador-copias/pdf`,
    `formulario_01_${id.slice(0, 8)}.pdf`,
    descargandoVerificadorPdf,
    'Formulario 01 generado',
    'PDF con datos de legalización y encabezado institucional.',
  )
}

watch(
  () => [props.active, props.correspondenciaId] as const,
  ([active, id]) => {
    if (active && id) void cargar()
  },
  { immediate: true },
)
</script>

<template>
  <div class="pt-4 space-y-4">
    <div v-if="loading" class="flex flex-col items-center justify-center py-10 gap-2">
      <UIcon name="i-lucide-loader-circle" class="size-7 text-primary animate-spin" />
      <p class="text-sm text-muted">Cargando legalización...</p>
    </div>

    <template v-else-if="resumen">
      <div
        class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-default bg-elevated/40 px-3 py-2"
      >
        <div class="min-w-0">
          <p class="text-xs text-muted">
            {{ resumen.requiere_legalizacion ? 'Proceso con legalización' : 'Legalización registrada' }}
            <span v-if="resumen.items.length"> · {{ resumen.items.length }} trámite(s)</span>
          </p>
          <p class="text-sm font-medium text-highlighted truncate">
            {{ resumen.referencia }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            v-if="tieneDetalle"
            :color="resumen.montos_coinciden ? 'success' : 'warning'"
            variant="subtle"
            size="sm"
          >
            {{ resumen.montos_coinciden ? 'Depósitos OK' : 'Depósito bajo' }}
          </UBadge>
          <UButton
            label="PDF (QR)"
            icon="i-lucide-qr-code"
            color="neutral"
            variant="soft"
            size="xs"
            :loading="descargandoPdf"
            :disabled="
              !tieneDetalle
                || !derivacionParaReporte
                || descargandoVerificadorPdf
            "
            @click="descargarReportePdf"
          />
          <UButton
            label="Formulario 01"
            icon="i-lucide-file-text"
            color="primary"
            variant="soft"
            size="xs"
            :loading="descargandoVerificadorPdf"
            :disabled="
              !tieneDetalle
                || !derivacionParaReporte
                || descargandoPdf
            "
            @click="descargarReporteVerificador"
          />
        </div>
      </div>

      <div
        v-if="muestraBloqueCooperativa && coopLegalizacion"
        class="rounded-md border border-default bg-elevated/30 p-3 space-y-2"
      >
        <p class="text-[11px] font-bold uppercase tracking-wider text-muted">
          Registro en cooperativa
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wide text-muted mb-0.5">
              Fecha de legalización
            </p>
            <p class="text-default">
              {{ formatFechaLegalizacion(coopLegalizacion.fecha_legalizacion) }}
            </p>
          </div>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wide text-muted mb-0.5">
              Documento de respaldo
            </p>
            <p class="text-default break-words">
              {{ coopLegalizacion.doc_respaldo || '—' }}
            </p>
          </div>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wide text-muted mb-0.5">
              Elaborado por
            </p>
            <p class="text-default break-words">
              {{ coopLegalizacion.nombre_usuario_elabora || '—' }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="!tieneDetalle"
        class="py-10 text-center"
      >
        <UIcon name="i-lucide-stamp" class="size-10 text-dimmed mx-auto mb-2" />
        <p class="text-sm text-muted">
          Aún no hay detalle de legalización registrado para este documento.
        </p>
      </div>

      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[min(26rem,50vh)] overflow-y-auto pr-1">
          <article
            v-for="(item, idx) in resumen.items"
            :key="`${item.id_arancel}-${idx}`"
            class="min-w-0 rounded-lg border border-default bg-default/30 p-2.5 space-y-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span
                class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-muted"
              >
                {{ idx + 1 }}
              </span>
              <p class="text-sm font-semibold text-highlighted truncate min-w-0 flex-1 text-end sm:text-start">
                {{ item.arancel?.nombre || `Arancel #${item.id_arancel}` }}
              </p>
            </div>

            <div class="space-y-1.5 text-sm">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Observación</p>
                <p class="text-default whitespace-pre-wrap">{{ item.observacion || '—' }}</p>
              </div>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Resolución</p>
                <p class="text-default">{{ item.resolucion?.trim() || '—' }}</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 text-center sm:text-left">
              <div class="rounded-md bg-elevated/60 px-2 py-1.5">
                <p class="text-[10px] uppercase tracking-wide text-muted">Cant.</p>
                <p class="text-sm font-semibold tabular-nums">{{ item.cantidad }}</p>
              </div>
              <div class="rounded-md bg-elevated/60 px-2 py-1.5">
                <p class="text-[10px] uppercase tracking-wide text-muted">Hojas</p>
                <p class="text-sm font-semibold tabular-nums">
                  {{ item.n_hojas != null ? item.n_hojas : '—' }}
                </p>
              </div>
              <div class="rounded-md bg-elevated/60 px-2 py-1.5">
                <p class="text-[10px] uppercase tracking-wide text-muted">Costo</p>
                <p class="text-sm font-semibold tabular-nums">
                  Bs {{ formatImporte(item.costo) }}
                </p>
              </div>
            </div>
          </article>
        </div>

        <div
          class="grid grid-cols-3 gap-2 rounded-md border border-default bg-elevated/30 p-2.5 text-center sm:text-left"
        >
          <div class="min-w-0">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Depósitos</p>
            <p class="text-sm font-bold text-highlighted tabular-nums">
              Bs {{ formatImporte(resumen.total_depositos) }}
            </p>
            <p class="text-[10px] text-muted hidden sm:block">
              {{ resumen.depositos?.length || 0 }} boleta(s)
            </p>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Legalización</p>
            <p class="text-sm font-bold text-highlighted tabular-nums">
              Bs {{ formatImporte(resumen.total_legalizacion) }}
            </p>
          </div>
          <div
            class="min-w-0 rounded-md px-1 py-0.5 sm:px-2"
            :class="
              resumen.montos_coinciden
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning'
            "
          >
            <p class="text-[10px] font-semibold uppercase tracking-wide opacity-80">Saldo</p>
            <p class="text-sm font-bold tabular-nums">
              Bs {{ formatImporte(resumen.total_depositos - resumen.total_legalizacion) }}
            </p>
          </div>
        </div>
      </template>
    </template>

    <div v-else class="py-10 text-center">
      <UIcon name="i-lucide-stamp" class="size-10 text-dimmed mx-auto mb-2" />
      <p class="text-sm text-muted">Sin información de legalización.</p>
    </div>
  </div>
</template>
