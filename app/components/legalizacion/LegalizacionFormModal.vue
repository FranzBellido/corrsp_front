<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  GuardarLegalizacionPayload,
  LeArancelTramite,
  LegalizacionResumen,
} from '~/types/legalizacion'
import type { RespuestaApi } from '~/types/respuestas'
import { get, postGenerico } from '~/services/backend.service'

interface LineaForm {
  key: string
  id_arancel: number | null
  documento: string
  cantidad: number
  n_hojas: number | null
}

const props = defineProps<{
  correspondenciaId?: string | null
  derivacionId?: string | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const aranceles = ref<LeArancelTramite[]>([])
const resumen = ref<LegalizacionResumen | null>(null)
const lineas = ref<LineaForm[]>([])

let keySeq = 0
function nuevaKey() {
  keySeq += 1
  return `lin-${keySeq}`
}

function lineaVacia(): LineaForm {
  return {
    key: nuevaKey(),
    id_arancel: null,
    documento: '',
    cantidad: 1,
    n_hojas: null,
  }
}

const arancelById = computed(() => {
  const map = new Map<number, LeArancelTramite>()
  for (const a of aranceles.value) map.set(a.id, a)
  return map
})

function arancelDe(linea: LineaForm): LeArancelTramite | null {
  if (linea.id_arancel == null) return null
  return arancelById.value.get(linea.id_arancel) ?? null
}

function esVariable(linea: LineaForm): boolean {
  return Boolean(arancelDe(linea)?.variable)
}

function costoLinea(linea: LineaForm): number {
  const a = arancelDe(linea)
  if (!a) return 0
  const cantidad = Number(linea.cantidad) || 0
  const unitario = Number(a.costo_tramite) || 0
  if (a.variable) {
    const hojas = Number(linea.n_hojas) || 0
    return redondear(unitario * cantidad * hojas)
  }
  return redondear(unitario * cantidad)
}

const totalLegalizacion = computed(() =>
  redondear(lineas.value.reduce((sum, l) => sum + costoLinea(l), 0)),
)

const totalDepositos = computed(() =>
  redondear(Number(resumen.value?.total_depositos) || 0),
)

const depositosSuficientes = computed(() => {
  if (totalDepositos.value <= 0) return false
  return totalDepositos.value + 0.01 >= totalLegalizacion.value
})

const arancelOptions = computed(() =>
  aranceles.value.map((a) => ({
    label: `${a.nombre} — Bs ${formatImporte(a.costo_tramite)}${a.variable ? ' (variable)' : ''}`,
    value: a.id,
  })),
)

function arancelesDisponiblesPara(linea: LineaForm) {
  const usados = new Set(
    lineas.value
      .filter((l) => l.key !== linea.key && l.id_arancel != null)
      .map((l) => l.id_arancel as number),
  )
  return arancelOptions.value.filter(
    (o) => o.value === linea.id_arancel || !usados.has(o.value),
  )
}

function formatImporte(n: number): string {
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)
}

