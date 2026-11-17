<script setup lang="ts">
import { computed } from 'vue'
import type { PoaEstadoVista } from '~/types/poa/poa-estado'
import { resolverPoaEstadoUi } from '~/utils/poa/poaEstadoUi'

const props = withDefaults(
  defineProps<{
    estado?: PoaEstadoVista | null
    /** Si solo llega el nombre (p. ej. log o listados planos). */
    nombre?: string | null
    size?: 'xs' | 'sm' | 'md'
    variant?: 'subtle' | 'solid' | 'outline' | 'soft'
  }>(),
  {
    size: 'xs',
    variant: 'subtle',
  },
)

const ui = computed(() => resolverPoaEstadoUi(props.estado, props.nombre ?? undefined))
</script>

<template>
  <UBadge :color="ui.color" :variant="variant" :size="size" :icon="ui.icono" class="font-medium">
    {{ ui.nombre }}
  </UBadge>
</template>