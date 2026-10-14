<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Correspondencia, CreateCorrespondenciaPayload, UpdateCorrespondenciaPayload } from '~/types/correspondencia'
import { TipoCodificadorEnum } from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'
import CodificadorSelect from '~/components/codificador/CodificadorSelect.vue'

const props = defineProps<{
  correspondencia?: Correspondencia | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const { profile, cargoActivo, areaActiva } = useProfile()
const saving = ref(false)

// Estado para Hoja de Ruta: 'nueva' o 'existente'
const tipoHr = ref<'nueva' | 'existente'>('nueva')
const nroHrInput = ref<number | undefined>(undefined)
const verificandoHr = ref(false)
const hrEncontrada = ref<any | null>(null)
const errorHr = ref<string | null>(null)

// Esquema de validación con Zod
const correspondenciaSchema = z.object({
  referencia: z
    .string()
    .trim()
    .min(3, 'La referencia debe tener al menos 3 caracteres')
    .max(1000, 'No puede exceder 1000 caracteres'),
  proc_id: z.number({ message: 'Debe seleccionar un proceso' }),
  prioridad_id: z.number({ message: 'Debe seleccionar una prioridad' }),
  confidencial: z.boolean().default(false),
  cite_origen: z.string().optional(),
  firmado_id: z.string().optional(),
})

type CorrespondenciaSchemaType = z.infer<typeof correspondenciaSchema>

const form = ref<CorrespondenciaSchemaType>({
  referencia: '',
  proc_id: undefined as any,
  prioridad_id: undefined as any,
  confidencial: false,
  cite_origen: '',
  firmado_id: '',
})

const isEditing = computed(() => !!props.correspondencia?.id)

// Obtener area_activa_id priorizando localStorage, sessionStorage y useProfile
const areaActivaId = computed(() => {
  if (import.meta.client) {
    const fromLocal = localStorage.getItem('area_activa_id')
    if (fromLocal) return fromLocal

    const userProfileRaw = localStorage.getItem('user_profile_data')
    if (userProfileRaw) {
      try {
        const parsed = JSON.parse(userProfileRaw)
        if (parsed?.area_activa_id) return parsed.area_activa_id
      } catch (e) {
        // Ignorar error de parsing
      }
    }

    const fromSession = sessionStorage.getItem('area_activa_id')
    if (fromSession) return fromSession
  }
  return profile.value?.area_activa_id || areaActiva.value?.id || null
})

// Parámetros para filtrar procesos en CodificadorSelect en base a area_proceso
const procesoParams = computed(() => {
  if (areaActivaId.value) {
    return { area_id: areaActivaId.value }
  }
  return {}
})

// Observar cambio de correspondencia a editar
watch(
  () => props.correspondencia,
  (val) => {
    if (val) {
      form.value = {
        referencia: val.referencia || '',
        proc_id: val.proc_id,
        prioridad_id: val.prioridad_id,
        confidencial: Boolean(val.confidencial),
        cite_origen: val.cite_origen || '',
        firmado_id: val.firmado_id || '',
      }
      tipoHr.value = 'existente'
      nroHrInput.value = val.hoja_ruta?.numero
      hrEncontrada.value = val.hoja_ruta || null
    } else {
      form.value = {
        referencia: '',
        proc_id: undefined as any,
        prioridad_id: undefined as any,
        confidencial: false,
        cite_origen: '',
        firmado_id: profile.value?.usuario?.id || (profile.value as any)?.id || '',
      }
      tipoHr.value = 'nueva'
      nroHrInput.value = undefined
      hrEncontrada.value = null
      errorHr.value = null
    }
  },
  { immediate: true },
)

// Buscar HR existente si el usuario ingresa un número
const buscarHojaRutaExistente = async () => {
  if (!nroHrInput.value) {
    errorHr.value = 'Ingrese un número de Hoja de Ruta'
    hrEncontrada.value = null
    return
  }

  verificandoHr.value = true
  errorHr.value = null
  try {
    const res = await backendService.get<any>(`/correspondencia/hoja-ruta/buscar?numero=${nroHrInput.value}`)
    const data = (res as any)?.data || res
    if (data) {
      hrEncontrada.value = data
      toast.add({
        title: 'Hoja de Ruta encontrada',
        description: `HR Nº ${data.numero}/${data.anio} - ${data.referencia || 'Sin referencia'}`,
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }
  } catch (err: any) {
    hrEncontrada.value = null
    errorHr.value = err?.data?.message || err?.message || 'No se encontró la Hoja de Ruta indicada'
  } finally {
    verificandoHr.value = false
  }
}

const handleSave = async (event?: FormSubmitEvent<CorrespondenciaSchemaType>) => {
  const data = event?.data || form.value

  // Validaciones previas
  if (!data.proc_id) {
    toast.add({
      title: 'Validación',
      description: 'Debe seleccionar un proceso.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  if (!data.prioridad_id) {
    toast.add({
      title: 'Validación',
      description: 'Debe seleccionar la prioridad.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  // Obtener área_activa_id y cargo_activo_id de localStorage / sessionStorage / composable
  const areaOrigenId = areaActivaId.value || profile.value?.area_activa_id || (import.meta.client ? sessionStorage.getItem('area_activa_id') : null)
  const remitenteId = profile.value?.cargo_activo_id || cargoActivo.value?.id

  if (!areaOrigenId) {
    toast.add({
      title: 'Error de configuración',
      description: 'No se detectó un área activa configurada en su perfil. Vaya a Configuración para seleccionarla.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  // Validación de HR si es creación y asociar existente
  if (!isEditing.value && tipoHr.value === 'existente') {
    if (!nroHrInput.value) {
      toast.add({
        title: 'Validación',
        description: 'Debe indicar el número de Hoja de Ruta existente.',
        color: 'warning',
        icon: 'i-lucide-alert-triangle',
      })
      return
    }
  }

  saving.value = true
  try {
    if (isEditing.value && props.correspondencia?.id) {
      const payload: UpdateCorrespondenciaPayload = {
        referencia: data.referencia.trim(),
        proc_id: Number(data.proc_id),
        prioridad_id: Number(data.prioridad_id),
        confidencial: Boolean(data.confidencial),
        cite_origen: data.cite_origen?.trim() || undefined,
        firmado_id: data.firmado_id || undefined,
      }

      await backendService.patch<Correspondencia>('correspondencia', props.correspondencia.id, payload)
      toast.add({
        title: 'Correspondencia actualizada',
        description: 'Los cambios fueron guardados exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      const payload: CreateCorrespondenciaPayload = {
        referencia: data.referencia.trim(),
        proc_id: Number(data.proc_id),
        prioridad_id: Number(data.prioridad_id),
        confidencial: Boolean(data.confidencial),
        area_origen_id: areaOrigenId,
        remitente_id: remitenteId || undefined,
        firmado_id: data.firmado_id || undefined,
        es_nueva_hr: tipoHr.value === 'nueva',
        nro_hr: tipoHr.value === 'existente' ? Number(nroHrInput.value) : undefined,
        cite_origen: data.cite_origen?.trim() || undefined,
      }

      await backendService.post<Correspondencia>('correspondencia', payload)
      toast.add({
        title: 'Correspondencia creada',
        description: tipoHr.value === 'nueva' 
          ? 'Correspondencia y nueva Hoja de Ruta generadas con éxito.' 
          : 'Correspondencia asociada a la Hoja de Ruta existente con éxito.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }

    open.value = false
    emit('guardado')
  } catch (error: any) {
    const errorMsg =
      error?.data?.message ||
      (Array.isArray(error?.data?.message) ? error.data.message.join(', ') : null) ||
      error?.message ||
      'Ocurrió un error al procesar la correspondencia'

    toast.add({
      title: 'Error al guardar',
      description: errorMsg,
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
    :title="isEditing ? 'Editar Correspondencia' : 'Nueva Correspondencia'"
    :description="isEditing ? 'Modifique los campos correspondientes del registro.' : 'Complete la información para generar o asociar la correspondencia.'"
    :ui="{
      content: 'sm:max-w-2xl',
    }"
  >
    <template #body>
      <UForm
        id="corresp-form"
        :schema="correspondenciaSchema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <!-- Banner Informativo del Remitente / Área activa -->
        <div class="p-3 rounded-xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-user-check" class="size-4 text-primary-600 shrink-0" />
            <div>
              <span class="font-bold text-gray-800 dark:text-gray-200">Remitente: </span>
              <span class="text-gray-600 dark:text-gray-400">{{ cargoActivo?.nombre || 'Mi cargo activo' }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-building" class="size-4 text-primary-600 shrink-0" />
            <div>
              <span class="font-bold text-gray-800 dark:text-gray-200">Área: </span>
              <span class="text-gray-600 dark:text-gray-400">{{ areaActiva?.nombre || profile?.area_activa_nombre || 'Área activa' }}</span>
            </div>
          </div>
        </div>

        <!-- Sección Hoja de Ruta (Solo en creación) -->
        <div v-if="!isEditing" class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <UIcon name="i-lucide-git-branch" class="size-4 text-primary-500" />
              Gestión de Hoja de Ruta (HR)
            </label>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 cursor-pointer"
              :class="[
                tipoHr === 'nueva'
                  ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100 ring-2 ring-primary-500/20'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              ]"
              @click="tipoHr = 'nueva'"
            >
              <UIcon name="i-lucide-plus-circle" class="size-5 shrink-0 text-primary-500 mt-0.5" />
              <div>
                <div class="font-semibold text-xs">Nueva Hoja de Ruta</div>
                <div class="text-[11px] text-gray-500 dark:text-gray-400">Crear nuevo correlativo HR con la misma referencia</div>
              </div>
            </button>

            <button
              type="button"
              class="p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 cursor-pointer"
              :class="[
                tipoHr === 'existente'
                  ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100 ring-2 ring-primary-500/20'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              ]"
              @click="tipoHr = 'existente'"
            >
              <UIcon name="i-lucide-link" class="size-5 shrink-0 text-primary-500 mt-0.5" />
              <div>
                <div class="font-semibold text-xs">Asociar a HR Existente</div>
                <div class="text-[11px] text-gray-500 dark:text-gray-400">Vincular a un expediente o trámite ya iniciado</div>
              </div>
            </button>
          </div>

          <!-- Campo de búsqueda de HR existente -->
          <div v-if="tipoHr === 'existente'" class="pt-2 space-y-2">
            <div class="flex gap-2">
              <UInput
                v-model.number="nroHrInput"
                type="number"
                placeholder="Ingrese Nº de Hoja de Ruta (Ej. 142)"
                icon="i-lucide-hash"
                class="flex-1"
                @keyup.enter="buscarHojaRutaExistente"
              />
              <UButton
                label="Verificar HR"
                icon="i-lucide-search"
                color="neutral"
                variant="subtle"
                :loading="verificandoHr"
                @click="buscarHojaRutaExistente"
              />
            </div>

            <div v-if="hrEncontrada" class="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-check-circle-2" class="size-4 shrink-0 text-emerald-500" />
                <span><strong>HR Nº {{ hrEncontrada.numero }}/{{ hrEncontrada.anio }}:</strong> {{ hrEncontrada.referencia || 'Sin referencia registrada' }}</span>
              </div>
              <UBadge color="success" variant="subtle" size="xs">Válida</UBadge>
            </div>

            <div v-if="errorHr" class="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0 text-rose-500" />
              <span>{{ errorHr }}</span>
            </div>
          </div>
        </div>

        <!-- Referencia -->
        <UFormField
          label="Referencia"
          name="referencia"
          required
          help="Descripción concisa y tema principal de la correspondencia."
        >
          <UTextarea
            v-model="form.referencia"
            placeholder="Ej. SOLICITUD DE INFORME TÉCNICO SOBRE ADECUACIÓN ESTATUTARIA..."
            class="w-full"
            :rows="3"
            autofocus
          />
        </UFormField>

        <!-- Proceso y Prioridad -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            label="Proceso"
            name="proc_id"
            required
            help="Filtrado según los procesos autorizados para el área activa."
          >
            <CodificadorSelect
              v-model="form.proc_id"
              endpoint="comun/codificador/procesos"
              :params="procesoParams"
              placeholder="Seleccione proceso..."
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Prioridad"
            name="prioridad_id"
            required
            help="Nivel de urgencia de la correspondencia."
          >
            <CodificadorSelect
              v-model="form.prioridad_id"
              endpoint="comun/codificador"
              :params="{ tipo_id: TipoCodificadorEnum.PRIORIDAD }"
              placeholder="Seleccione prioridad..."
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Usuario que Firma (firmado_id) -->
        <UFormField
          label="Usuario que Firma"
          name="firmado_id"
          help="Funcionario responsable de la firma del documento (por defecto el usuario actual)."
        >
          <CodificadorSelect
            v-model="form.firmado_id"
            endpoint="comun/codificador/usuarios"
            placeholder="Seleccione el funcionario que firma..."
            class="w-full"
          />
        </UFormField>

        <!-- CITE de origen y Check Confidencial -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <UFormField
            label="CITE Origen (Opcional)"
            name="cite_origen"
            help="Identificador o código institucional de la nota externa."
          >
            <UInput
              v-model="form.cite_origen"
              placeholder="Ej. AFCOOP-DGE-045/2026"
              icon="i-lucide-file-code"
              class="w-full"
            />
          </UFormField>

          <div class="pt-4 flex items-center">
            <UCheckbox
              v-model="form.confidencial"
              label="Documento Confidencial"
              description="Restringe la visualización exclusivamente a los cargos remitente y destinatarios."
            />
          </div>
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="outline"
          :disabled="saving"
          @click="open = false"
        />
        <UButton
          type="submit"
          form="corresp-form"
          :label="isEditing ? 'Guardar Cambios' : 'Registrar Correspondencia'"
          icon="i-lucide-save"
          color="primary"
          :loading="saving"
        />
      </div>
    </template>
  </UModal>
</template>
