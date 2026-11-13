<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Correspondencia } from '~/types/correspondencia'
import type { CreateDerivacionPayload, Derivacion } from '~/types/derivacion'
import type { FlujoAccion } from '~/types/flujo-accion'
import { backendService } from '~/services/backend.service'
import {
  correspondenciaPuedeDerivar,
  etiquetaNumeroCorrespondencia,
  mensajeNoDerivarCorrespondencia,
} from '~/utils/correspondencia'

const props = defineProps<{
  correspondencia?: Correspondencia | null
  /** Estado de la derivación en bandeja (flujo_acciones.id_estado se compara con este valor). */
  derivacionEstadoId?: number | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'derivado'): void
}>()

const toast = useToast()
const { cargoActivo, resolveCargoOrigenId } = useProfile()
const saving = ref(false)
const loadingAcciones = ref(false)
const acciones = ref<FlujoAccion[]>([])

const schema = z.object({
  accion_id: z.number({ message: 'Seleccione una operación del flujo' }),
  instruccion: z
    .string()
    .trim()
    .min(3, 'La instrucción debe tener al menos 3 caracteres')
    .max(500, 'No puede exceder 500 caracteres'),
  fecha_plazo: z
    .string()
    .optional()
    .refine(
      (val) => !val?.trim() || /^\d{4}-\d{2}-\d{2}$/.test(val.trim()),
      'Use una fecha válida (YYYY-MM-DD)',
    ),
})

type FormState = z.infer<typeof schema>

const form = ref<FormState>({
  accion_id: undefined as unknown as number,
  instruccion: '',
  fecha_plazo: '',
})

const fechaPlazoHoy = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const fechaPlazoMinima = computed(() => fechaPlazoHoy())

const tituloDoc = computed(() => {
  const c = props.correspondencia
  if (!c) return ''
  return `${etiquetaNumeroCorrespondencia(c)} — ${c.referencia?.slice(0, 80) || 'Sin referencia'}`
})

const cargoOrigenId = computed(
  () => resolveCargoOrigenId() || cargoActivo.value?.id || null,
)

const procIdCorrespondencia = computed(
  () =>
    props.correspondencia?.proc_id ?? props.correspondencia?.proceso?.id ?? null,
)

/** Estado para filtrar flujo: derivación en bandeja; si no hay, estado del documento (bandeja correspondencia). */
const estadoIdParaFlujo = computed(
  () =>
    props.derivacionEstadoId ??
    props.correspondencia?.estado_id ??
    null,
)

/** Acciones activas del proceso, filtradas por cargo origen y estado de la derivación/documento. */
const accionesDisponibles = computed(() => {
  const cargoId = cargoOrigenId.value
  const estadoId = estadoIdParaFlujo.value
  return acciones.value.filter((a) => {
    if (!a.activo) return false
    if (cargoId && a.cargo_origen_id !== cargoId) return false
    if (a.id_estado != null && estadoId != null && a.id_estado !== estadoId) {
      return false
    }
    return true
  })
})

const accionSeleccionada = computed(
  () => accionesDisponibles.value.find((a) => a.id === form.value.accion_id) || null,
)

const resetForm = () => {
  form.value = {
    accion_id: undefined as unknown as number,
    instruccion: '',
    fecha_plazo: '',
  }
}

const seleccionarAccion = (accion: FlujoAccion) => {
  form.value.accion_id = accion.id
  form.value.instruccion = accion.instruccion?.trim() || ''
}

