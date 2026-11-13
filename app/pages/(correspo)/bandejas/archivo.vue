<script setup lang="ts">
import CorrespondenciaBandejaView from '~/components/correspondencia/CorrespondenciaBandejaView.vue'

useHead({
  title: 'Bandeja de Archivo - Correspondencia AFCOOP',
})
</script>

<template>
  <CorrespondenciaBandejaView
    modo="archivo"
    titulo="Bandeja de Archivo"
    descripcion="Correspondencias institucionales correspondientes a su área activa de trabajo."
    icono="i-lucide-archive"
  />
</template>
