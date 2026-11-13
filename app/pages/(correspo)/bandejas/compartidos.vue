<script setup lang="ts">
import CorrespondenciaBandejaView from '~/components/correspondencia/CorrespondenciaBandejaView.vue'

useHead({
  title: 'Compartidos Conmigo - Correspondencia AFCOOP',
})
</script>

<template>
  <CorrespondenciaBandejaView
    modo="compartidos"
    titulo="Compartidos Conmigo"
    descripcion="Documentos compartidos con usted y correspondencias que usted ha compartido con otros usuarios."
    icono="i-lucide-share-2"
  />
</template>
