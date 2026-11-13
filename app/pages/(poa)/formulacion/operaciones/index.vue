<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { PoaFormulacionContexto } from '~/types/poa/formulacion'
import { backendService } from '~/services/backend.service'
import { useProfile } from '~/composables/comun/useProfile'

const toast = useToast()
const { fetchProfile } = useProfile()
const loading = ref(true)
const contexto = ref<PoaFormulacionContexto | null>(null)

onMounted(async () => {
  loading.value = true
  try {
    await fetchProfile()
    const res = await backendService.get<PoaFormulacionContexto>('poa-formulacion/mi')
    contexto.value = ((res as { data?: PoaFormulacionContexto })?.data || res) as PoaFormulacionContexto
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'Sin acceso a formulación',
      description: err?.data?.message || err?.message,
      color: 'error',
    })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Operaciones — Formulación POA"
      description="Gestión de operaciones derivadas de los resultados"
    />

    <USkeleton v-if="loading" class="h-32 w-full rounded-md" />

    <UAlert
      v-else-if="contexto?.formulacion"
      color="info"
      variant="subtle"
      icon="i-lucide-hammer"
      title="Módulo en preparación"
      :description="`Formulación: ${contexto.formulacion.nombre}. El CRUD de poa_operacion se habilitará en una siguiente iteración.`"
    />

    <UAlert
      v-else
      color="warning"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      title="Sin formulación activa"
      description="Ingrese primero desde Resultados o verifique su cargo y la configuración POA."
    />
  </div>
</template>
