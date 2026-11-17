<script setup lang="ts">
import { computed } from 'vue'
import type { Correspondencia } from '~/types/correspo/correspondencia'

const props = withDefaults(
  defineProps<{
    correspondencia?: Correspondencia | null
    correspondenciaId?: string | null
    soloLectura?: boolean
    /** Si es false, no carga hasta activarse (p. ej. pestaña visible). */
    active?: boolean
  }>(),
  {
    correspondencia: null,
    correspondenciaId: null,
    soloLectura: true,
    active: true,
  },
)

const docId = computed(
  () => props.correspondenciaId || props.correspondencia?.id || null,
)
</script>

<template>
  <AdjuntosPanel
    api-resource="correspondencia"
    :item-id="docId"
    :solo-lectura="soloLectura"
    :active="active"
  />
</template>
