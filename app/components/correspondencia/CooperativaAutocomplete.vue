<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { backendService } from '~/services/backend.service'
import type { RespuestaApi } from '~/types/respuestas'

export interface CooperativaOpcion {
  id: number
  nombre: string
  nro_registro?: string | null
  departamento?: string | null
  sector?: string | null
  tipo?: string | null
}

const MIN_CARACTERES = 2
const LIMITE = 20
const PLACEHOLDER_BUSQUEDA = 'Escriba denominación o nro. de registro...'

const modelValue = defineModel<number | undefined>()

const searchTerm = ref('')
const searchTermDebounced = refDebounced(searchTerm, 300)
const loading = ref(false)
const items = ref<CooperativaOpcion[]>([])
const seleccionada = ref<CooperativaOpcion | null>(null)

const fusionarSeleccion = (resultados: CooperativaOpcion[]) => {
  if (seleccionada.value && !resultados.some((item) => item.id === seleccionada.value?.id)) {
    return [seleccionada.value, ...resultados]
  }
  return resultados
}

const formatearDetalle = (coop: CooperativaOpcion | null) => {
  if (!coop) {
    return ''
  }
  const partes: string[] = []
  if (coop.nro_registro) {
    partes.push(`Registro: ${coop.nro_registro}`)
  }
  if (coop.sector) {
    partes.push(`Sector: ${coop.sector}`)
  }
  if (coop.tipo) {
    partes.push(`Tipo: ${coop.tipo}`)
  }
  if (coop.departamento) {
    partes.push(`Departamento: ${coop.departamento}`)
  }
  return partes.join(' · ')
}

const detalleSeleccion = computed(() => formatearDetalle(seleccionada.value))

const inputPlaceholder = computed(() => {
  if (seleccionada.value) {
    const detalle = formatearDetalle(seleccionada.value)
    return detalle || seleccionada.value.nombre
  }
  return PLACEHOLDER_BUSQUEDA
})

const limpiarSeleccion = () => {
  modelValue.value = undefined
  seleccionada.value = null
  searchTerm.value = ''
  items.value = []
}

const buscarCooperativas = async (criterio: string) => {
  const texto = criterio.trim()
  if (texto.length < MIN_CARACTERES) {
    items.value = seleccionada.value ? [seleccionada.value] : []
    return
  }

  loading.value = true
  try {
    const res = await backendService.get<CooperativaOpcion[]>('comun/codificador/cooperativas', {
      criterio: texto,
      limite: LIMITE,
    })
    const datos = (res as RespuestaApi<CooperativaOpcion[]>).data ?? []
    items.value = fusionarSeleccion(datos)
  } catch {
    items.value = seleccionada.value ? [seleccionada.value] : []
  } finally {
    loading.value = false
  }
}

const hidratarPorId = async (id: number) => {
  loading.value = true
  try {
    const res = await backendService.get<CooperativaOpcion[]>('comun/codificador/cooperativas', { id })
    const datos = (res as RespuestaApi<CooperativaOpcion[]>).data ?? []
    const encontrada = datos[0] ?? null
    seleccionada.value = encontrada
    items.value = encontrada ? [encontrada] : []
  } catch {
    seleccionada.value = null
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(searchTermDebounced, (criterio) => {
  void buscarCooperativas(criterio)
})

watch(
  () => modelValue.value,
  (id) => {
    if (!id) {
      seleccionada.value = null
      return
    }
    if (seleccionada.value?.id === id) {
      return
    }
    const enLista = items.value.find((item) => item.id === id)
    if (enLista) {
      seleccionada.value = enLista
      return
    }
    void hidratarPorId(id)
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-2 w-full">
    <div class="flex items-start gap-2">
      <UInputMenu
        v-model="modelValue"
        v-model:search-term="searchTerm"
        :items="items"
        value-key="id"
        label-key="nombre"
        :loading="loading"
        ignore-filter
        icon="i-lucide-building-2"
        :placeholder="inputPlaceholder"
        class="min-w-0 flex-1"
      >
        <template #item-label="{ item }">
          <div class="flex min-w-0 flex-col">
            <span class="truncate">{{ item.nombre }}</span>
            <span v-if="formatearDetalle(item)" class="truncate text-[11px] text-muted">
              {{ formatearDetalle(item) }}
            </span>
          </div>
        </template>

        <template #empty>
          <div class="px-2 py-3 text-sm text-muted">
            {{
              searchTerm.trim().length < MIN_CARACTERES
                ? `Escriba al menos ${MIN_CARACTERES} caracteres para buscar`
                : loading
                  ? 'Buscando cooperativas...'
                  : 'No se encontraron cooperativas'
            }}
          </div>
        </template>
      </UInputMenu>

      <UButton
        v-if="modelValue"
        type="button"
        icon="i-lucide-x"
        color="neutral"
        variant="outline"
        size="sm"
        class="shrink-0 mt-0.5"
        aria-label="Quitar cooperativa seleccionada"
        title="Quitar cooperativa"
        @click="limpiarSeleccion"
      />
    </div>

    <p
      v-if="seleccionada && detalleSeleccion"
      class="text-xs text-muted leading-relaxed px-0.5"
    >
      {{ detalleSeleccion }}
    </p>
    <p
      v-else-if="seleccionada"
      class="text-xs text-muted leading-relaxed px-0.5"
    >
      {{ seleccionada.nombre }}
    </p>
  </div>
</template>
