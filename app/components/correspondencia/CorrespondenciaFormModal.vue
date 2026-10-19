<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CodificadorDto } from '~/types/codificador'
import type { Correspondencia, CorrespCooperativaPayload, CorrespEntidadPayload, CreateCorrespondenciaPayload, UpdateCorrespondenciaPayload } from '~/types/correspondencia'
import { TipoCodificadorEnum } from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'
import CodificadorSelect from '~/components/codificador/CodificadorSelect.vue'
import CorrespCooperativaFields, { type CorrespCooperativaFormState } from '~/components/correspondencia/CorrespCooperativaFields.vue'
import EntidadSelect from '~/components/correspondencia/EntidadSelect.vue'
import { correspondenciaSinNumerar, correspondenciaTieneCite } from '~/utils/correspondencia'

const props = defineProps<{
  correspondencia?: Correspondencia | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const { profile, cargoActivo, cargoOrigen, cargoOrigenId, areaActiva, resolveCargoOrigenId } = useProfile()
const saving = ref(false)
const assigningNumeracion = ref(false)
/** Al crear: si es true, genera HR, correlativo y CITE en el backend. */
const asignarCiteHr = ref(true)

// Estado para Hoja de Ruta: 'nueva' o 'existente'
const tipoHr = ref<'nueva' | 'existente'>('nueva')
const nroHrInput = ref<number | undefined>(undefined)
const verificandoHr = ref(false)
const hrEncontrada = ref<any | null>(null)
const errorHr = ref<string | null>(null)
const requiereCooperativa = ref(false)
const requiereEntidad = ref(false)
const entidadId = ref<number | undefined>(undefined)

const emptyCooperativa = (): CorrespCooperativaFormState => ({
  cooperativa_id: undefined,
  solicitante: '',
  nro_carnet: '',
  cargo_solicitante: '',
  correo_solicitante: '',
  nro_poder: '',
  nro_deposito: '',
  importe: undefined,
  telefono: '',
})

const cooperativaSchema = z.object({
  cooperativa_id: z.number({ message: 'Debe seleccionar una cooperativa' }),
  solicitante: z
    .string()
    .trim()
    .min(3, 'El nombre del solicitante debe tener al menos 3 caracteres'),
  nro_carnet: z
    .string()
    .trim()
    .min(5, 'El número de carnet es obligatorio')
    .max(20, 'El número de carnet no puede exceder 20 caracteres'),
  cargo_solicitante: z.string().optional(),
  correo_solicitante: z
    .string()
    .trim()
    .optional()
    .refine(
      (valor) => !valor || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor),
      'El correo del solicitante no es válido',
    ),
  nro_poder: z.string().optional(),
  nro_deposito: z.string().optional(),
  importe: z
    .union([z.number().nonnegative('El importe no puede ser negativo'), z.nan(), z.undefined()])
    .optional(),
  telefono: z.string().optional(),
})

// Esquema de validación con Zod
const correspondenciaSchema = computed(() => {
  const baseFields = {
    referencia: z
      .string()
      .trim()
      .min(3, 'La referencia debe tener al menos 3 caracteres')
      .max(1000, 'No puede exceder 1000 caracteres'),
    proc_id: z.number({ message: 'Debe seleccionar un proceso' }),
    prioridad_id: z.number({ message: 'Debe seleccionar una prioridad' }),
    confidencial: z.boolean().default(false),
    cite_origen: z.string().optional(),
    remitente_id: z
      .string({ message: 'Debe seleccionar el cargo remitente' })
      .min(1, 'Debe seleccionar el cargo remitente')
      .uuid('Debe seleccionar un cargo remitente válido'),
    destinatario_id: z
      .string({ message: 'Debe seleccionar el cargo destinatario' })
      .min(1, 'Debe seleccionar el cargo destinatario')
      .uuid('Debe seleccionar un cargo destinatario válido'),
  }

  if (!requiereCooperativa.value) {
    return z.object({
      ...baseFields,
      cooperativa: z.any().optional(),
    })
  }

  return z.object({
    ...baseFields,
    cooperativa: cooperativaSchema,
  })
})

