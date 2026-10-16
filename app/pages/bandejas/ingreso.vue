<script setup lang="ts">
import DerivacionBandejaView from '~/components/correspondencia/DerivacionBandejaView.vue'

useHead({
  title: 'Bandeja de Ingreso - Correspondencia AFCOOP',
})
</script>

<template>
  <DerivacionBandejaView
    modo="ingreso"
    titulo="Bandeja de Ingreso"
    descripcion="Correspondencias y trámites derivados hacia su cargo activo."
    icono="i-lucide-arrow-down-left"
  />
</template>