function redondear(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

function onArancelChange(linea: LineaForm) {
  if (!esVariable(linea)) {
    linea.n_hojas = null
  } else if (!linea.n_hojas || linea.n_hojas < 1) {
    linea.n_hojas = 1
  }
}

function agregarLinea() {
  lineas.value.push(lineaVacia())
}

function quitarLinea(key: string) {
  if (lineas.value.length <= 1) {
    lineas.value = [lineaVacia()]
    return
  }
  lineas.value = lineas.value.filter((l) => l.key !== key)
}

async function cargar() {
  const id = props.correspondenciaId
  if (!id) return
  loading.value = true
  try {
    const [arancelRes, detalleRes] = await Promise.all([
      get<LeArancelTramite[]>('legalizacion/aranceles'),
      get<LegalizacionResumen>(`legalizacion/${id}`),
    ])
    aranceles.value =
      (arancelRes as RespuestaApi<LeArancelTramite[]>)?.data ?? []
    resumen.value =
      (detalleRes as RespuestaApi<LegalizacionResumen>)?.data ?? null

    const items = resumen.value?.items ?? []
    if (items.length) {
      lineas.value = items.map((item) => ({
        key: nuevaKey(),
        id_arancel: item.id_arancel,
        documento: item.documento || '',
        cantidad: item.cantidad || 1,
        n_hojas: item.n_hojas ?? null,
      }))
    } else {
      lineas.value = [lineaVacia()]
    }
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo cargar la legalización',
      description: err?.data?.message || err?.message || 'Error al consultar.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    open.value = false
  } finally {
    loading.value = false
  }
}

async function guardar() {
  const id = props.correspondenciaId
  if (!id) return

  for (const linea of lineas.value) {
    if (linea.id_arancel == null) {
      toast.add({
        title: 'Complete el detalle',
        description: 'Seleccione un arancel en cada fila.',
        color: 'warning',
        icon: 'i-lucide-triangle-alert',
      })
      return
    }
    if (!linea.documento.trim()) {
      toast.add({
        title: 'Complete el detalle',
        description: 'Indique el documento en cada fila.',
        color: 'warning',
        icon: 'i-lucide-triangle-alert',
      })
      return
    }
    if (esVariable(linea) && (!linea.n_hojas || linea.n_hojas < 1)) {
      toast.add({
        title: 'Número de hojas requerido',
        description: 'Los aranceles variables requieren N° de hojas.',
        color: 'warning',
        icon: 'i-lucide-triangle-alert',
      })
      return
    }
  }

  if (!props.derivacionId) {
    toast.add({
      title: 'Derivación no identificada',
      description: 'No se pudo asociar la legalización a la derivación en bandeja.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  if (!depositosSuficientes.value) {
    toast.add({
      title: 'Depósito insuficiente',
      description: `El total de depósitos (Bs ${formatImporte(totalDepositos.value)}) no puede ser menor al costo de legalización (Bs ${formatImporte(totalLegalizacion.value)}).`,
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  const payload: GuardarLegalizacionPayload = {
    corresp_id: id,
    derivacion_id: props.derivacionId,
    items: lineas.value.map((l) => ({
      id_arancel: l.id_arancel as number,
      cantidad: Number(l.cantidad),
      documento: l.documento.trim(),
      n_hojas: esVariable(l) ? Number(l.n_hojas) : null,
    })),
  }

  saving.value = true
  try {
    await postGenerico<LegalizacionResumen>('legalizacion', payload)
    toast.add({
      title: 'Legalización guardada',
      description: 'El detalle de aranceles se registró correctamente.',
      color: 'success',
      icon: 'i-lucide-check',
    })
    emit('guardado')
    open.value = false
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo guardar',
      description: err?.data?.message || err?.message || 'Error al registrar.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    saving.value = false
  }
}

watch(
  () => [open.value, props.correspondenciaId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) void cargar()
    if (!isOpen) {
      resumen.value = null
      lineas.value = []
    }
  },
)
</script>

<template>
  <UModal
    v-model:open="open"
    title="Registrar legalización"
    description="Aranceles del trámite. Los depósitos deben cubrir al menos el costo total."
    :ui="{
      content:
        'w-[calc(100vw-1rem)] sm:max-w-3xl lg:max-w-[52rem] max-h-[min(92vh,52rem)] flex flex-col',
      body: 'overflow-y-auto min-h-0 flex-1 px-1 sm:px-2',
      header: 'pb-2',
      footer: 'pt-2 border-t border-default',
    }"
  >
    <template #body>
      <div v-if="loading" class="flex flex-col items-center justify-center py-10 gap-2">
        <UIcon name="i-lucide-loader-circle" class="size-7 text-primary animate-spin" />
        <p class="text-sm text-muted">Cargando legalización...</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-if="resumen"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-default bg-elevated/40 px-3 py-2 text-sm"
        >
          <div class="min-w-0 flex-1">
            <span class="text-muted text-xs">Correspondencia · </span>
            <span class="font-medium text-highlighted truncate">
              {{ resumen.referencia }}
            </span>
          </div>
          <UBadge
            :color="depositosSuficientes ? 'success' : 'warning'"
            variant="subtle"
            size="sm"
          >
            {{ depositosSuficientes ? 'Depósitos OK' : 'Depósito bajo' }}
          </UBadge>
        </div>

        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-medium text-muted">
            Detalle de trámites
            <span class="text-default">({{ lineas.length }})</span>
          </p>
          <UButton
            label="Agregar"
            icon="i-lucide-plus"
            color="neutral"
            variant="soft"
            size="xs"
            @click="agregarLinea"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <article
            v-for="(linea, idx) in lineas"
            :key="linea.key"
            class="rounded-lg border border-default bg-default/30 p-2.5 space-y-2 min-w-0"
          >
            <div class="flex items-center justify-between gap-1">
              <span
                class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-muted"
              >
                {{ idx + 1 }}
              </span>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                square
                :disabled="lineas.length <= 1"
                aria-label="Quitar trámite"
                @click="quitarLinea(linea.key)"
              />
            </div>

            <UFormField label="Arancel" size="sm" class="min-w-0">
              <USelect
                v-model="linea.id_arancel"
                :items="arancelesDisponiblesPara(linea)"
                value-key="value"
                placeholder="Seleccionar"
                size="sm"
                class="w-full min-w-0"
                @update:model-value="onArancelChange(linea)"
              />
            </UFormField>

            <UFormField label="Documento" size="sm">
              <UInput
                v-model="linea.documento"
                placeholder="Documento a legalizar"
                size="sm"
                class="w-full"
              />
            </UFormField>

            <div
              class="grid gap-2"
              :class="esVariable(linea) ? 'grid-cols-3' : 'grid-cols-2'"
            >
              <UFormField label="Cant." size="sm" class="min-w-0">
                <UInput
                  v-model.number="linea.cantidad"
                  type="number"
                  min="1"
                  size="sm"
                  class="w-full"
                />
              </UFormField>

              <UFormField v-if="esVariable(linea)" label="Hojas" size="sm" class="min-w-0">
                <UInput
                  v-model.number="linea.n_hojas"
                  type="number"
                  min="1"
                  size="sm"
                  class="w-full"
                />
              </UFormField>

              <div
                class="flex flex-col justify-end rounded-md bg-elevated/60 px-2 py-1.5 text-end min-w-0"
                :class="esVariable(linea) ? '' : 'col-span-1'"
              >
                <span class="text-[10px] uppercase tracking-wide text-muted leading-none">
                  Subtotal
                </span>
                <span class="text-sm font-semibold text-highlighted tabular-nums">
                  Bs {{ formatImporte(costoLinea(linea)) }}
                </span>
              </div>
            </div>
          </article>
        </div>

        <div
          class="grid grid-cols-3 gap-2 rounded-md border border-default bg-elevated/30 p-2.5 text-center sm:text-left"
        >
          <div class="min-w-0">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Depósitos
            </p>
            <p class="text-sm font-bold text-highlighted tabular-nums">
              Bs {{ formatImporte(totalDepositos) }}
            </p>
            <p class="text-[10px] text-muted hidden sm:block">
              {{ resumen?.depositos?.length || 0 }} boleta(s)
            </p>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Legalización
            </p>
            <p class="text-sm font-bold text-highlighted tabular-nums">
              Bs {{ formatImporte(totalLegalizacion) }}
            </p>
          </div>
          <div
            class="min-w-0 rounded-md px-1 py-0.5 sm:px-2"
            :class="
              depositosSuficientes
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning'
            "
          >
            <p class="text-[10px] font-semibold uppercase tracking-wide opacity-80">
              Saldo
            </p>
            <p class="text-sm font-bold tabular-nums">
              Bs {{ formatImporte(totalDepositos - totalLegalizacion) }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-muted hidden sm:block max-w-[14rem]">
          Puede registrar varios aranceles; cada uno solo una vez.
        </p>
        <div class="flex flex-1 justify-end gap-2">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="saving"
            @click="open = false"
          />
          <UButton
            label="Guardar"
            icon="i-lucide-stamp"
            color="primary"
            size="sm"
            :loading="saving"
            :disabled="loading || !depositosSuficientes"
            @click="guardar"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
