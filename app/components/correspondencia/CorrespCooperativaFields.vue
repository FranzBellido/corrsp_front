<script setup lang="ts">
import CooperativaAutocomplete from '~/components/correspondencia/CooperativaAutocomplete.vue'

export interface CorrespCooperativaFormState {
  cooperativa_id: number | undefined
  solicitante: string
  nro_carnet: string
  cargo_solicitante: string
  correo_solicitante: string
  nro_poder: string
  nro_deposito: string
  importe: number | undefined
  telefono: string
}

const model = defineModel<CorrespCooperativaFormState>({ required: true })
</script>

<template>
  <div class="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-4">
    <div class="flex items-start gap-2">
      <UIcon name="i-lucide-handshake" class="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
          Datos del solicitante (cooperativa)
        </p>
        <p class="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
          El proceso seleccionado requiere vincular una cooperativa y registrar al solicitante.
        </p>
      </div>
    </div>

    <UFormField
      label="Cooperativa"
      name="cooperativa.cooperativa_id"
      required
      help="Busque por denominación o nro. de registro. Al seleccionar verá registro, sector, tipo y departamento."
    >
      <CooperativaAutocomplete v-model="model.cooperativa_id" />
    </UFormField>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField
        label="Solicitante"
        name="cooperativa.solicitante"
        required
        help="Nombre completo de quien presenta la solicitud."
      >
        <UInput
          v-model="model.solicitante"
          placeholder="Ej. Juan Pérez Mamani"
          icon="i-lucide-user"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Nro. de carnet"
        name="cooperativa.nro_carnet"
        required
      >
        <UInput
          v-model="model.nro_carnet"
          placeholder="Ej. 12345678 LP"
          icon="i-lucide-id-card"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField
        label="Cargo del solicitante"
        name="cooperativa.cargo_solicitante"
      >
        <UInput
          v-model="model.cargo_solicitante"
          placeholder="Ej. Representante legal"
          icon="i-lucide-briefcase"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Teléfono"
        name="cooperativa.telefono"
      >
        <UInput
          v-model="model.telefono"
          placeholder="Ej. 71234567"
          icon="i-lucide-phone"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField
      label="Correo del solicitante"
      name="cooperativa.correo_solicitante"
    >
      <UInput
        v-model="model.correo_solicitante"
        type="email"
        placeholder="Ej. contacto@cooperativa.bo"
        icon="i-lucide-mail"
        class="w-full"
      />
    </UFormField>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <UFormField
        label="Nro. de poder"
        name="cooperativa.nro_poder"
      >
        <UInput
          v-model="model.nro_poder"
          placeholder="Opcional"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Nro. de depósito"
        name="cooperativa.nro_deposito"
      >
        <UInput
          v-model="model.nro_deposito"
          placeholder="Opcional"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Importe"
        name="cooperativa.importe"
      >
        <UInput
          v-model.number="model.importe"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          icon="i-lucide-banknote"
          class="w-full"
        />
      </UFormField>
    </div>
  </div>
</template>