const cargarAcciones = async () => {
  const procId = procIdCorrespondencia.value
  if (!procId) {
    acciones.value = []
    return
  }

  loadingAcciones.value = true
  try {
    const res = await backendService.get<FlujoAccion[]>(
      `procesos/${procId}/flujo-acciones`,
    )
    const data = (res as { data?: FlujoAccion[] })?.data ?? res
    acciones.value = Array.isArray(data) ? data : []
  } catch (error: unknown) {
    acciones.value = []
    const err = error as { message?: string }
    toast.add({
      title: 'Error al cargar el flujo',
      description: err?.message || 'No se pudieron obtener las acciones del proceso.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loadingAcciones.value = false
  }
}

watch(open, async (isOpen) => {
  if (!isOpen) return

  const c = props.correspondencia
  if (!c) {
    open.value = false
    return
  }

  if (!correspondenciaPuedeDerivar(c)) {
    toast.add({
      title: 'No se puede derivar',
      description: mensajeNoDerivarCorrespondencia(c),
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    open.value = false
    return
  }

  if (!cargoOrigenId.value) {
    toast.add({
      title: 'Sin cargo activo',
      description: 'Configure su cargo de trabajo antes de derivar.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    open.value = false
    return
  }

  resetForm()
  await cargarAcciones()

  // Autoseleccionar si solo hay una acción disponible
  if (accionesDisponibles.value.length === 1) {
    seleccionarAccion(accionesDisponibles.value[0]!)
  }
})

const handleSave = async (event?: FormSubmitEvent<FormState>) => {
  const data = event?.data || form.value
  const c = props.correspondencia
  if (!c?.id) return

  if (!correspondenciaPuedeDerivar(c)) {
    toast.add({
      title: 'No se puede derivar',
      description: mensajeNoDerivarCorrespondencia(c),
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  const accion = accionesDisponibles.value.find((a) => a.id === data.accion_id)
  if (!accion) {
    toast.add({
      title: 'Validación',
      description: 'Seleccione una operación del flujo.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  if (!accion.instruccion_id) {
    toast.add({
      title: 'Configuración incompleta',
      description:
        'La acción de flujo no tiene tipo de instrucción. Corríjala en la configuración del proceso.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  const cargoOrigen = cargoOrigenId.value
  if (!cargoOrigen) {
    toast.add({
      title: 'Sin cargo activo',
      description: 'Configure su cargo de trabajo antes de derivar.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  const fechaPlazo = data.fecha_plazo?.trim()
  if (fechaPlazo && fechaPlazo < fechaPlazoMinima.value) {
    toast.add({
      title: 'Validación',
      description: 'La fecha de plazo no puede ser anterior a hoy.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  saving.value = true
  try {
    const payload: CreateDerivacionPayload = {
      documento_id: c.id,
      cargo_destino_id: accion.cargo_destino_id,
      instruccion: data.instruccion.trim(),
      tipo_instruccion_id: Number(accion.instruccion_id),
      cargo_origen_id: cargoOrigen,
      ...(fechaPlazo ? { fecha_plazo: fechaPlazo } : {}),
    }

    await backendService.post<Derivacion>('derivaciones', payload)
    toast.add({
      title: 'Derivación enviada',
      description: accion.desc_operacion
        ? `Se registró la operación «${accion.desc_operacion}».`
        : 'La correspondencia fue derivada correctamente.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    open.value = false
    emit('derivado')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string | string[] }; message?: string }
    const msg =
      (Array.isArray(err?.data?.message) ? err.data.message.join(', ') : err?.data?.message) ||
      err?.message ||
      'No se pudo registrar la derivación'
    toast.add({
      title: 'Error al derivar',
      description: msg,
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
    title="Derivar según flujo del proceso"
    description="Elija la operación definida para este trámite. Puede ajustar la instrucción antes de enviar."
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div
        v-if="correspondencia"
        class="mb-4 p-3 rounded-md bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 text-xs"
      >
        <p class="font-semibold text-gray-800 dark:text-gray-200 truncate">
          {{ tituloDoc }}
        </p>
        <p class="text-muted mt-0.5">
          Origen:
          <span class="font-medium">{{ cargoActivo?.nombre || 'Cargo activo' }}</span>
        </p>
        <p
          v-if="correspondencia.proceso?.nombre"
          class="text-muted mt-0.5"
        >
          Proceso:
          <span class="font-medium">{{ correspondencia.proceso.nombre }}</span>
        </p>
      </div>

      <div
        v-if="loadingAcciones"
        class="py-8 text-center text-sm text-muted"
      >
        Cargando acciones del flujo...
      </div>

      <div
        v-else-if="accionesDisponibles.length === 0"
        class="py-6 px-3 rounded-md border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-sm text-amber-900 dark:text-amber-100"
      >
        <p class="font-semibold flex items-center gap-2">
          <UIcon name="i-lucide-git-branch" class="size-4" />
          Sin acciones disponibles
        </p>
        <p class="mt-1 text-xs opacity-90">
          No hay operaciones activas del flujo para su cargo
          <template v-if="cargoActivo?.nombre">
            («{{ cargoActivo.nombre }}»)
          </template>
          en el estado actual
          {{ derivacionEstadoId != null ? 'de la derivación' : 'del documento' }}.
          Revise la configuración de flujo del proceso.
        </p>
      </div>

      <UForm
        v-else
        id="derivacion-flujo-form"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <UFormField
          label="Operación"
          name="accion_id"
          required
          help="Seleccione la acción predefinida. El destino está fijado por el flujo."
        >
          <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
            <button
              v-for="accion in accionesDisponibles"
              :key="accion.id"
              type="button"
              class="w-full text-left p-3 rounded-md border transition-all duration-200"
              :class="[
                form.accion_id === accion.id
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700',
              ]"
              @click="seleccionarAccion(accion)"
            >
              <div class="flex items-start gap-2.5">
                <UCheckbox
                  :model-value="form.accion_id === accion.id"
                  class="mt-0.5 pointer-events-none"
                />
                <div class="min-w-0 flex-1 space-y-1">
                  <p class="text-sm font-semibold text-highlighted leading-tight">
                    {{ accion.desc_operacion?.trim() || accion.instruccion || `Acción #${accion.id}` }}
                  </p>
                  <p class="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                    <UIcon name="i-lucide-arrow-right" class="size-3.5 shrink-0" />
                    <span>
                      Destino:
                      <span class="font-medium text-highlighted">
                        {{ accion.cargo_destino?.nombre || 'Cargo destino' }}
                      </span>
                    </span>
                  </p>
                  <p
                    v-if="accion.estado?.nombre"
                    class="text-[11px] text-muted"
                  >
                    Estado: {{ accion.estado.nombre }}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </UFormField>

        <UFormField
          label="Instrucción / Proveído"
          name="instruccion"
          required
          help="Texto predefinido por el flujo; puede modificarlo antes de enviar."
        >
          <UTextarea
            v-model="form.instruccion"
            :rows="3"
            placeholder="Instrucción para el destinatario..."
            class="w-full"
            :disabled="!accionSeleccionada"
          />
        </UFormField>

        <UFormField
          label="Fecha de plazo"
          name="fecha_plazo"
          help="Opcional. Fecha máxima para atender esta derivación."
        >
          <UInput
            v-model="form.fecha_plazo"
            type="date"
            :min="fechaPlazoMinima"
            icon="i-lucide-calendar-clock"
            class="w-full"
          />
        </UFormField>
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
          form="derivacion-flujo-form"
          label="Derivar"
          icon="i-lucide-send"
          color="primary"
          :loading="saving"
          :disabled="loadingAcciones || accionesDisponibles.length === 0"
        />
      </div>
    </template>
  </UModal>
</template>
