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
    descripcion="Documentos y correspondencias compartidos con su usuario para edición colaborativa en OnlyOffice o lectura."
    icono="i-lucide-share-2"
  />
</template>