type CorrespondenciaSchemaType = {
  referencia: string
  proc_id: number
  prioridad_id: number
  confidencial: boolean
  cite_origen?: string
  remitente_id: string
  destinatario_id: string
  cooperativa: CorrespCooperativaFormState
}

const form = ref<CorrespondenciaSchemaType>({
  referencia: '',
  proc_id: undefined as any,
  prioridad_id: undefined as any,
  confidencial: false,
  cite_origen: '',
  remitente_id: '',
  destinatario_id: '',
  cooperativa: emptyCooperativa(),
})

const defaultRemitenteId = () => resolveCargoOrigenId() || cargoOrigenId.value || cargoActivo.value?.id || ''

const onProcesoSeleccionado = (item: CodificadorDto | null) => {
  if (!item) {
    if (!form.value.proc_id) {
      requiereCooperativa.value = false
      requiereEntidad.value = false
      entidadId.value = undefined
    }
    return
  }

  const nextCoop = Boolean(item.requiere_cooperativa)
  if (requiereCooperativa.value && !nextCoop) {
    form.value.cooperativa = emptyCooperativa()
  }
  requiereCooperativa.value = nextCoop

  const nextEntidad = Boolean(item.requiere_entidad)
  if (requiereEntidad.value && !nextEntidad) {
    entidadId.value = undefined
  }
  requiereEntidad.value = nextEntidad
}

const mapCooperativaExistente = (val: Correspondencia): CorrespCooperativaFormState => {
  const existente = val.corresp_cooperativa?.[0]
  if (!existente) {
    return emptyCooperativa()
  }

  const importeNumerico =
    existente.importe === null || existente.importe === undefined || existente.importe === ''
      ? undefined
      : Number(existente.importe)

  return {
    cooperativa_id: existente.cooperativa_id,
    solicitante: existente.solicitante || '',
    nro_carnet: existente.nro_carnet || '',
    cargo_solicitante: existente.cargo_solicitante || '',
    correo_solicitante: existente.correo_solicitante || '',
    nro_poder: existente.nro_poder || '',
    nro_deposito: existente.nro_deposito || '',
    importe: Number.isFinite(importeNumerico) ? importeNumerico : undefined,
    telefono: existente.telefono || '',
  }
}

const buildCooperativaPayload = (): CorrespCooperativaPayload | undefined => {
  if (!requiereCooperativa.value) {
    return undefined
  }

  const coop = form.value.cooperativa
  return {
    cooperativa_id: Number(coop.cooperativa_id),
    solicitante: coop.solicitante.trim(),
    nro_carnet: coop.nro_carnet.trim(),
    cargo_solicitante: coop.cargo_solicitante?.trim() || undefined,
    correo_solicitante: coop.correo_solicitante?.trim() || undefined,
    nro_poder: coop.nro_poder?.trim() || undefined,
    nro_deposito: coop.nro_deposito?.trim() || undefined,
    importe: coop.importe === undefined || coop.importe === null || Number.isNaN(Number(coop.importe))
      ? undefined
      : Number(coop.importe),
    telefono: coop.telefono?.trim() || undefined,
  }
}

const buildEntidadesPayload = (): CorrespEntidadPayload | undefined => {
  if (!requiereEntidad.value || !entidadId.value) {
    return undefined
  }
  return {
    entidades_ids: [Number(entidadId.value)],
  }
}

const isEditing = computed(() => !!props.correspondencia?.id)

const pendienteNumeracion = computed(() => {
  const c = props.correspondencia
  if (!c?.id) return false
  return correspondenciaSinNumerar(c) && !correspondenciaTieneCite(c)
})

const mostrarHrAlCrear = computed(() => !isEditing.value && asignarCiteHr.value)

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

const remitenteParams = computed(() => {
  if (areaActivaId.value) {
    return { area_id: areaActivaId.value }
  }
  return {}
})

