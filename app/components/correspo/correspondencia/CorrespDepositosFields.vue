<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RecDepositoPayload } from '~/types/correspo/correspondencia'
import type { RespuestaApi } from '~/types/shared/respuestas'
import { get } from '~/services/backend.service'

export type CorrespDepositoFormItem = RecDepositoPayload & { _key: string }

const props = defineProps<{
  /** Al editar, excluye depósitos ya ligados a esta correspondencia. */
  excludeCodigoUnico?: string | null
}>()

const model = defineModel<CorrespDepositoFormItem[]>({ required: true })

const toast = useToast()

type ExisteDepositoResp = {
  existe: boolean
  deposito_id?: string
  numero?: string
  fecha_deposito?: string
  correspondencia?: { referencia?: string | null } | null
}

const erroresPorKey = ref<Record<string, string>>({})
const verificandoKey = ref<string | null>(null)
const timers = new Map<string, ReturnType<typeof setTimeout>>()

const emptyItem = (): CorrespDepositoFormItem => ({
  _key: crypto.randomUUID(),
  numero: '',
  importe: undefined as unknown as number,
  fecha_deposito: new Date().toISOString().slice(0, 10),
  observacion: '',
})

const agregarBoleta = () => {
  model.value = [...model.value, emptyItem()]
}

const eliminarBoleta = (key: string) => {
  const timer = timers.get(key)
  if (timer) {
    clearTimeout(timer)
    timers.delete(key)
  }
  const nextErrors = { ...erroresPorKey.value }
  delete nextErrors[key]
  erroresPorKey.value = nextErrors

  if (model.value.length <= 1) {
    model.value = [emptyItem()]
    return
  }
  model.value = model.value.filter((item) => item._key !== key)
  revalidarDuplicadosLocales()
}

function formatImporte(n: number): string {
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)
}

const totalImporte = computed(() =>
  model.value.reduce((sum, item) => sum + (Number(item.importe) || 0), 0),
)

function claveDeposito(numero: string, fecha: string): string {
  return `${numero.trim().toLowerCase()}|${fecha.trim().slice(0, 10)}`
}

function revalidarDuplicadosLocales() {
  const counts = new Map<string, string[]>()
  for (const item of model.value) {
    const numero = item.numero?.trim() || ''
    const fecha = item.fecha_deposito?.trim().slice(0, 10) || ''
    if (!numero || !fecha) continue
    const key = claveDeposito(numero, fecha)
    const list = counts.get(key) || []
    list.push(item._key)
    counts.set(key, list)
  }

  const next = { ...erroresPorKey.value }
  for (const item of model.value) {
    const msgLocal = 'Esta boleta (número + fecha) ya está en el formulario'
    if (next[item._key] === msgLocal) {
      delete next[item._key]
    }
  }

  for (const keys of counts.values()) {
    if (keys.length < 2) continue
    for (const k of keys) {
      next[k] = 'Esta boleta (número + fecha) ya está en el formulario'
    }
  }
  erroresPorKey.value = next
}

async function verificarEnServidor(item: CorrespDepositoFormItem) {
  const numero = item.numero?.trim() || ''
  const fecha = item.fecha_deposito?.trim().slice(0, 10) || ''
  if (!numero || !fecha) {
    if (erroresPorKey.value[item._key]?.includes('ya está registrada')) {
      const next = { ...erroresPorKey.value }
      delete next[item._key]
      erroresPorKey.value = next
    }
    return
  }

  // Si ya hay duplicado local, no consultar API
  revalidarDuplicadosLocales()
  if (erroresPorKey.value[item._key]?.includes('formulario')) {
    return
  }

  verificandoKey.value = item._key
  try {
    const params: Record<string, string> = {
      numero,
      fecha_deposito: fecha,
    }
    if (props.excludeCodigoUnico) {
      params.exclude_codigo_unico = props.excludeCodigoUnico
    }
    // Si el ítem ya tiene id (edición), excluirlo también
    if (item.id) {
      params.exclude_deposito_id = item.id
    }

    const res = await get<ExisteDepositoResp>('recaudaciones/existe', params)
    const data =
      (res as RespuestaApi<ExisteDepositoResp>)?.data
      ?? (res as ExisteDepositoResp)

    const next = { ...erroresPorKey.value }
    if (data?.existe) {
      const ref = data.correspondencia?.referencia?.trim()
      next[item._key] = ref
        ? `Ya registrada (trámite: ${ref})`
        : 'Esta boleta (número + fecha) ya está registrada'
    } else if (next[item._key] && !next[item._key].includes('formulario')) {
      delete next[item._key]
    }
    erroresPorKey.value = next
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo validar la boleta',
      description:
        err?.data?.message
        || err?.message
        || 'Error al consultar depósitos existentes.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
    })
  } finally {
    if (verificandoKey.value === item._key) {
      verificandoKey.value = null
    }
  }
}

