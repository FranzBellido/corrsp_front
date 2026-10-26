<script setup lang="ts">
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

if (model.value.length === 0) {
  model.value = [emptyItem()]
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start gap-2">
      <UIcon name="i-lucide-receipt" class="size-4 text-primary mt-0.5 shrink-0" />
      <div class="flex-1">
        <p class="text-xs font-bold uppercase tracking-wider text-highlighted">
          Boletas de depósito
        </p>
        <p class="text-[11px] text-muted mt-0.5">
          El proceso requiere registrar al menos una boleta de depósito bancario asociada al trámite.
        </p>
      </div>
      <UButton
        type="button"
        size="xs"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        label="Agregar boleta"
        @click="agregarBoleta"
      />
    </div>

    <div
      v-for="(item, index) in model"
      :key="item._key"
      class="p-4 rounded-md border border-default bg-elevated/30 space-y-3"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-semibold text-highlighted">
          Boleta {{ index + 1 }}
        </p>
        <UButton
          type="button"
          size="xs"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          :disabled="model.length <= 1"
          @click="eliminarBoleta(item._key)"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UFormField
          :label="'Nº boleta'"
          :name="`depositos.${index}.numero`"
          required
        >
          <UInput
            v-model="item.numero"
            placeholder="Ej. 001234567"
            icon="i-lucide-hash"
            class="w-full"
            maxlength="200"
          />
        </UFormField>

        <UFormField
          label="Importe (Bs.)"
          :name="`depositos.${index}.importe`"
          required
        >
          <UInput
            v-model.number="item.importe"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            icon="i-lucide-banknote"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UFormField
          label="Fecha de depósito"
          :name="`depositos.${index}.fecha_deposito`"
          required
        >
          <UInput
            v-model="item.fecha_deposito"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Observación"
          :name="`depositos.${index}.observacion`"
        >
          <UInput
            v-model="item.observacion"
            placeholder="Opcional"
            class="w-full"
            maxlength="500"
          />
        </UFormField>
      </div>
    </div>
  </div>
</template>