const resetFormularioNueva = () => {
  form.value = {
    referencia: '',
    proc_id: undefined as any,
    prioridad_id: undefined as any,
    confidencial: false,
    cite_origen: '',
    remitente_id: defaultRemitenteId(),
    destinatario_id: '',
    cooperativa: emptyCooperativa(),
  }
  requiereCooperativa.value = false
  requiereEntidad.value = false
  entidadId.value = undefined
  tipoHr.value = 'nueva'
  nroHrInput.value = undefined
  hrEncontrada.value = null
  errorHr.value = null
  asignarCiteHr.value = true
}

const cargarFormularioEdicion = (val: Correspondencia) => {
  form.value = {
    referencia: val.referencia || '',
    proc_id: val.proc_id,
    prioridad_id: val.prioridad_id,
    confidencial: Boolean(val.confidencial),
    cite_origen: val.cite_origen || '',
    remitente_id: val.remitente_id || val.cargos?.id || defaultRemitenteId(),
    destinatario_id: val.destinatario_id || val.cargo_destinatario?.id || '',
    cooperativa: mapCooperativaExistente(val),
  }
  requiereCooperativa.value = Boolean(
    val.proceso?.requiere_cooperativa || val.corresp_cooperativa?.length,
  )
  requiereEntidad.value = Boolean(
    val.proceso?.requiere_entidad || val.corresp_entidad?.length,
  )
  entidadId.value = val.corresp_entidad?.[0]?.entidad_id
  tipoHr.value = val.hoja_ruta ? 'existente' : 'nueva'
  nroHrInput.value = val.hoja_ruta?.numero
  hrEncontrada.value = val.hoja_ruta || null
  errorHr.value = null
  asignarCiteHr.value = !(correspondenciaSinNumerar(val) && !correspondenciaTieneCite(val))
}

const sincronizarFormularioConProps = () => {
  const val = props.correspondencia
  if (val?.id) {
    cargarFormularioEdicion(val)
  } else {
    resetFormularioNueva()
  }
}

watch(() => props.correspondencia, sincronizarFormularioConProps, { immediate: true })

