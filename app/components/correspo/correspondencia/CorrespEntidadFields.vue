<script setup lang="ts">
import EntidadSelect from '~/components/correspondencia/EntidadSelect.vue'

const entidadId = defineModel<number | undefined>('entidadId')
const remitenteEntidad = defineModel<string>('remitenteEntidad', { default: '' })
const citeOrigen = defineModel<string>('citeOrigen', { default: '' })
</script>

<template>
  <div class="p-4 rounded-md border border-default bg-elevated/30 space-y-4">
    <div class="flex items-start gap-2">
      <UIcon name="i-lucide-building-2" class="size-4 text-primary mt-0.5 shrink-0" />
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-highlighted">
          Entidad externa
        </p>
        <p class="text-[11px] text-muted mt-0.5">
          El proceso seleccionado requiere vincular una entidad y registrar al remitente externo.
        </p>
      </div>
    </div>

    <EntidadSelect
      v-model="entidadId"
      v-model:remitente-entidad="remitenteEntidad"
      v-model:cite-origen="citeOrigen"
    />
  </div>
</template>
