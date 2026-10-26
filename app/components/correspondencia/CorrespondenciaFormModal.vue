<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent, StepperItem } from '@nuxt/ui'
import type { CodificadorDto } from '~/types/codificador'
import type {
  Correspondencia,
  CorrespCooperativaPayload,
  CorrespEntidadPayload,
  CreateCorrespondenciaPayload,
  RecDepositosPayload,
  UpdateCorrespondenciaPayload,
} from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'
import CorrespCooperativaFields, {
  type CorrespCooperativaFormState,
} from '~/components/correspondencia/CorrespCooperativaFields.vue'
import CorrespDatosGeneralesFields from '~/components/correspondencia/CorrespDatosGeneralesFields.vue'
import CorrespDepositosFields, {
  type CorrespDepositoFormItem,
} from '~/components/correspondencia/CorrespDepositosFields.vue'
import CorrespEntidadFields from '~/components/correspondencia/CorrespEntidadFields.vue'
import {
  citeOrigenCorrespondencia,
  correspondenciaSinNumerar,
  correspondenciaTieneCite,
} from '~/utils/correspondencia'

type StepValue = 'generales' | 'cooperativa' | 'entidad' | 'depositos'

const props = defineProps<{
  correspondencia?: Correspondencia | null
  /** Bandeja ingreso: documento recibido para responder en la misma HR */
  correspondenciaOrigenRespuesta?: Correspondencia | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const { profile, cargoActivo, cargoOrigen, cargoOrigenId, areaActiva, resolveCargoOrigenId } =
  useProfile()
const saving = ref(false)
const assigningNumeracion = ref(false)
/** Al crear: si es true, genera HR, correlativo y CITE en el backend. */
const asignarCiteHr = ref(true)

const tipoHr = ref<'nueva' | 'existente'>('nueva')
const nroHrInput = ref<number | undefined>(undefined)
const verificandoHr = ref(false)
const hrEncontrada = ref<Record<string, unknown> | null>(null)
const errorHr = ref<string | null>(null)
const requiereCooperativa = ref(false)
const requiereEntidad = ref(false)
const requierePago = ref(false)
const requiereCorelativo = ref(false)
const requiereDestinatario = ref(true)
const entidadId = ref<number | undefined>(undefined)
const remitenteEntidad = ref('')
const citeOrigenEntidad = ref('')
const codigoUnico = ref(crypto.randomUUID())

const activeStep = ref<StepValue>('generales')

const emptyCooperativa = (): CorrespCooperativaFormState => ({
  cooperativa_id: undefined,
  nombre_cooperativa: '',
  solicitante: '',
  nro_carnet: '',
  cargo_solicitante: '',
  correo_solicitante: '',
  nro_poder: '',
  telefono: '',
  cite_origen: '',
})

const emptyDeposito = (): CorrespDepositoFormItem => ({
  _key: crypto.randomUUID(),
  numero: '',
  importe: undefined as unknown as number,
  fecha_deposito: new Date().toISOString().slice(0, 10),
  observacion: '',
})

const cooperativaSchema = z
  .object({
    cooperativa_id: z.number().optional(),
    nombre_cooperativa: z.string().optional(),
    cite_origen: z.string().optional(),
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
    telefono: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.cooperativa_id && !data.nombre_cooperativa?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Seleccione una cooperativa o indique el nombre manualmente',
        path: ['cooperativa_id'],
      })
    }
  })

const depositoItemSchema = z.object({
  numero: z.string().trim().min(1, 'El número de boleta es obligatorio').max(200),
  importe: z
    .number({ message: 'El importe es obligatorio' })
    .positive('El importe debe ser mayor a 0'),
  fecha_deposito: z.string().min(1, 'La fecha de depósito es obligatoria'),
  observacion: z.string().optional(),
})

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
    remitente_id: z
      .string({ message: 'Debe seleccionar el cargo remitente' })
      .min(1, 'Debe seleccionar el cargo remitente')
      .uuid('Debe seleccionar un cargo remitente válido'),
    destinatario_id: requiereDestinatario.value
      ? z
          .string({ message: 'Debe seleccionar el cargo destinatario' })
          .min(1, 'Debe seleccionar el cargo destinatario')
          .uuid('Debe seleccionar un cargo destinatario válido')
      : z.string().optional(),
    cooperativa: requiereCooperativa.value ? cooperativaSchema : z.any().optional(),
    depositos: requierePago.value
      ? z.array(depositoItemSchema).min(1, 'Debe registrar al menos una boleta')
      : z.any().optional(),
  }

  return z.object(baseFields)
})

