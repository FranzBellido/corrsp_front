<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { AdjuntoCorrespondencia } from '~/types/adjunto'
import type { Correspondencia } from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  correspondencia?: Correspondencia | null
  correspondenciaId?: string | null
  soloLectura?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const loading = ref(false)
const uploading = ref(false)
const deletingId = ref<string | null>(null)
const items = ref<AdjuntoCorrespondencia[]>([])

const descripcion = ref('')
const archivo = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const docId = computed(
  () => props.correspondenciaId || props.correspondencia?.id || null,
)

const tituloDoc = computed(() => {
  const c = props.correspondencia
  if (!c) return 'Adjuntos'
  return `Adjuntos — Nº ${c.nro}/${c.gestion}`
})

const formatTamanio = (valor: string | number) => {
  const n = typeof valor === 'string' ? Number(valor) : valor
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const resetForm = () => {
  descripcion.value = ''
  archivo.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const fetchAdjuntos = async () => {
  if (!docId.value) {
    items.value = []
    return
  }
  loading.value = true
  try {
    const res = await backendService.getById<AdjuntoCorrespondencia[]>(
      'correspondencia',
      `${docId.value}/adjuntos`,
    )
    const data = ((res as { data?: AdjuntoCorrespondencia[] })?.data || res) as AdjuntoCorrespondencia[]
    items.value = Array.isArray(data) ? data : []
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudieron cargar adjuntos',
      description: err?.data?.message || err?.message || 'Error al consultar adjuntos.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, docId.value] as const,
  ([isOpen]) => {
    if (isOpen) {
      resetForm()
      fetchAdjuntos()
    }
  },
)

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  archivo.value = input.files?.[0] ?? null
}

const subirAdjunto = async () => {
  if (!docId.value) return
  const desc = descripcion.value.trim()
  if (desc.length < 2) {
    toast.add({
      title: 'Descripción requerida',
      description: 'Indique una descripción para el adjunto.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }
  if (!archivo.value) {
    toast.add({
      title: 'Archivo requerido',
      description: 'Seleccione un archivo para subir.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', archivo.value)
    form.append('descripcion', desc)
    await backendService.postMultipart<AdjuntoCorrespondencia>(
      `correspondencia/${docId.value}/adjuntos`,
      form,
    )
    toast.add({
      title: 'Adjunto guardado',
      description: 'El archivo se almacenó en MinIO correctamente.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    resetForm()
    await fetchAdjuntos()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string | string[] }; message?: string }
    const msg = err?.data?.message
    toast.add({
      title: 'Error al subir',
      description: Array.isArray(msg) ? msg.join(', ') : msg || err?.message || 'No se pudo subir el archivo.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    uploading.value = false
  }
}

const descargarAdjunto = async (adj: AdjuntoCorrespondencia) => {
  try {
    const blob = await backendService.descargarBlob(`correspondencia/adjuntos/${adj.id}/descargar`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${adj.descripcion.slice(0, 80).replace(/[^a-zA-Z0-9._-]/g, '_')}.${adj.extension}`
    a.rel = 'noopener'
    if (adj.tipo_mime.startsWith('image/') || adj.tipo_mime === 'application/pdf') {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      a.click()
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo abrir el archivo',
      description: err?.data?.message || err?.message || 'Error al descargar el adjunto.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

const eliminarAdjunto = async (adj: AdjuntoCorrespondencia) => {
  if (!docId.value || props.soloLectura) return
  deletingId.value = adj.id
  try {
    await backendService.delete('correspondencia', `${docId.value}/adjuntos/${adj.id}`)
    toast.add({
      title: 'Adjunto eliminado',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    await fetchAdjuntos()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo eliminar',
      description: err?.data?.message || err?.message || 'Error al eliminar el adjunto.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="tituloDoc"
    :description="soloLectura ? 'Consulta de archivos adjuntos (solo lectura).' : 'Suba archivos a MinIO y registre una descripción.'"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div v-if="!soloLectura" class="space-y-3 mb-6 p-4 rounded-xl border border-default bg-elevated/40">
        <p class="text-xs font-semibold uppercase tracking-wider text-muted">Nuevo adjunto</p>
        <UFormField label="Descripción" required>
          <UTextarea
            v-model="descripcion"
            :rows="2"
            placeholder="Descripción del archivo..."
            class="w-full"
            autoresize
          />
        </UFormField>
        <UFormField label="Archivo" required>
          <input
            ref="fileInput"
            type="file"
            class="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            @change="onFileChange"
          />
        </UFormField>
        <div class="flex justify-end">
          <UButton
            label="Subir a MinIO"
            icon="i-lucide-upload"
            :loading="uploading"
            :disabled="!docId"
            @click="subirAdjunto"
          />
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-10">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
      </div>

      <div v-else-if="items.length === 0" class="py-8 text-center text-sm text-muted">
        No hay adjuntos registrados.
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="adj in items"
          :key="adj.id"
          class="flex items-start gap-3 p-3 rounded-xl border border-default bg-default/50"
        >
          <UIcon name="i-lucide-file" class="size-5 text-primary shrink-0 mt-0.5" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-highlighted line-clamp-2">{{ adj.descripcion }}</p>
            <p class="text-[11px] text-muted mt-0.5">
              .{{ adj.extension }} · {{ formatTamanio(adj.tamanio) }}
            </p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UButton
              icon="i-lucide-eye"
              color="neutral"
              variant="ghost"
              size="xs"
              title="Ver / descargar"
              @click="descargarAdjunto(adj)"
            />
            <UButton
              v-if="!soloLectura"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="xs"
              title="Eliminar"
              :loading="deletingId === adj.id"
              @click="eliminarAdjunto(adj)"
            />
          </div>
        </li>
      </ul>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton label="Cerrar" color="neutral" variant="outline" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
