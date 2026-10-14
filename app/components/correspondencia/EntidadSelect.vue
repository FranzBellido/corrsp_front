<script setup lang="ts">
import { backendService } from '~/services/backend.service'
import type { Entidad } from '~/types/entidad'
import type { RespuestaApi } from '~/types/respuestas'

interface EntidadOpcion {
  id: number
  nombre: string
}

const modelValue = defineModel<number | undefined>()

const loading = ref(false)
const items = ref<EntidadOpcion[]>([])
const selectedItem = ref<EntidadOpcion | null>(null)

const cargarEntidades = async () => {
  loading.value = true
  try {
    const res = await backendService.get<Entidad[]>('entidades')
    const raw = (res as RespuestaApi<Entidad[]>)?.data ?? res
    const lista = Array.isArray(raw) ? raw : []
    items.value = lista.map((e) => ({
      id: e.id,
      nombre: e.nombre_ent?.trim() || `Entidad #${e.id}`,
    }))
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(
  [() => modelValue.value, items],
  ([id, lista]) => {
    if (id != null && lista.length > 0) {
      selectedItem.value = lista.find((e) => e.id === Number(id)) || null
    } else if (id == null) {
      selectedItem.value = null
    }
  },
  { immediate: true },
)

const selectedValue = computed({
  get: () => selectedItem.value,
  set: (val: EntidadOpcion | null) => {
    selectedItem.value = val
    modelValue.value = val?.id
  },
})

onMounted(() => {
  cargarEntidades()
})
</script>

<template>
  <USelectMenu
    v-model="selectedValue"
    :items="items"
    label-key="nombre"
    :placeholder="selectedItem?.nombre || 'Seleccione una entidad...'"
    :loading="loading"
    :search-input="{
      placeholder: 'Buscar entidad...',
      icon: 'i-lucide-search',
    }"
    class="w-full"
  >
    <template #leading>
      <UIcon name="i-lucide-building-2" class="size-4 text-muted" />
    </template>
    <template #item-label="{ item }">
      <span class="truncate">{{ item.nombre }}</span>
    </template>
    <template #empty>
      <div class="p-2 text-xs text-muted">
        {{ loading ? 'Cargando entidades...' : 'No hay entidades activas registradas.' }}
      </div>
    </template>
  </USelectMenu>
</template>
