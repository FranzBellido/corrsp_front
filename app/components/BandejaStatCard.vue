<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string | number
    hint?: string
    icon: string
    tone?: 'primary' | 'error' | 'success' | 'warning' | 'info' | 'neutral'
  }>(),
  { tone: 'primary' },
)

const toneClass: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  error: 'bg-error/10 text-error',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  neutral: 'bg-elevated text-muted',
}
</script>

<template>
  <div
    class="rounded-xl border border-default bg-default/80 dark:bg-elevated/40 p-4 shadow-xs flex items-start justify-between gap-3 min-h-[5.5rem]"
  >
    <div class="min-w-0">
      <p class="text-[10px] font-bold uppercase tracking-wider text-muted">
        {{ label }}
      </p>
      <p class="mt-1 text-2xl font-semibold text-highlighted tabular-nums tracking-tight">
        {{ value }}
      </p>
      <p v-if="hint" class="mt-1 text-[11px] text-muted leading-snug">
        {{ hint }}
      </p>
    </div>
    <div
      class="size-10 rounded-lg flex items-center justify-center shrink-0"
      :class="toneClass[tone]"
    >
      <UIcon :name="icon" class="size-5" />
    </div>
  </div>
</template>
