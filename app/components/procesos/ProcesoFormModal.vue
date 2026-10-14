<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CreateProcesoPayload, Proceso, UpdateProcesoPayload } from '~/types/proceso'
import { backendService } from '~/services/backend.service'

const props = defineProps<{
  proceso?: Proceso | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)
const uploadingPlantilla = ref(false)
const plantillaPendiente = ref<File | null>(null)
const plantillaPathActual = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const MAX_PLANTILLA_MB = 10
const TIPOS_WORD = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]
const EXTENSIONES_WORD = ['.docx', '.doc']

const procesoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  codigo: z.string().trim().min(1, 'El código es obligatorio').max(10, 'Máximo 10 caracteres'),
  ndias_plazo: z.number().int().nonnegative().optional(),
  requiere_cooperativa: z.boolean().default(false),
  interna: z.boolean().default(true),
  requiere_entidad: z.boolean().default(false),
})

type ProcesoSchemaType = z.infer<typeof procesoSchema>

const form = ref<ProcesoSchemaType>({
  nombre: '',
  codigo: '',
  ndias_plazo: undefined,
  requiere_cooperativa: false,
  interna: true,
  requiere_entidad: false,
})

const isEditing = computed(() => !!props.proceso?.id)

const nombrePlantillaActual = computed(() => {
  if (plantillaPendiente.value) {
    return plantillaPendiente.value.name
  }
  if (!plantillaPathActual.value) {
    return null
  }
  const parts = plantillaPathActual.value.split('/')
  return parts[parts.length - 1] || plantillaPathActual.value
})

const aplicarProcesoAlFormulario = (val: Proceso | null | undefined) => {
  plantillaPendiente.value = null

  if (val) {
    form.value = {
      nombre: val.nombre || '',
      codigo: val.codigo || '',
      ndias_plazo: val.ndias_plazo ?? undefined,
      requiere_cooperativa: Boolean(val.requiere_cooperativa),
      interna: Boolean(val.interna),
      requiere_entidad: Boolean(val.requiere_entidad),
    }
    plantillaPathActual.value = val.plantilla || null
  } else {
    form.value = {
      nombre: '',
      codigo: '',
      ndias_plazo: undefined,
      requiere_cooperativa: false,
      interna: true,
      requiere_entidad: false,
    }
    plantillaPathActual.value = null
  }
}

watch(() => props.proceso, aplicarProcesoAlFormulario, { immediate: true })

watch(open, (isOpen) => {
  if (!isOpen) {
    plantillaPendiente.value = null
    return
  }
  aplicarProcesoAlFormulario(props.proceso)
})

onBeforeUnmount(() => {
  plantillaPendiente.value = null
})

const abrirSelectorPlantilla = () => {
  fileInputRef.value?.click()
}