function programarVerificacion(item: CorrespDepositoFormItem) {
  revalidarDuplicadosLocales()
  const prev = timers.get(item._key)
  if (prev) clearTimeout(prev)
  timers.set(
    item._key,
    setTimeout(() => {
      void verificarEnServidor(item)
    }, 450),
  )
}

function onNumeroOFechaChange(item: CorrespDepositoFormItem) {
  programarVerificacion(item)
}

const tieneErroresDuplicado = computed(() =>
  Object.keys(erroresPorKey.value).length > 0,
)

function validarAntesDeGuardar(): boolean {
  revalidarDuplicadosLocales()
  if (tieneErroresDuplicado.value) {
    toast.add({
      title: 'Boletas duplicadas',
      description:
        'Corrija las boletas con el mismo número y fecha (en el formulario o ya registradas).',
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
    })
    return false
  }
  return true
}

defineExpose({
  validarAntesDeGuardar,
  tieneErroresDuplicado,
})

if (model.value.length === 0) {
  model.value = [emptyItem()]
}

watch(
  () => props.excludeCodigoUnico,
  () => {
    for (const item of model.value) {
      if (item.numero?.trim() && item.fecha_deposito) {
        programarVerificacion(item)
      }
    }
  },
)
</script>

<template>
  <div class="space-y-3">
    <div
      class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-default bg-elevated/40 px-3 py-2 text-sm"
    >
      <div class="flex min-w-0 flex-1 items-start gap-2">
        <UIcon name="i-lucide-receipt" class="size-4 text-primary mt-0.5 shrink-0" />
        <div class="min-w-0">
          <p class="text-xs font-medium text-highlighted">
            Boletas de depósito
          </p>
          <p class="text-[11px] text-muted leading-snug">
            No se permiten boletas con el mismo número y fecha ya registradas.
          </p>
        </div>
      </div>
      <UBadge color="neutral" variant="subtle" size="sm">
        {{ model.length }} boleta(s)
      </UBadge>
    </div>

    <div class="flex items-center justify-between gap-2">
      <p class="text-xs font-medium text-muted">
        Detalle
        <span class="text-default">({{ model.length }})</span>
      </p>
      <UButton
        type="button"
        label="Agregar"
        icon="i-lucide-plus"
        color="neutral"
        variant="soft"
        size="xs"
        @click="agregarBoleta"
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <article
        v-for="(item, index) in model"
        :key="item._key"
        class="min-w-0 rounded-lg border p-2.5 space-y-2"
        :class="
          erroresPorKey[item._key]
            ? 'border-error/50 bg-error/5'
            : 'border-default bg-default/30'
        "
      >
        <div class="flex items-center justify-between gap-1">
          <span
            class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-muted"
          >
            {{ index + 1 }}
          </span>
          <div class="flex items-center gap-1">
            <UIcon
              v-if="verificandoKey === item._key"
              name="i-lucide-loader-circle"
              class="size-3.5 animate-spin text-muted"
            />
            <UButton
              type="button"
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              square
              :disabled="model.length <= 1"
              aria-label="Quitar boleta"
              @click="eliminarBoleta(item._key)"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <UFormField
            :label="'Nº boleta'"
            :name="`depositos.${index}.numero`"
            size="sm"
            class="min-w-0"
            required
            :error="erroresPorKey[item._key]"
          >
            <UInput
              v-model="item.numero"
              placeholder="Nº boleta"
              icon="i-lucide-hash"
              size="sm"
              class="w-full"
              maxlength="200"
              @update:model-value="onNumeroOFechaChange(item)"
              @blur="verificarEnServidor(item)"
            />
          </UFormField>

          <UFormField
            label="Importe (Bs.)"
            :name="`depositos.${index}.importe`"
            size="sm"
            class="min-w-0"
            required
          >
            <UInput
              v-model.number="item.importe"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              icon="i-lucide-banknote"
              size="sm"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Fecha"
            :name="`depositos.${index}.fecha_deposito`"
            size="sm"
            class="min-w-0"
            required
          >
            <UInput
              v-model="item.fecha_deposito"
              type="date"
              size="sm"
              class="w-full"
              @update:model-value="onNumeroOFechaChange(item)"
              @blur="verificarEnServidor(item)"
            />
          </UFormField>

          <UFormField
            label="Observación"
            :name="`depositos.${index}.observacion`"
            size="sm"
            class="min-w-0"
          >
            <UInput
              v-model="item.observacion"
              placeholder="Opcional"
              size="sm"
              class="w-full"
              maxlength="500"
            />
          </UFormField>
        </div>
      </article>
    </div>

    <div
      class="rounded-md border border-default bg-elevated/30 px-3 py-2 flex flex-wrap items-center justify-between gap-2"
    >
      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">
        Total depósitos
      </p>
      <p class="text-sm font-bold text-highlighted tabular-nums">
        Bs {{ formatImporte(totalImporte) }}
      </p>
    </div>
  </div>
</template>
