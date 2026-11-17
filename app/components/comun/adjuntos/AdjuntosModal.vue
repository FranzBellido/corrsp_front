<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** Prefijo API: correspondencia | seguimiento-actividades | … */
    apiResource: string
    itemId?: string | null
    soloLectura?: boolean
  }>(),
  {
    title: 'Adjuntos',
    description: undefined,
    itemId: null,
    soloLectura: false,
  },
)

const open = defineModel<boolean>('open', { default: false })

const descripcionModal = computed(() => {
  if (props.description) return props.description
  return props.soloLectura
    ? 'Consulta de archivos adjuntos (solo lectura).'
    : 'Suba archivos y registre una descripción.'
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="descripcionModal"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <AdjuntosPanel
        :api-resource="apiResource"
        :item-id="itemId"
        :solo-lectura="soloLectura"
        :active="open"
      />
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton label="Cerrar" color="neutral" variant="outline" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