const onPlantillaSeleccionada = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) {
    return
  }

  const nombreLower = file.name.toLowerCase()
  const extensionOk = EXTENSIONES_WORD.some((ext) => nombreLower.endsWith(ext))
  const mimeOk = TIPOS_WORD.includes(file.type)

  if (!extensionOk && !mimeOk) {
    toast.add({
      title: 'Archivo no válido',
      description: 'Seleccione un documento Word (.doc o .docx).',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  if (file.size > MAX_PLANTILLA_MB * 1024 * 1024) {
    toast.add({
      title: 'Archivo muy grande',
      description: `La plantilla no puede superar ${MAX_PLANTILLA_MB} MB.`,
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  plantillaPendiente.value = file
}

const quitarPlantillaPendiente = () => {
  plantillaPendiente.value = null
}

const subirPlantillaProceso = async (procesoId: number) => {
  if (!plantillaPendiente.value) {
    return
  }

  uploadingPlantilla.value = true
  try {
    const formData = new FormData()
    formData.append('file', plantillaPendiente.value)

    const res = await backendService.patchMultipart<{ plantilla?: string }>(
      `storage/procesos/${procesoId}/plantilla`,
      formData,
    )

    const path =
      (res as { plantilla?: string })?.plantilla ||
      (res as { data?: { plantilla?: string } })?.data?.plantilla

    if (path) {
      plantillaPathActual.value = path
    }

    plantillaPendiente.value = null
  } catch (error: any) {
    const errorMsg =
      error?.data?.message ||
      (Array.isArray(error?.data?.message) ? error.data.message.join(', ') : null) ||
      error?.message ||
      'No se pudo subir la plantilla Word'

    toast.add({
      title: 'Error al subir plantilla',
      description: errorMsg,
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    throw error
  } finally {
    uploadingPlantilla.value = false
  }
}

const descargarPlantillaActual = async () => {
  if (!plantillaPathActual.value) {
    return
  }

  try {
    const blob = await backendService.descargarBlob(
      `storage/download/${plantillaPathActual.value}`,
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nombrePlantillaActual.value || 'plantilla.docx'
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.add({
      title: 'Error al descargar',
      description: 'No se pudo obtener la plantilla desde el almacenamiento.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}

const handleSave = async (event?: FormSubmitEvent<ProcesoSchemaType>) => {
  const data = event?.data || form.value
  saving.value = true
  try {
    const payload: CreateProcesoPayload = {
      nombre: data.nombre.trim(),
      codigo: data.codigo.trim().toUpperCase(),
      ndias_plazo: data.ndias_plazo !== undefined ? Number(data.ndias_plazo) : undefined,
      requiere_cooperativa: Boolean(data.requiere_cooperativa),
      interna: Boolean(data.interna),
      requiere_entidad: Boolean(data.requiere_entidad),
    }

    let procesoId = props.proceso?.id

    if (isEditing.value && props.proceso?.id) {
      await backendService.patch<Proceso>('procesos', props.proceso.id, payload as UpdateProcesoPayload)
    } else {
      const creado = await backendService.post<Proceso>('procesos', payload)
      const dataCreado = (creado as { data?: Proceso })?.data ?? (creado as Proceso)
      procesoId = dataCreado?.id
    }

    const teniaPlantilla = Boolean(plantillaPendiente.value && procesoId)
    if (teniaPlantilla && procesoId) {
      await subirPlantillaProceso(procesoId)
    }

    toast.add({
      title: isEditing.value ? 'Proceso actualizado' : 'Proceso creado',
      description: teniaPlantilla
        ? 'Datos y plantilla Word guardados correctamente.'
        : isEditing.value
          ? 'Los cambios fueron guardados exitosamente.'
          : 'El proceso fue registrado exitosamente.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

    open.value = false
    emit('guardado')
  } catch (error: any) {
    toast.add({
      title: 'Error al guardar',
      description:
        error?.data?.message ||
        (Array.isArray(error?.data?.message) ? error.data.message.join(', ') : null) ||
        error?.message ||
        'No se pudo guardar el proceso',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? 'Editar Proceso' : 'Nuevo Proceso'"
    :description="isEditing ? 'Modifique la configuración del trámite o proceso.' : 'Registre un nuevo proceso del sistema de correspondencia.'"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <UForm
        id="proceso-form"
        :schema="procesoSchema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UFormField label="Código" name="codigo" required class="sm:col-span-1">
            <UInput
              v-model="form.codigo"
              placeholder="Ej. EST"
              icon="i-lucide-hash"
              class="w-full uppercase"
              autofocus
            />
          </UFormField>
          <UFormField label="Nombre" name="nombre" required class="sm:col-span-2">
            <UInput
              v-model="form.nombre"
              placeholder="Ej. Adecuación estatutaria"
              icon="i-lucide-workflow"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Días de plazo" name="ndias_plazo" help="Plazo referencial del trámite.">
          <UInput
            v-model.number="form.ndias_plazo"
            type="number"
            min="0"
            placeholder="Ej. 15"
            icon="i-lucide-calendar-clock"
            class="w-full"
          />
        </UFormField>

        <div class="space-y-2 p-4 rounded-xl border border-default bg-elevated/40">
          <div class="flex items-start gap-3">
            <div class="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-file-type" class="size-5" />
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <p class="text-sm font-semibold text-highlighted">Plantilla Word (OnlyOffice)</p>
              <p class="text-xs text-muted">
                Documento .doc o .docx. Máximo {{ MAX_PLANTILLA_MB }} MB. Se almacena en MinIO.
              </p>
              <p v-if="nombrePlantillaActual" class="text-xs text-highlighted truncate" :title="nombrePlantillaActual">
                {{ plantillaPendiente ? 'Seleccionada: ' : 'Actual: ' }}{{ nombrePlantillaActual }}
              </p>
              <p v-else class="text-xs text-muted italic">
                Sin plantilla cargada.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-1">
            <input
              ref="fileInputRef"
              type="file"
              accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              class="hidden"
              @change="onPlantillaSeleccionada"
            >
            <UButton
              type="button"
              :label="plantillaPathActual || plantillaPendiente ? 'Cambiar plantilla' : 'Seleccionar plantilla'"
              icon="i-lucide-upload"
              color="primary"
              variant="soft"
              size="sm"
              :loading="uploadingPlantilla"
              @click="abrirSelectorPlantilla"
            />
            <UButton
              v-if="plantillaPendiente"
              type="button"
              label="Quitar selección"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="quitarPlantillaPendiente"
            />
            <UButton
              v-if="plantillaPathActual && !plantillaPendiente"
              type="button"
              label="Descargar"
              icon="i-lucide-download"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="descargarPlantillaActual"
            />
          </div>
          <p v-if="!isEditing && plantillaPendiente" class="text-[11px] text-muted">
            La plantilla se subirá al guardar el nuevo proceso.
          </p>
        </div>

        <div class="space-y-3 rounded-xl border border-default p-3">
          <UCheckbox
            v-model="form.interna"
            label="Proceso interno"
            description="Trámite generado y gestionado dentro de la institución."
          />
          <UCheckbox
            v-model="form.requiere_cooperativa"
            label="Requiere cooperativa"
            description="Solicita datos del solicitante y cooperativa al crear correspondencia."
          />
          <UCheckbox
            v-model="form.requiere_entidad"
            label="Requiere entidad"
            description="Obliga a vincular una entidad externa."
          />
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" :disabled="saving" @click="open = false" />
        <UButton
          :label="isEditing ? 'Guardar Cambios' : 'Registrar Proceso'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving || uploadingPlantilla"
          type="submit"
          form="proceso-form"
        />
      </div>
    </template>
  </UModal>
</template>
