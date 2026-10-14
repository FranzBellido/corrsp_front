<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CodificadorDto, ApiResponse } from '~/types/codificador'
import { backendService } from '~/services/backend.service'

const props = withDefaults(defineProps<{
  endpoint: string
  placeholder?: string
  incluirTodos?: boolean
  disabled?: boolean
  variant?: 'subtle' | 'ghost' | 'outline' | 'soft' | 'none'
  class?: string
  params?: Record<string, any>
}>(), {
  variant: 'subtle'
})

const emit = defineEmits<{
  itemSelected: [item: CodificadorDto | null]
}>()

// El padre espera un número o string (ID), no un objeto
const modelValue = defineModel<number | string | null>()

const url = computed(() => {
  if (!props.endpoint || props.endpoint === '/') return ''
  return props.endpoint.startsWith('/') ? props.endpoint : `/${props.endpoint}`
})

const queryParams = computed(() => {
  if (!props.params) return {}
  const p = { ...props.params }
  Object.keys(p).forEach(key => {
    if (p[key] === undefined || p[key] === null || p[key] === '') {
      delete p[key]
    }
  })
  return p
})

// Usamos useId para asegurar que cada instancia de CodificadorSelect tenga un key único
// Esto evita que componentes con endpoint vacío inicialmente compartan el mismo key y datos.
const instanceId = useId()

const { data, status, refresh } = await useAsyncData<ApiResponse<CodificadorDto[]>>(
  `codificador-${instanceId}`,
  () => backendService.get<CodificadorDto[]>(url.value, queryParams.value) as Promise<any>,
  {
    watch: [url, queryParams],
    immediate: !!props.endpoint && props.endpoint !== '/'
  }
)

const options = computed(() => {
  const items = (data.value as any)?.data || []
  const normalized = items.map((item: any) => ({
    ...item,
    id: (item.id !== undefined && item.id !== null) ? item.id : item.codificador_id
  }))
  if (props.incluirTodos) {
    return [{ id: 0, nombre: 'Todos' }, ...normalized]
  }
  return normalized
})

// Referencia local para el objeto completo que USelectMenu necesita para mostrar el nombre
const selectedItem = ref<any>(null)

// Sincronizar de ID (fuera) a Objeto (dentro)
watch([() => modelValue.value, options], ([newId, newOptions]) => {
  if (newId !== undefined && newId !== null && newId !== '' && newOptions.length > 0) {
    const found = newOptions.find((o: any) => String(o.id) === String(newId))
    selectedItem.value = found || null
  } else {
    selectedItem.value = null
  }
  emit('itemSelected', selectedItem.value)
}, { immediate: true })

// Sincronizar de Objeto (dentro) a ID (fuera) para que Zod reciba un número
const handleUpdate = (item: any) => {
  selectedItem.value = item
  modelValue.value = item ? item.id : null
  emit('itemSelected', item ?? null)
}

// Auto-seleccionar si hay solo una opción disponible y no hay selección previa
watch(options, (newOptions) => {
  if (newOptions && newOptions.length === 1 && !props.incluirTodos) {
    if (modelValue.value === undefined || modelValue.value === null || modelValue.value === '') {
      handleUpdate(newOptions[0])
    }
  }
}, { immediate: true })

const selectedValue = computed({
  get: () => selectedItem.value,
  set: (val: any) => {
    handleUpdate(val)
  }
})

const truncateLabel = (text: string) => {
  return text && text.length > 120 ? text.slice(0, 120) + '...' : text
}
</script>

<template>
  <USelectMenu
    v-model="selectedValue"
    :items="options"
    label-key="nombre"
    :placeholder="selectedItem?.nombre || 'Seleccione una opción'"
    :loading="status === 'pending'"
    :search-input="{ placeholder:'filtro', icon:'i-lucide-search'}"
    :disabled="disabled"
    :class="['w-full', props.class]"
    :variant="variant"
    :ui="{  }"
  >
    <template #item-label="{ item }">
      <span class="truncate" :title="item.nombre">
        {{ truncateLabel(item.nombre) }}
      </span>
    </template>
  </USelectMenu>
</template>

<style scoped>
@reference "../../assets/css/main.css";

:deep(.u-select-menu-trigger) {
  @apply rounded-xl border-neutral-200 dark:border-neutral-800 focus:ring-primary-500/20;
}
</style>
