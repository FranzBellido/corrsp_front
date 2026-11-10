<script setup lang="ts">
const props = defineProps<{
  titulo: string
  descripcion: string
  icono: string
  badge?: string | number | null
}>()
</script>

<template>
  <div
    class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-5 border-b border-default"
  >
    <div class="min-w-0 space-y-2">
      <div class="flex flex-wrap items-center gap-2.5">
        <div
          class="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"
        >
          <UIcon :name="props.icono" class="size-5" />
        </div>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-highlighted">
              {{ props.titulo }}
            </h1>
            <UBadge
              v-if="badge != null && badge !== ''"
              color="primary"
              variant="subtle"
              size="sm"
              class="uppercase tracking-wide"
            >
              {{ badge }}
            </UBadge>
          </div>
          <p class="text-sm text-muted mt-0.5 max-w-2xl leading-relaxed">
            {{ props.descripcion }}
          </p>
        </div>
      </div>
      <slot name="subtitle" />
    </div>

    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
