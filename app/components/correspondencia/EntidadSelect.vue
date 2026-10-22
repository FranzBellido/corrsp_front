<script setup lang="ts">
import { backendService } from '~/services/backend.service'
import type { Entidad } from '~/types/entidad'
import type { RespuestaApi } from '~/types/respuestas'

interface EntidadOpcion {
  id: number
  nombre: string
}

const modelValue = defineModel<number | undefined>()
const remitenteEntidad = defineModel<string>('remitenteEntidad', { default: '' })

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

watch(modelValue, (id) => {
  if (id == null) {
    remitenteEntidad.value = ''
  }
})

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
  <div class="space-y-3 w-full">
    <UFormField
      label="Entidad"
      name="entidad_id"
      required
      help="Seleccione la entidad externa asociada a este trámite."
    >
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
    </UFormField>

    <UFormField
      label="Remitente de la entidad"
      name="remitente_entidad"
      :required="modelValue != null"
      help="Nombre de la persona o funcionario que remite el documento en nombre de la entidad seleccionada."
    >
      <UInput
        v-model="remitenteEntidad"
        :disabled="modelValue == null"
        placeholder="Ej.: Lic. Juan Pérez — Director Ejecutivo"
        icon="i-lucide-user"
        class="w-full"
        maxlength="500"
      />
    </UFormField>
  </div>
</template>
