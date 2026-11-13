<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** Cabecera clicable; el cuerpo se puede ocultar. */
    collapsible?: boolean
    defaultOpen?: boolean
  }>(),
  {
    title: 'Filtros de búsqueda',
    collapsible: false,
    defaultOpen: false,
  },
)

const openModel = defineModel<boolean>('open', { required: false })

const openLocal = ref(openModel.value ?? props.defaultOpen)

watch(
  () => openModel.value,
  (val) => {
    if (val !== undefined) openLocal.value = val
  },
)

watch(openLocal, (val) => {
  openModel.value = val
})

const panelOpen = computed({
  get: () => openLocal.value,
  set: (val: boolean) => {
    openLocal.value = val
  },
})
</script>

<template>
  <div
    class="rounded-2xl border border-default bg-default/70 dark:bg-elevated/30 backdrop-blur-md shadow-xs overflow-hidden"
  >
    <UCollapsible
      v-if="collapsible"
      v-model:open="panelOpen"
      :unmount-on-hide="false"
      class="w-full"
    >
      <div
        class="px-4 pt-3.5 pb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-default/70 cursor-pointer hover:bg-elevated/40 transition-colors"
        :aria-expanded="panelOpen"
      >
        <div class="min-w-0 flex items-start gap-2 flex-1">
          <UIcon
            :name="panelOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-4 shrink-0 mt-0.5 text-muted"
          />
          <div class="min-w-0">
            <slot name="header">
              <p class="text-[11px] font-bold uppercase tracking-wider text-muted">
                {{ title }}
              </p>
              <p v-if="description" class="text-xs text-muted mt-0.5">
                {{ description }}
              </p>
            </slot>
          </div>
        </div>
        <div
          v-if="$slots.actions"
          class="flex items-center gap-1.5 shrink-0"
          @click.stop
        >
          <slot name="actions" />
        </div>
      </div>

      <template #content>
        <div class="p-4 flex flex-wrap gap-y-4 items-end border-t border-default/50">
          <slot />
        </div>
      </template>
    </UCollapsible>

    <template v-else>
      <div
        v-if="title || $slots.header"
        class="px-4 pt-3.5 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-default/70"
      >
        <div class="min-w-0">
          <slot name="header">
            <p class="text-[11px] font-bold uppercase tracking-wider text-muted">
              {{ title }}
            </p>
            <p v-if="description" class="text-xs text-muted mt-0.5">
              {{ description }}
            </p>
          </slot>
        </div>
        <div v-if="$slots.actions" class="flex items-center gap-1.5">
          <slot name="actions" />
        </div>
      </div>
      <div class="p-4 flex flex-wrap gap-y-4 items-end">
        <slot />
      </div>
    </template>
  </div>
</template>
