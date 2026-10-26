<script setup lang="ts">
/**
 * Alias del layout Wellcome (misma implementación).
 * Mantiene compatibilidad con `layout: 'welcome'`.
 */
</script>

<template>
  <NuxtLayout name="wellcome">
    <slot />
  </NuxtLayout>
</template>