// Al abrir el modal, reiniciar siempre (evita datos previos cuando correspondencia sigue null)
watch(open, (isOpen) => {
  if (isOpen) {
    sincronizarFormularioConProps()
  }
})

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

  if (!data.destinatario_id?.trim()) {
    toast.add({
      title: 'Validación',
      description: 'Debe seleccionar el cargo destinatario.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  if (!data.remitente_id?.trim()) {
    toast.add({
      title: 'Validación',
      description: 'Debe seleccionar el cargo remitente (misma área de origen).',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  const cargoOrigenId = resolveCargoOrigenId()
  if (!cargoOrigenId) {
    toast.add({
      title: 'Error de configuración',
      description: 'No se detectó el cargo de origen en su sesión. Vaya a Configuración y seleccione su cargo activo.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  if (requiereCooperativa.value) {
    const coop = data.cooperativa || form.value.cooperativa
    if (!coop?.cooperativa_id || !coop.solicitante?.trim() || !coop.nro_carnet?.trim()) {
      toast.add({
        title: 'Validación',
        description: 'Debe completar cooperativa, solicitante y número de carnet.',
        color: 'warning',
        icon: 'i-lucide-alert-triangle',
      })
      return
    }
  }

  if (requiereEntidad.value && !entidadId.value) {
    toast.add({
      title: 'Validación',
      description: 'Debe seleccionar una entidad externa.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  const areaOrigenId = areaActivaId.value || profile.value?.area_activa_id || (import.meta.client ? sessionStorage.getItem('area_activa_id') : null)

  if (!areaOrigenId) {
    toast.add({
      title: 'Error de configuración',
      description: 'No se detectó un área activa configurada en su perfil. Vaya a Configuración para seleccionarla.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  // Validación de HR si asignará CITE/HR
  if ((!isEditing.value && asignarCiteHr.value && tipoHr.value === 'existente')
    || (pendienteNumeracion.value && tipoHr.value === 'existente')) {
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
        remitente_id: data.remitente_id.trim(),
        destinatario_id: data.destinatario_id.trim(),
        cooperativa: buildCooperativaPayload(),
        entidades: buildEntidadesPayload(),
      }
      if (!pendienteNumeracion.value && data.cite_origen?.trim()) {
        payload.cite_origen = data.cite_origen.trim()
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
        cargo_origen_id: cargoOrigenId,
        remitente_id: data.remitente_id.trim(),
        asignar_cite_hr: asignarCiteHr.value,
        es_nueva_hr: asignarCiteHr.value ? tipoHr.value === 'nueva' : false,
        nro_hr: asignarCiteHr.value && tipoHr.value === 'existente' ? Number(nroHrInput.value) : undefined,
        destinatario_id: data.destinatario_id.trim(),
        cooperativa: buildCooperativaPayload(),
        entidades: buildEntidadesPayload(),
      }

      await backendService.post<Correspondencia>('correspondencia', payload)
      toast.add({
        title: 'Correspondencia creada',
        description: asignarCiteHr.value
          ? (tipoHr.value === 'nueva'
            ? 'Correspondencia numerada con CITE y nueva Hoja de Ruta.'
            : 'Correspondencia numerada con CITE y asociada a la HR existente.')
          : 'Borrador registrado sin numeración. Podrá asignar CITE y HR más adelante.',
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

const handleAsignarCiteHr = async () => {
  const id = props.correspondencia?.id
  if (!id || !pendienteNumeracion.value) return

  if (tipoHr.value === 'existente' && !nroHrInput.value) {
    toast.add({
      title: 'Validación',
      description: 'Debe indicar el número de Hoja de Ruta existente.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  assigningNumeracion.value = true
  try {
    const res = await backendService.post<Correspondencia>(`correspondencia/${id}/asignar-cite-hr`, {
      es_nueva_hr: tipoHr.value === 'nueva',
      nro_hr: tipoHr.value === 'existente' ? Number(nroHrInput.value) : undefined,
    })
    const data = (res as { data?: Correspondencia })?.data ?? (res as Correspondencia)
    toast.add({
      title: 'CITE y numeración asignados',
      description: data.cite_origen
        ? `Correlativo ${data.nro}/${data.gestion} · ${data.cite_origen}`
        : 'La correspondencia fue numerada correctamente.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    open.value = false
    emit('guardado')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string | string[] }; message?: string }
    const msg = err?.data?.message
    toast.add({
      title: 'No se pudo asignar CITE',
      description: Array.isArray(msg) ? msg.join(', ') : msg || err?.message || 'Error al numerar la correspondencia.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    assigningNumeracion.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? 'Editar Correspondencia' : 'Nueva Correspondencia'"
    :description="isEditing ? 'Modifique los campos correspondientes del registro.' : 'Complete la información para generar o asociar la correspondencia.'"
    :ui="{
      content: requiereCooperativa || requiereEntidad ? 'sm:max-w-3xl' : 'sm:max-w-2xl',
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
        <!-- Cargo de origen (registro) y área activa -->
        <div class="p-3 rounded-xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-clipboard-pen" class="size-4 text-primary-600 shrink-0" />
            <div>
              <span class="font-bold text-gray-800 dark:text-gray-200">Cargo de origen (registro): </span>
              <span class="text-gray-600 dark:text-gray-400">{{ cargoOrigen?.nombre || cargoActivo?.nombre || 'Configure su cargo en Configuración' }}</span>
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

        <UFormField
          label="Cargo remitente"
          name="remitente_id"
          required
          help="Cargo de su área que figura como remitente de la nota. Por defecto coincide con su cargo de origen."
        >
          <CodificadorSelect
            v-model="form.remitente_id"
            endpoint="comun/codificador/cargos"
            :params="remitenteParams"
            placeholder="Seleccione el cargo remitente..."
            class="w-full"
          />
        </UFormField>

        <div
          v-if="!isEditing"
          class="p-3 rounded-xl border border-default bg-elevated/30"
        >
          <UCheckbox
            v-model="asignarCiteHr"
            label="Asignar CITE y Hoja de Ruta"
            description="Si está desmarcado, se guarda un borrador sin número ni HR. Podrá numerar y asignar CITE después."
          />
        </div>

        <div
          v-if="pendienteNumeracion"
          class="p-3 rounded-xl border border-warning/40 bg-warning/10 text-xs text-default space-y-1"
        >
          <p class="font-semibold text-highlighted flex items-center gap-1.5">
            <UIcon name="i-lucide-hash" class="size-4 text-warning" />
            Pendiente de numeración y CITE
          </p>
          <p class="text-muted">
            Configure la Hoja de Ruta y pulse «Asignar CITE y numerar». El CITE se generará automáticamente al numerar.
          </p>
        </div>

        <CorrespondenciaHojaRutaFields
          v-if="mostrarHrAlCrear || pendienteNumeracion"
          v-model:tipo-hr="tipoHr"
          v-model:nro-hr-input="nroHrInput"
          v-model:hr-encontrada="hrEncontrada"
          v-model:error-hr="errorHr"
          :verificando-hr="verificandoHr"
          @verificar="buscarHojaRutaExistente"
        />

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
              @item-selected="onProcesoSeleccionado"
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

        <CorrespCooperativaFields
          v-if="requiereCooperativa"
          v-model="form.cooperativa"
        />

        <div
          v-if="requiereEntidad"
          class="p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 space-y-4"
        >
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-building-2" class="size-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-200">
                Entidad externa
              </p>
              <p class="text-[11px] text-sky-700/80 dark:text-sky-300/80 mt-0.5">
                El proceso seleccionado requiere vincular una entidad de la tabla de entidades.
              </p>
            </div>
          </div>

          <UFormField
            label="Entidad"
            name="entidad_id"
            required
            help="Seleccione la entidad externa asociada a este trámite."
          >
            <EntidadSelect v-model="entidadId" />
          </UFormField>
        </div>

        <!-- Cargo destinatario (plantilla / trámite) -->
        <UFormField
          label="Cargo destinatario"
          name="destinatario_id"
          required
          help="Cargo institucional al que va dirigida la correspondencia. Se usa en la plantilla del documento ({destinatario}, {cargo_destinatario})."
        >
          <CodificadorSelect
            v-model="form.destinatario_id"
            endpoint="comun/codificador/cargos"
            placeholder="Seleccione el cargo destinatario..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="isEditing && correspondencia && correspondenciaTieneCite(correspondencia)"
          label="CITE asignado"
          name="cite_origen"
        >
          <UInput
            v-model="form.cite_origen"
            icon="i-lucide-file-code"
            class="w-full font-mono"
            disabled
          />
        </UFormField>

        <UCheckbox
          v-model="form.confidencial"
          label="Documento confidencial"
          description="Restringe la visualización a remitente y destinatarios autorizados."
        />
      </UForm>
    </template>

    <template #footer>
      <div class="flex flex-wrap items-center justify-end gap-3 w-full">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="outline"
          :disabled="saving || assigningNumeracion"
          @click="open = false"
        />
        <UButton
          v-if="pendienteNumeracion"
          label="Asignar CITE y numerar"
          icon="i-lucide-stamp"
          color="primary"
          variant="soft"
          :loading="assigningNumeracion"
          :disabled="saving"
          @click="handleAsignarCiteHr"
        />
        <UButton
          type="submit"
          form="corresp-form"
          :label="isEditing ? 'Guardar cambios' : 'Registrar correspondencia'"
          icon="i-lucide-save"
          color="primary"
          :loading="saving"
          :disabled="assigningNumeracion"
        />
      </div>
    </template>
  </UModal>
</template>
