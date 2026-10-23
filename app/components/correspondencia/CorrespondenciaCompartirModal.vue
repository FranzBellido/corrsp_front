<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Correspondencia } from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'
import { citeOrigenCorrespondencia } from '~/utils/correspondencia'

const props = defineProps<{
  correspondencia: Correspondencia | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  actualizado: []
}>()

const toast = useToast()

interface UsuarioCompartidoItem {
  usuario_id: string
  corresp_id: string
  solo_lectura: boolean
  comentario: string | null
  usuarios?: {
    id: string
    nombre_completo: string
    nombre_usuario: string
    email?: string | null
  }
}

const cargando = ref(false)
const guardando = ref(false)
const eliminandoId = ref<string | null>(null)
const compartidos = ref<UsuarioCompartidoItem[]>([])

// Formulario para agregar nuevo usuario
const nuevoUsuarioId = ref<string | null>(null)
const nuevoSoloLectura = ref(false)
const nuevoComentario = ref('')

// Cargar usuarios con quienes ya está compartido
const cargarCompartidos = async () => {
  if (!props.correspondencia?.id) return
  cargando.value = true
  try {
    const res = await backendService.get<UsuarioCompartidoItem[]>(
      `correspondencia/${props.correspondencia.id}/compartir`
    )
    compartidos.value = (res as any)?.data || res || []
  } catch (error: any) {
    toast.add({
      title: 'Error al cargar compartidos',
      description: error?.data?.message || error?.message || 'No se pudo obtener la lista de usuarios.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    compartidos.value = []
  } finally {
    cargando.value = false
  }
}

watch(
  () => open.value,
  (estaAbierto) => {
    if (estaAbierto) {
      nuevoUsuarioId.value = null
      nuevoSoloLectura.value = false
      nuevoComentario.value = ''
      cargarCompartidos()
    }
  }
)

const handleAgregar = async () => {
  if (!props.correspondencia?.id || !nuevoUsuarioId.value) return

  guardando.value = true
  try {
    await backendService.post(
      `correspondencia/${props.correspondencia.id}/compartir`,
      {
        destinatarios: [
          {
            usuario_id: nuevoUsuarioId.value,
            solo_lectura: nuevoSoloLectura.value,
            comentario: nuevoComentario.value.trim() || undefined,
          },
        ],
      }
    )

    toast.add({
      title: 'Documento compartido',
      description: nuevoSoloLectura.value
        ? 'El usuario ahora puede visualizar este documento.'
        : 'El usuario ahora puede editar este documento en OnlyOffice.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

    nuevoUsuarioId.value = null
    nuevoSoloLectura.value = false
    nuevoComentario.value = ''
    await cargarCompartidos()
    emit('actualizado')
  } catch (error: any) {
    toast.add({
      title: 'No se pudo compartir',
      description:
        error?.data?.message ||
        (Array.isArray(error?.data?.message) ? error.data.message.join(', ') : null) ||
        error?.message ||
        'Ocurrió un error al compartir el documento.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    guardando.value = false
  }
}

const handleCambiarPermiso = async (item: UsuarioCompartidoItem, soloLectura: boolean) => {
  if (!props.correspondencia?.id) return
  try {
    await backendService.post(
      `correspondencia/${props.correspondencia.id}/compartir`,
      {
        destinatarios: [
          {
            usuario_id: item.usuario_id,
            solo_lectura: soloLectura,
            comentario: item.comentario || undefined,
          },
        ],
      }
    )
    item.solo_lectura = soloLectura
    toast.add({
      title: 'Permiso actualizado',
      description: soloLectura ? 'Cambiado a solo lectura' : 'Cambiado a editor (OnlyOffice)',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    emit('actualizado')
  } catch (error: any) {
    toast.add({
      title: 'Error al actualizar permiso',
      description: error?.data?.message || error?.message || 'No se pudo cambiar el permiso.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

const handleEliminar = async (usuarioId: string) => {
  if (!props.correspondencia?.id) return
  eliminandoId.value = usuarioId
  try {
    await backendService.delete(
      'correspondencia',
      `${props.correspondencia.id}/compartir/${usuarioId}`
    )
    toast.add({
      title: 'Acceso revocado',
      description: 'El documento ya no está compartido con este usuario.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    await cargarCompartidos()
    emit('actualizado')
  } catch (error: any) {
    toast.add({
      title: 'Error al revocar acceso',
      description: error?.data?.message || error?.message || 'No se pudo revocar el acceso.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    eliminandoId.value = null
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Compartir Documento para Edición"
    description="Permite que otros usuarios editen este documento con OnlyOffice o lo visualicen."
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div v-if="correspondencia" class="space-y-4">
        <!-- Info del documento -->
        <div class="p-3 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60 text-xs">
          <div class="flex items-center justify-between font-bold text-gray-900 dark:text-gray-100">
            <span>Nº {{ correspondencia.nro }}/{{ correspondencia.gestion }}</span>
            <span class="text-gray-500 font-normal">{{ citeOrigenCorrespondencia(correspondencia) || 'Sin CITE' }}</span>
          </div>
          <p class="mt-1 text-gray-600 dark:text-gray-300 line-clamp-2">
            {{ correspondencia.referencia }}
          </p>
        </div>

        <!-- Formulario agregar colaborador -->
        <div class="p-3.5 rounded-md border border-primary-200/60 dark:border-primary-900/50 bg-primary-50/30 dark:bg-primary-950/20 space-y-3">
          <span class="text-xs font-semibold text-primary-700 dark:text-primary-300 block">
            Agregar Colaborador
          </span>

          <div class="space-y-2">
            <UFormField label="Usuario" required>
              <CodificadorSelect
                v-model="nuevoUsuarioId"
                endpoint="comun/codificador/usuarios"
                placeholder="Seleccione el usuario con quien compartir..."
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <UFormField label="Tipo de Permiso">
                <div class="flex items-center gap-2 pt-1">
                  <USwitch
                    v-model="nuevoSoloLectura"
                    size="sm"
                  />
                  <span class="text-xs" :class="nuevoSoloLectura ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-emerald-600 dark:text-emerald-400 font-medium'">
                    {{ nuevoSoloLectura ? 'Solo Lectura' : 'Puede Editar (OnlyOffice)' }}
                  </span>
                </div>
              </UFormField>

              <UFormField label="Nota / Comentario (opcional)">
                <UInput
                  v-model="nuevoComentario"
                  size="xs"
                  placeholder="Ej. Revisar cláusula 3..."
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="flex justify-end pt-2">
              <UButton
                label="Compartir"
                icon="i-lucide-user-plus"
                color="primary"
                size="xs"
                :disabled="!nuevoUsuarioId || guardando"
                :loading="guardando"
                @click="handleAgregar"
              />
            </div>
          </div>
        </div>

        <!-- Lista de usuarios compartidos -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Usuarios con acceso ({{ compartidos.length }})
            </span>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              size="xs"
              :loading="cargando"
              title="Actualizar lista"
              @click="cargarCompartidos"
            />
          </div>

          <div v-if="cargando" class="py-6 text-center text-xs text-gray-400">
            Cargando usuarios compartidos...
          </div>

          <div v-else-if="compartidos.length === 0" class="py-6 text-center text-xs text-gray-400 italic rounded-md border border-dashed border-gray-200 dark:border-gray-800">
            Este documento aún no está compartido con otros usuarios.
          </div>

          <div v-else class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            <div
              v-for="item in compartidos"
              :key="item.usuario_id"
              class="flex items-center justify-between p-2.5 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs"
            >
              <div class="min-w-0 flex-1 pr-2">
                <p class="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {{ item.usuarios?.nombre_completo || 'Usuario' }}
                </p>
                <p class="text-[11px] text-gray-400 truncate">
                  @{{ item.usuarios?.nombre_usuario }} <span v-if="item.usuarios?.email">• {{ item.usuarios?.email }}</span>
                </p>
                <p v-if="item.comentario" class="text-[11px] text-gray-500 italic mt-0.5 truncate">
                  "{{ item.comentario }}"
                </p>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <UBadge
                  :color="item.solo_lectura ? 'warning' : 'success'"
                  variant="subtle"
                  size="xs"
                >
                  {{ item.solo_lectura ? 'Lectura' : 'Editor' }}
                </UBadge>

                <UButton
                  :icon="item.solo_lectura ? 'i-lucide-pencil' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :title="item.solo_lectura ? 'Cambiar a Editor' : 'Cambiar a Solo Lectura'"
                  @click="handleCambiarPermiso(item, !item.solo_lectura)"
                />

                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  :loading="eliminandoId === item.usuario_id"
                  title="Revocar acceso"
                  @click="handleEliminar(item.usuario_id)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          label="Cerrar"
          color="neutral"
          variant="outline"
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>
