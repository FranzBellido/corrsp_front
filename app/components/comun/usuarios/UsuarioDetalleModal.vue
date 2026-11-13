<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import type { UsuarioInfo } from '~/types/usuario'
import type { RespuestaApi } from '~/types/respuestas'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  usuarioId?: string | null
}>()

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const loading = ref(false)
const info = ref<UsuarioInfo | null>(null)
const fotoUrl = ref<string | null>(null)

const liberarBlob = (url: string | null) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

const cargarFoto = async (path: string | null | undefined) => {
  liberarBlob(fotoUrl.value)
  fotoUrl.value = null
  if (!path?.trim()) return
  try {
    fotoUrl.value = await backendService.obtenerUrlDesdeStorage(path.trim())
  } catch {
    fotoUrl.value = null
  }
}

const cargarDetalle = async (id: string) => {
  loading.value = true
  info.value = null
  try {
    const res = await backendService.get<UsuarioInfo>(`usuarios/${id}/getinfo`)
    const data = (res as RespuestaApi<UsuarioInfo>)?.data ?? (res as UsuarioInfo)
    info.value = data
    await cargarFoto(data.foto_url)
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo cargar el detalle',
      description: err?.data?.message || err?.message || 'Error al consultar el usuario.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    open.value = false
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.usuarioId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) {
      cargarDetalle(id)
    }
    if (!isOpen) {
      info.value = null
      liberarBlob(fotoUrl.value)
      fotoUrl.value = null
    }
  },
)

onBeforeUnmount(() => {
  liberarBlob(fotoUrl.value)
})

const avatarFallback = computed(() => {
  const nombre = info.value?.nombre_completo?.trim()
  return nombre ? nombre.charAt(0).toUpperCase() : '?'
})

const identificacion = computed(() => {
  if (!info.value?.ni) return '—'
  return info.value.emitido_en ? `${info.value.ni} ${info.value.emitido_en}` : info.value.ni
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Detalle del usuario"
    description="Información institucional, roles y cargos actuales."
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-3">
        <UIcon name="i-lucide-loader-circle" class="size-8 text-primary-500 animate-spin" />
        <p class="text-sm text-muted">Cargando ficha del usuario...</p>
      </div>

      <div v-else-if="info" class="space-y-5">
        <div class="flex items-start gap-4">
          <div
            class="size-16 rounded-2xl overflow-hidden bg-primary-100 dark:bg-primary-950/50 flex items-center justify-center shrink-0 border border-primary-200/60 dark:border-primary-900/40"
          >
            <img
              v-if="fotoUrl"
              :src="fotoUrl"
              alt="Foto del usuario"
              class="size-full object-cover"
            >
            <span v-else class="text-2xl font-bold text-primary-700 dark:text-primary-300">
              {{ avatarFallback }}
            </span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge v-if="info.titulo" color="neutral" variant="outline" size="xs">
                {{ info.titulo }}
              </UBadge>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white truncate">
                {{ info.nombre_completo }}
              </h3>
            </div>
            <p class="text-sm font-mono text-muted mt-0.5">@{{ info.nombre_usuario }}</p>
            <div class="flex flex-wrap gap-2 mt-2">
              <UBadge :color="info.activo ? 'success' : 'neutral'" variant="subtle" size="xs">
                {{ info.activo ? 'Activo' : 'Inactivo' }}
              </UBadge>
              <UBadge :color="info.disponible ? 'info' : 'warning'" variant="subtle" size="xs">
                {{ info.disponible ? 'Disponible' : 'No disponible' }}
              </UBadge>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div class="p-3 rounded-md bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800">
            <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Correo</p>
            <p class="text-gray-800 dark:text-gray-200 break-all">{{ info.email || '—' }}</p>
          </div>
          <div class="p-3 rounded-md bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800">
            <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">CI / NI</p>
            <p class="font-mono text-gray-800 dark:text-gray-200">{{ identificacion }}</p>
          </div>
          <div
            v-if="info.id_ref != null"
            class="p-3 rounded-md bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800"
          >
            <p class="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">ID referencia</p>
            <p class="font-mono text-gray-800 dark:text-gray-200">{{ info.id_ref }}</p>
          </div>
        </div>

        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
            <UIcon name="i-lucide-shield" class="size-3.5" />
            Roles del sistema
          </p>
          <div v-if="info.roles.length" class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="rol in info.roles"
              :key="rol.id"
              color="primary"
              variant="subtle"
              size="sm"
            >
              {{ rol.nombre }}
            </UBadge>
          </div>
          <p v-else class="text-sm text-muted italic">Sin roles asignados</p>
        </div>

        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
            <UIcon name="i-lucide-briefcase" class="size-3.5" />
            Cargos actuales
          </p>
          <div v-if="info.cargos.length" class="space-y-2">
            <div
              v-for="cargo in info.cargos"
              :key="cargo.id"
              class="p-3 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/30"
            >
              <p class="font-semibold text-sm text-gray-900 dark:text-white">{{ cargo.nombre }}</p>
              <p v-if="cargo.areas" class="text-xs text-muted mt-1">
                {{ cargo.areas.codigo ? `[${cargo.areas.codigo}] ` : '' }}{{ cargo.areas.nombre }}
              </p>
              <p v-if="cargo.cargos_cod_depto" class="text-[11px] text-muted mt-0.5 font-mono">
                Cód. depto: {{ cargo.cargos_cod_depto }}
              </p>
            </div>
          </div>
          <p v-else class="text-sm text-muted italic">Sin cargos institucionales vinculados</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton label="Cerrar" color="neutral" variant="outline" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
