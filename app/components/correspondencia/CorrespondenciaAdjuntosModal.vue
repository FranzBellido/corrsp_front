<script setup lang="ts">
import { computed } from 'vue'
import type { Correspondencia } from '~/types/correspondencia'

const props = defineProps<{
  correspondencia?: Correspondencia | null
  correspondenciaId?: string | null
  soloLectura?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })

const tituloDoc = computed(() => {
  const c = props.correspondencia
  if (!c) return 'Adjuntos'
  return `Adjuntos — Nº ${c.nro}/${c.gestion}`
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="tituloDoc"
    :description="soloLectura ? 'Consulta de archivos adjuntos (solo lectura).' : 'Suba archivos y registre una descripción.'"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <CorrespondenciaAdjuntosPanel
        :correspondencia-id="correspondenciaId"
        :correspondencia="correspondencia"
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
