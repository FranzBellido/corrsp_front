<script setup lang="ts">
import { computed } from 'vue'
import type { RecDepositoPayload } from '~/types/correspondencia'

export type CorrespDepositoFormItem = RecDepositoPayload & { _key: string }

const model = defineModel<CorrespDepositoFormItem[]>({ required: true })

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
  if (model.value.length <= 1) {
    model.value = [emptyItem()]
    return
  }
  model.value = model.value.filter((item) => item._key !== key)
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

if (model.value.length === 0) {
  model.value = [emptyItem()]
}
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
            Al menos una boleta asociada al trámite.
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
        class="min-w-0 rounded-lg border border-default bg-default/30 p-2.5 space-y-2"
      >
        <div class="flex items-center justify-between gap-1">
          <span
            class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-muted"
          >
            {{ index + 1 }}
          </span>
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

        <div class="grid grid-cols-2 gap-2">
          <UFormField
            :label="'Nº boleta'"
            :name="`depositos.${index}.numero`"
            size="sm"
            class="min-w-0"
            required
          >
            <UInput
              v-model="item.numero"
              placeholder="Nº boleta"
              icon="i-lucide-hash"
              size="sm"
              class="w-full"
              maxlength="200"
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
