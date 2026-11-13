<script setup lang="ts">
import DerivacionBandejaView from '~/components/derivaciones/DerivacionBandejaView.vue'

useHead({
  title: 'Bandeja Con Copia - Correspondencia AFCOOP',
})
</script>

<template>
  <DerivacionBandejaView
    modo="con_copia"
    titulo="Bandeja Con Copia"
    descripcion="Documentos en los que su cargo fue incluido como destinatario en copia (CC)."
    icono="i-lucide-copy"
  />
</template>
