<script setup lang="ts">
import { useAlertas } from '~/composables/correspo/useAlertas'
import { useProfile } from '~/composables/comun/useProfile'

const { totalAlertas, totalRojas, fetchAlertas } = useAlertas()
const { resolveCargoOrigenId } = useProfile()

onMounted(() => {
  void fetchAlertas(resolveCargoOrigenId())
})
</script>

<template>
  <UTooltip text="Alertas del sistema">
    <UButton
      to="/alertas"
      color="neutral"
      variant="ghost"
      class="relative"
      aria-label="Alertas del sistema"
    >
      <UChip
        :color="totalRojas > 0 ? 'error' : 'warning'"
        inset
        size="sm"
        :show="totalAlertas > 0"
        :text="totalAlertas > 9 ? '9+' : String(totalAlertas)"
      >
        <UIcon name="i-lucide-triangle-alert" class="size-5 shrink-0" />
      </UChip>
    </UButton>
  </UTooltip>
</template>
