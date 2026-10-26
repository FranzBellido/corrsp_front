<script setup lang="ts">
import CorrespondenciaBandejaView from '~/components/correspondencia/CorrespondenciaBandejaView.vue'

useHead({
  title: 'Bandeja de Borrador - Correspondencia AFCOOP',
})
</script>

<template>
  <CorrespondenciaBandejaView
    modo="borrador"
    titulo="Bandeja de Principal"
    descripcion="Procesos registradas por su cargo activo que aún no han sido derivadas."
    icono="i-lucide-file-edit"
  />
</template>
