<script setup lang="ts">
import type { Correspondencia } from '~/types/correspondencia'
import {
  correspondenciaTieneAlertaDepositoPendiente,
  MENSAJE_ALERTA_DEPOSITO_PENDIENTE,
} from '~/utils/correspondencia'

const props = defineProps<{
  correspondencia: Pick<
    Correspondencia,
    'alerta_deposito_pendiente' | 'proceso' | 'depositos'
  >
}>()

const visible = computed(() =>
  correspondenciaTieneAlertaDepositoPendiente(props.correspondencia),
)
</script>

<template>
  <UTooltip
    v-if="visible"
    :text="MENSAJE_ALERTA_DEPOSITO_PENDIENTE"
    :content="{ side: 'left', align: 'center' }"
  >
    <span
      class="inline-flex size-7 items-center justify-center shrink-0"
      aria-label="Depósito pendiente de verificación"
    >
      <UIcon name="i-lucide-triangle-alert" class="size-4 text-error" />
    </span>
  </UTooltip>
</template>