type CorrespondenciaSchemaType = {
  referencia: string
  proc_id: number
  prioridad_id: number
  confidencial: boolean
  remitente_id: string
  destinatario_id: string
  cooperativa: CorrespCooperativaFormState
  depositos: CorrespDepositoFormItem[]
}

const form = ref<CorrespondenciaSchemaType>({
  referencia: '',
  proc_id: undefined as unknown as number,
  prioridad_id: undefined as unknown as number,
  confidencial: false,
  remitente_id: '',
  destinatario_id: '',
  cooperativa: emptyCooperativa(),
  depositos: [emptyDeposito()],
})

const defaultRemitenteId = () =>
  resolveCargoOrigenId() || cargoOrigenId.value || cargoActivo.value?.id || ''

const stepperItems = computed<StepperItem[]>(() => {
  const items: StepperItem[] = [
    {
      value: 'generales',
      title: 'Generales',
      description: 'Datos del documento',
      icon: 'i-lucide-file-text',
      slot: 'generales' as const,
    },
  ]
  if (requiereCooperativa.value) {
    items.push({
      value: 'cooperativa',
      title: 'Cooperativa',
      description: 'Solicitante',
      icon: 'i-lucide-handshake',
      slot: 'cooperativa' as const,
    })
  }
  if (requiereEntidad.value) {
    items.push({
      value: 'entidad',
      title: 'Entidad',
      description: 'Remitente externo',
      icon: 'i-lucide-building-2',
      slot: 'entidad' as const,
    })
  }
  if (requierePago.value) {
    items.push({
      value: 'depositos',
      title: 'Depósitos',
      description: 'Boletas de pago',
      icon: 'i-lucide-receipt',
      slot: 'depositos' as const,
    })
  }
  return items
})

const stepValues = computed(() =>
  stepperItems.value.map((i) => String(i.value) as StepValue),
)

const stepIndex = computed(() => {
  const idx = stepValues.value.indexOf(activeStep.value)
  return idx >= 0 ? idx : 0
})

const tieneAnterior = computed(() => stepIndex.value > 0)
const tieneSiguiente = computed(() => stepIndex.value < stepValues.value.length - 1)
const esUltimoPaso = computed(() => !tieneSiguiente.value)

