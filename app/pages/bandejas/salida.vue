<script setup lang="ts">
import DerivacionBandejaView from '~/components/correspondencia/DerivacionBandejaView.vue'

useHead({
  title: 'Bandeja de Salida - Correspondencia AFCOOP',
})
</script>

<template>
  <DerivacionBandejaView
    modo="salida"
    titulo="Bandeja de Salida"
    descripcion="Correspondencias derivadas desde su cargo hacia otros destinatarios."
    icono="i-lucide-arrow-up-right"
  />
</template>
