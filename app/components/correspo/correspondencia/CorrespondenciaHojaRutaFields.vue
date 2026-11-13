<script setup lang="ts">
const tipoHr = defineModel<'nueva' | 'existente'>('tipoHr', { required: true })
const nroHrInput = defineModel<number | undefined>('nroHrInput')
const hrEncontrada = defineModel<Record<string, unknown> | null>('hrEncontrada', { default: null })
const errorHr = defineModel<string | null>('errorHr', { default: null })

const props = defineProps<{
  verificandoHr?: boolean
  /** Respuesta desde bandeja ingreso: solo HR existente precargada */
  fijarHrExistente?: boolean
}>()

const emit = defineEmits<{
  (e: 'verificar'): void
}>()
</script>

<template>
  <div class="p-4 rounded-md border border-default bg-elevated/30 space-y-3">
    <label class="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
      <UIcon name="i-lucide-git-branch" class="size-4 text-primary" />
      Gestión de Hoja de Ruta (HR)
    </label>

    <div class="grid grid-cols-1 gap-3" :class="fijarHrExistente ? '' : 'sm:grid-cols-2'">
      <button
        v-if="!fijarHrExistente"
        type="button"
        class="p-3 rounded-md border text-left transition-all flex items-start gap-2.5 cursor-pointer"
        :class="[
          tipoHr === 'nueva'
            ? 'border-primary bg-primary/5 text-highlighted ring-2 ring-primary/20'
            : 'border-default hover:border-muted',
        ]"
        @click="tipoHr = 'nueva'"
      >
        <UIcon name="i-lucide-plus-circle" class="size-5 shrink-0 text-primary mt-0.5" />
        <div>
          <div class="font-semibold text-xs">Nueva Hoja de Ruta</div>
          <div class="text-[11px] text-muted">
            Asigna el siguiente número HR global de la gestión (único en toda la institución).
          </div>
        </div>
      </button>

      <button
        type="button"
        class="p-3 rounded-md border text-left transition-all flex items-start gap-2.5 cursor-pointer"
        :class="[
          tipoHr === 'existente'
            ? 'border-primary bg-primary/5 text-highlighted ring-2 ring-primary/20'
            : 'border-default hover:border-muted',
        ]"
        @click="tipoHr = 'existente'"
      >
        <UIcon name="i-lucide-link" class="size-5 shrink-0 text-primary mt-0.5" />
        <div>
          <div class="font-semibold text-xs">Asociar a HR existente</div>
          <div class="text-[11px] text-muted">Vincular a un expediente o trámite ya iniciado</div>
        </div>
      </button>
    </div>

    <div v-if="tipoHr === 'existente'" class="pt-1 space-y-2">
      <div class="flex gap-2">
        <UInput
          v-model.number="nroHrInput"
          type="number"
          placeholder="Nº de Hoja de Ruta (ej. 142)"
          icon="i-lucide-hash"
          class="flex-1"
          :readonly="fijarHrExistente"
          @keyup.enter="emit('verificar')"
        />
        <UButton
          v-if="!fijarHrExistente"
          label="Verificar HR"
          icon="i-lucide-search"
          color="neutral"
          variant="subtle"
          :loading="props.verificandoHr"
          @click="emit('verificar')"
        />
      </div>

      <div
        v-if="hrEncontrada"
        class="p-2.5 rounded-md bg-success/10 border border-success/30 text-xs text-success flex items-center justify-between gap-2"
      >
        <div class="flex items-center gap-2 min-w-0">
          <UIcon name="i-lucide-check-circle-2" class="size-4 shrink-0" />
          <span class="truncate">
            <strong>HR Nº {{ hrEncontrada.numero }}/{{ hrEncontrada.anio }}:</strong>
            {{ hrEncontrada.referencia || 'Sin referencia registrada' }}
          </span>
        </div>
        <UBadge color="success" variant="subtle" size="xs">Válida</UBadge>
      </div>

      <div
        v-if="errorHr"
        class="p-2.5 rounded-md bg-error/10 border border-error/30 text-xs text-error flex items-center gap-2"
      >
        <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
        <span>{{ errorHr }}</span>
      </div>
    </div>
  </div>
</template>