const onProcesoSeleccionado = (item: CodificadorDto | null) => {
  if (!item) {
    if (!form.value.proc_id) {
      requiereCooperativa.value = false
      requiereEntidad.value = false
      requierePago.value = false
      requiereCorelativo.value = false
      requiereDestinatario.value = true
      entidadId.value = undefined
      remitenteEntidad.value = ''
      citeOrigenEntidad.value = ''
      form.value.depositos = [emptyDeposito()]
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
    remitenteEntidad.value = ''
    citeOrigenEntidad.value = ''
  }
  requiereEntidad.value = nextEntidad

  const nextPago = Boolean(item.requiere_pago)
  if (requierePago.value && !nextPago) {
    form.value.depositos = [emptyDeposito()]
  }
  if (!requierePago.value && nextPago && form.value.depositos.length === 0) {
    form.value.depositos = [emptyDeposito()]
  }
  requierePago.value = nextPago

  requiereCorelativo.value = Boolean(item.requiere_corelativo)
  if (requiereCorelativo.value) {
    asignarCiteHr.value = true
  }

  requiereDestinatario.value = item.requiere_destinatario !== false
  if (!requiereDestinatario.value) {
    form.value.destinatario_id = ''
  }

  const refProceso = item.referencia?.trim()
  if (refProceso) {
    form.value.referencia = refProceso.length > 1000 ? refProceso.slice(0, 1000) : refProceso
  }

  nextTick(() => {
    const values = stepperItems.value.map((i) => String(i.value) as StepValue)
    if (!values.includes(activeStep.value)) {
      activeStep.value = 'generales'
    }
  })
}

const mapCooperativaExistente = (val: Correspondencia): CorrespCooperativaFormState => {
  const existente = val.corresp_cooperativa?.[0]
  if (!existente) return emptyCooperativa()

  return {
    cooperativa_id: existente.cooperativa_id ?? undefined,
    nombre_cooperativa:
      existente.nombre_cooperativa?.trim() ||
      existente.cooperativa?.denominacion?.trim() ||
      existente.cooperativa?.razon_social?.trim() ||
      '',
    solicitante: existente.solicitante || '',
    nro_carnet: existente.nro_carnet || '',
    cargo_solicitante: existente.cargo_solicitante || '',
    correo_solicitante: existente.correo_solicitante || '',
    nro_poder: existente.nro_poder || '',
    telefono: existente.telefono || '',
    cite_origen: existente.cite_origen || '',
  }
}

const mapDepositosExistentes = (val: Correspondencia): CorrespDepositoFormItem[] => {
  const lista = val.depositos || []
  if (!lista.length) return [emptyDeposito()]
  return lista.map((d) => ({
    _key: d.id || crypto.randomUUID(),
    id: d.id,
    numero: d.numero || '',
    importe: Number(d.importe) || (undefined as unknown as number),
    fecha_deposito: d.fecha_deposito
      ? String(d.fecha_deposito).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    observacion: d.observacion || '',
  }))
}

const buildCooperativaPayload = (): CorrespCooperativaPayload | undefined => {
  if (!requiereCooperativa.value) return undefined
  const coop = form.value.cooperativa
  return {
    cooperativa_id: coop.cooperativa_id != null ? Number(coop.cooperativa_id) : undefined,
    nombre_cooperativa: coop.nombre_cooperativa?.trim() || undefined,
    solicitante: coop.solicitante.trim(),
    nro_carnet: coop.nro_carnet.trim(),
    cargo_solicitante: coop.cargo_solicitante?.trim() || undefined,
    correo_solicitante: coop.correo_solicitante?.trim() || undefined,
    nro_poder: coop.nro_poder?.trim() || undefined,
    telefono: coop.telefono?.trim() || undefined,
    cite_origen: coop.cite_origen?.trim() || undefined,
  }
}

const buildEntidadesPayload = (): CorrespEntidadPayload | undefined => {
  if (!requiereEntidad.value || !entidadId.value) return undefined
  const nombre = remitenteEntidad.value.trim()
  const cite = citeOrigenEntidad.value.trim()
  return {
    entidades_ids: [Number(entidadId.value)],
    remitente_entidad: nombre || undefined,
    cite_origen: cite || undefined,
  }
}

const buildDepositosPayload = (): RecDepositosPayload | undefined => {
  if (!requierePago.value) return undefined
  return {
    items: form.value.depositos.map((d) => ({
      id: d.id,
      numero: d.numero.trim(),
      importe: Number(d.importe),
      fecha_deposito: d.fecha_deposito.includes('T')
        ? d.fecha_deposito
        : new Date(`${d.fecha_deposito}T12:00:00`).toISOString(),
      observacion: d.observacion?.trim() || undefined,
    })),
  }
}

const isEditing = computed(() => !!props.correspondencia?.id)
const esModoRespuesta = computed(
  () => !isEditing.value && Boolean(props.correspondenciaOrigenRespuesta?.id),
)

const pendienteNumeracion = computed(() => {
  const c = props.correspondencia
  if (!c?.id) return false
  return correspondenciaSinNumerar(c) && !correspondenciaTieneCite(c)
})

const procesoCorrelativoBloqueado = computed(() => {
  const c = props.correspondencia
  return Boolean(c?.id && c.nro > 0)
})

const mostrarCheckboxAsignarCiteHr = computed(
  () =>
    !requiereCorelativo.value &&
    !esModoRespuesta.value &&
    (!isEditing.value || pendienteNumeracion.value),
)

const mostrarBloqueHojaRuta = computed(
  () =>
    !esModoRespuesta.value &&
    (requiereCorelativo.value || asignarCiteHr.value) &&
    (!isEditing.value || pendienteNumeracion.value),
)

const areaActivaId = computed(() => {
  if (import.meta.client) {
    const fromLocal = localStorage.getItem('area_activa_id')
    if (fromLocal) return fromLocal

    const userProfileRaw = localStorage.getItem('user_profile_data')
    if (userProfileRaw) {
      try {
        const parsed = JSON.parse(userProfileRaw)
        if (parsed?.area_activa_id) return parsed.area_activa_id
      } catch {
        // ignore
      }
    }

    const fromSession = sessionStorage.getItem('area_activa_id')
    if (fromSession) return fromSession
  }
  return profile.value?.area_activa_id || areaActiva.value?.id || null
})

const procesoParams = computed(() =>
  areaActivaId.value ? { area_id: areaActivaId.value } : {},
)

const remitenteParams = computed(() =>
  areaActivaId.value ? { area_id: areaActivaId.value } : {},
)

const resetFormularioNueva = () => {
  codigoUnico.value = crypto.randomUUID()
  form.value = {
    referencia: '',
    proc_id: undefined as unknown as number,
    prioridad_id: undefined as unknown as number,
    confidencial: false,
    remitente_id: defaultRemitenteId(),
    destinatario_id: '',
    cooperativa: emptyCooperativa(),
    depositos: [emptyDeposito()],
  }
  requiereCooperativa.value = false
  requiereEntidad.value = false
  requierePago.value = false
  requiereCorelativo.value = false
  requiereDestinatario.value = true
  entidadId.value = undefined
  remitenteEntidad.value = ''
  citeOrigenEntidad.value = ''
  tipoHr.value = 'nueva'
  nroHrInput.value = undefined
  hrEncontrada.value = null
  errorHr.value = null
  asignarCiteHr.value = true
  activeStep.value = 'generales'
}

const cargarFormularioEdicion = (val: Correspondencia) => {
  codigoUnico.value = val.codigo_unico || crypto.randomUUID()
  form.value = {
    referencia: val.referencia || '',
    proc_id: val.proc_id,
    prioridad_id: val.prioridad_id,
    confidencial: Boolean(val.confidencial),
    remitente_id: val.remitente_id || val.cargos?.id || defaultRemitenteId(),
    destinatario_id: val.destinatario_id || val.cargo_destinatario?.id || '',
    cooperativa: mapCooperativaExistente(val),
    depositos: mapDepositosExistentes(val),
  }
  requiereCooperativa.value = Boolean(
    val.proceso?.requiere_cooperativa || val.corresp_cooperativa?.length,
  )
  requiereEntidad.value = Boolean(
    val.proceso?.requiere_entidad || val.corresp_entidad?.length,
  )
  requierePago.value = Boolean(val.proceso?.requiere_pago || val.depositos?.length)
  requiereCorelativo.value = Boolean(val.proceso?.requiere_corelativo)
  requiereDestinatario.value = val.proceso?.requiere_destinatario !== false
  entidadId.value = val.corresp_entidad?.[0]?.entidad_id
  remitenteEntidad.value = val.corresp_entidad?.[0]?.remitente_entidad?.trim() || ''
  citeOrigenEntidad.value =
    val.corresp_entidad?.[0]?.cite_origen?.trim() || val.cite_origen?.trim() || ''
  tipoHr.value = val.hoja_ruta ? 'existente' : 'nueva'
  nroHrInput.value = val.hoja_ruta?.numero
  hrEncontrada.value = (val.hoja_ruta as Record<string, unknown>) || null
  errorHr.value = null
  asignarCiteHr.value =
    requiereCorelativo.value ||
    (correspondenciaSinNumerar(val) && !correspondenciaTieneCite(val))
  activeStep.value = 'generales'
}

const prefillDesdeOrigenRespuesta = (origen: Correspondencia) => {
  const hr = origen.hoja_ruta
  if (!hr?.numero) return

  tipoHr.value = 'existente'
  nroHrInput.value = hr.numero
  hrEncontrada.value = hr as unknown as Record<string, unknown>
  errorHr.value = null
  asignarCiteHr.value = true

  const refOrigen = origen.referencia?.trim() || 'documento recibido'
  const sugerida = `Respuesta a: ${refOrigen}`
  form.value.referencia = sugerida.length > 1000 ? sugerida.slice(0, 1000) : sugerida
}

const sincronizarFormularioConProps = () => {
  const val = props.correspondencia
  if (val?.id) {
    cargarFormularioEdicion(val)
    return
  }

  resetFormularioNueva()
  const origen = props.correspondenciaOrigenRespuesta
  if (origen?.id) {
    prefillDesdeOrigenRespuesta(origen)
  }
}

watch(
  () => [props.correspondencia, props.correspondenciaOrigenRespuesta] as const,
  sincronizarFormularioConProps,
  { immediate: true },
)

watch(open, (isOpen) => {
  if (isOpen) sincronizarFormularioConProps()
})

const buscarHojaRutaExistente = async () => {
  if (!nroHrInput.value) {
    errorHr.value = 'Ingrese un número de Hoja de Ruta'
    hrEncontrada.value = null
    return
  }

  verificandoHr.value = true
  errorHr.value = null
  try {
    const res = await backendService.get<Record<string, unknown>>(
      `/correspondencia/hoja-ruta/buscar?numero=${nroHrInput.value}`,
    )
    const data = (res as { data?: Record<string, unknown> })?.data || res
    if (data) {
      hrEncontrada.value = data
      toast.add({
        title: 'Hoja de Ruta encontrada',
        description: `HR Nº ${(data as any).numero}/${(data as any).anio} - ${(data as any).referencia || 'Sin referencia'}`,
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }
  } catch (err: unknown) {
    hrEncontrada.value = null
    const e = err as { data?: { message?: string }; message?: string }
    errorHr.value = e?.data?.message || e?.message || 'No se encontró la Hoja de Ruta indicada'
  } finally {
    verificandoHr.value = false
  }
}

const toastValidacion = (description: string) => {
  toast.add({
    title: 'Validación',
    description,
    color: 'warning',
    icon: 'i-lucide-alert-triangle',
  })
}

const validarPaso = (paso: StepValue): boolean => {
  const data = form.value

  if (paso === 'generales') {
    if (!data.proc_id) {
      toastValidacion('Debe seleccionar un proceso.')
      return false
    }
    if (!data.prioridad_id) {
      toastValidacion('Debe seleccionar la prioridad.')
      return false
    }
    if (!data.referencia?.trim() || data.referencia.trim().length < 3) {
      toastValidacion('La referencia debe tener al menos 3 caracteres.')
      return false
    }
    if (!data.remitente_id?.trim()) {
      toastValidacion('Debe seleccionar el cargo remitente.')
      return false
    }
    if (requiereDestinatario.value && !data.destinatario_id?.trim()) {
      toastValidacion('Debe seleccionar el cargo destinatario.')
      return false
    }
    if (
      (!isEditing.value && asignarCiteHr.value && tipoHr.value === 'existente') ||
      (pendienteNumeracion.value && tipoHr.value === 'existente')
    ) {
      if (!nroHrInput.value) {
        toastValidacion('Debe indicar el número de Hoja de Ruta existente.')
        return false
      }
    }
    return true
  }

  if (paso === 'cooperativa') {
    const parsed = cooperativaSchema.safeParse(data.cooperativa)
    if (!parsed.success) {
      toastValidacion(parsed.error.issues[0]?.message || 'Complete los datos de cooperativa.')
      return false
    }
    return true
  }

  if (paso === 'entidad') {
    if (!entidadId.value) {
      toastValidacion('Debe seleccionar una entidad externa.')
      return false
    }
    if (!remitenteEntidad.value.trim()) {
      toastValidacion('Indique el nombre del remitente de la entidad seleccionada.')
      return false
    }
    return true
  }

  if (paso === 'depositos') {
    const parsed = z.array(depositoItemSchema).min(1).safeParse(
      data.depositos.map(({ _key, ...rest }) => rest),
    )
    if (!parsed.success) {
      toastValidacion(parsed.error.issues[0]?.message || 'Complete las boletas de depósito.')
      return false
    }
    return true
  }

  return true
}

const irSiguiente = () => {
  if (!validarPaso(activeStep.value)) return
  const next = stepValues.value[stepIndex.value + 1]
  if (next) activeStep.value = next
}

const irAnterior = () => {
  const prev = stepValues.value[stepIndex.value - 1]
  if (prev) activeStep.value = prev
}

const handleSave = async (event?: FormSubmitEvent<CorrespondenciaSchemaType>) => {
  const data = event?.data || form.value

  for (const paso of stepValues.value) {
    if (!validarPaso(paso)) {
      activeStep.value = paso
      return
    }
  }

  const cargoOrigenResolved = resolveCargoOrigenId()
  if (!cargoOrigenResolved) {
    toast.add({
      title: 'Error de configuración',
      description:
        'No se detectó el cargo de origen en su sesión. Vaya a Configuración y seleccione su cargo activo.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  const areaOrigenId =
    areaActivaId.value ||
    profile.value?.area_activa_id ||
    (import.meta.client ? sessionStorage.getItem('area_activa_id') : null)

  if (!areaOrigenId) {
    toast.add({
      title: 'Error de configuración',
      description:
        'No se detectó un área activa configurada en su perfil. Vaya a Configuración para seleccionarla.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
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
        destinatario_id: requiereDestinatario.value
          ? data.destinatario_id.trim()
          : undefined,
        cooperativa: buildCooperativaPayload(),
        entidades: buildEntidadesPayload(),
        depositos: buildDepositosPayload(),
      }
      await backendService.patch<Correspondencia>(
        'correspondencia',
        props.correspondencia.id,
        payload,
      )
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
        cargo_origen_id: cargoOrigenResolved,
        remitente_id: data.remitente_id.trim(),
        asignar_cite_hr: requiereCorelativo.value || asignarCiteHr.value,
        es_nueva_hr:
          (requiereCorelativo.value || asignarCiteHr.value)
            ? tipoHr.value === 'nueva'
            : false,
        nro_hr:
          (requiereCorelativo.value || asignarCiteHr.value) && tipoHr.value === 'existente'
            ? Number(nroHrInput.value)
            : undefined,
        destinatario_id: requiereDestinatario.value
          ? data.destinatario_id.trim()
          : undefined,
        cooperativa: buildCooperativaPayload(),
        entidades: buildEntidadesPayload(),
        depositos: buildDepositosPayload(),
        codigo_unico: codigoUnico.value,
      }

      await backendService.post<Correspondencia>('correspondencia', payload)
      toast.add({
        title: 'Correspondencia creada',
        description: asignarCiteHr.value
          ? tipoHr.value === 'nueva'
            ? 'Correspondencia numerada con CITE y nueva Hoja de Ruta.'
            : 'Correspondencia numerada con CITE y asociada a la HR existente.'
          : 'Borrador registrado sin numeración. Podrá asignar CITE y HR más adelante.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }

    open.value = false
    emit('guardado')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string | string[] }; message?: string }
    const errorMsg =
      (Array.isArray(err?.data?.message)
        ? err.data.message.join(', ')
        : err?.data?.message) ||
      err?.message ||
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
    toastValidacion('Debe indicar el número de Hoja de Ruta existente.')
    return
  }

  assigningNumeracion.value = true
  try {
    const res = await backendService.post<Correspondencia>(
      `correspondencia/${id}/asignar-cite-hr`,
      {
        es_nueva_hr: tipoHr.value === 'nueva',
        nro_hr: tipoHr.value === 'existente' ? Number(nroHrInput.value) : undefined,
      },
    )
    const data = (res as { data?: Correspondencia })?.data ?? (res as Correspondencia)
    const cite = citeOrigenCorrespondencia(data)
    toast.add({
      title: 'CITE y numeración asignados',
      description: cite
        ? `Correlativo ${data.nro}/${data.gestion} · ${cite}`
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
      description: Array.isArray(msg)
        ? msg.join(', ')
        : msg || err?.message || 'Error al numerar la correspondencia.',
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
    :title="isEditing ? 'Editar Correspondencia' : (esModoRespuesta ? 'Asociar / responder Proceso' : 'Nuevo Proceso')"
    :description="isEditing
      ? 'Complete los pasos del formulario según el proceso seleccionado.'
      : (esModoRespuesta
        ? 'Registre la respuesta institucional vinculada a la misma Hoja de Ruta del documento recibido.'
        : 'Avance por los pasos según los requisitos del proceso (cooperativa, entidad o depósitos).')"
    :ui="{
      content: 'sm:max-w-3xl',
    }"
  >
    <template #body>
      <UForm
        id="corresp-form"
        :schema="correspondenciaSchema"
        :state="form"
        class="space-y-5"
        @submit="handleSave"
      >
        <UStepper
          v-model="activeStep"
          :items="stepperItems"
          color="primary"
          size="sm"
          class="w-full"
          :linear="true"
          :disabled="saving || assigningNumeracion"
        >
          <template #generales>
            <div class="mt-5">
              <CorrespDatosGeneralesFields
                v-model:remitente-id="form.remitente_id"
                v-model:proc-id="form.proc_id"
                v-model:prioridad-id="form.prioridad_id"
                v-model:destinatario-id="form.destinatario_id"
                v-model:referencia="form.referencia"
                v-model:confidencial="form.confidencial"
                v-model:asignar-cite-hr="asignarCiteHr"
                v-model:tipo-hr="tipoHr"
                v-model:nro-hr-input="nroHrInput"
                v-model:hr-encontrada="hrEncontrada"
                v-model:error-hr="errorHr"
                :remitente-params="remitenteParams"
                :proceso-params="procesoParams"
                :proceso-correlativo-bloqueado="procesoCorrelativoBloqueado"
                :es-modo-respuesta="esModoRespuesta"
                :mostrar-checkbox-asignar-cite-hr="mostrarCheckboxAsignarCiteHr"
                :mostrar-bloque-hoja-ruta="mostrarBloqueHojaRuta"
                :pendiente-numeracion="pendienteNumeracion"
                :requiere-destinatario="requiereDestinatario"
                :cargo-origen-nombre="cargoOrigen?.nombre || cargoActivo?.nombre || ''"
                :area-activa-nombre="areaActiva?.nombre || profile?.area_activa_nombre || ''"
                :verificando-hr="verificandoHr"
                @proceso-seleccionado="onProcesoSeleccionado"
                @verificar-hr="buscarHojaRutaExistente"
              />
            </div>
          </template>

          <template #cooperativa>
            <div class="mt-5">
              <CorrespCooperativaFields v-model="form.cooperativa" />
            </div>
          </template>

          <template #entidad>
            <div class="mt-5">
              <CorrespEntidadFields
                v-model:entidad-id="entidadId"
                v-model:remitente-entidad="remitenteEntidad"
                v-model:cite-origen="citeOrigenEntidad"
              />
            </div>
          </template>

          <template #depositos>
            <div class="mt-5">
              <CorrespDepositosFields v-model="form.depositos" />
            </div>
          </template>
        </UStepper>
      </UForm>
    </template>

    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-3 w-full">
        <div class="flex items-center gap-2">
          <UButton
            label="Anterior"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :disabled="!tieneAnterior || saving || assigningNumeracion"
            @click="irAnterior"
          />
          <UButton
            v-if="tieneSiguiente"
            label="Siguiente"
            trailing-icon="i-lucide-arrow-right"
            color="neutral"
            variant="soft"
            :disabled="saving || assigningNumeracion"
            @click="irSiguiente"
          />
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="outline"
            :disabled="saving || assigningNumeracion"
            @click="open = false"
          />
          <UButton
            v-if="pendienteNumeracion && asignarCiteHr"
            label="Asignar CITE y numerar"
            icon="i-lucide-stamp"
            color="primary"
            variant="soft"
            :loading="assigningNumeracion"
            :disabled="saving"
            @click="handleAsignarCiteHr"
          />
          <UButton
            v-if="esUltimoPaso"
            type="submit"
            form="corresp-form"
            :label="isEditing ? 'Guardar cambios' : 'Registrar correspondencia'"
            icon="i-lucide-save"
            color="primary"
            :loading="saving"
            :disabled="assigningNumeracion"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
