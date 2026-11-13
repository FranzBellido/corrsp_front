<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { PoaConfiguracion, PoaConfiguracionFormState } from '~/types/poa/configuracion'
import type { PoaVersionLookup } from '~/types/poa/poa-version'
import { backendService } from '~/services/backend.service'

const toast = useToast()

const loading = ref(false)
const savingId = ref<number | null>(null)
const registros = ref<PoaConfiguracion[]>([])
const versiones = ref<PoaVersionLookup[]>([])
const loadingVersiones = ref(false)

const forms = ref<Record<number, PoaConfiguracionFormState>>({})

const schema = z.object({
  nombre_formulacion: z.string().trim().min(1).max(200),
  nombre_seguimiento: z.string().trim().min(1).max(200),
  formulacio_version_id: z.number().int().min(2000).max(2100),
  seguimiento_version_id: z.number().int().min(2000).max(2100),
  certificacion_version_id: z.number().int().min(2000).max(2100),
  acp_version_id: z.number().int().min(2000).max(2100),
})

type SchemaType = z.infer<typeof schema>

const versionOptions = computed(() =>
  versiones.value.map((v) => ({
    label: `${v.gestion} — ${v.nombre}`,
    value: v.gestion,
  })),
)

const campos: Array<{
  key: keyof PoaConfiguracionFormState
  label: string
  description: string
  icon: string
}> = [
  {
    key: 'formulacio_version_id',
    label: 'Formulación POA',
    description: 'Gestión por defecto para procesos de formulación.',
    icon: 'i-lucide-clipboard-list',
  },
  {
    key: 'seguimiento_version_id',
    label: 'Seguimiento POA',
    description: 'Gestión por defecto para seguimiento trimestral.',
    icon: 'i-lucide-line-chart',
  },
  {
    key: 'certificacion_version_id',
    label: 'Certificación',
    description: 'Gestión por defecto para certificación POA.',
    icon: 'i-lucide-badge-check',
  },
  {
    key: 'acp_version_id',
    label: 'ACP',
    description: 'Gestión por defecto para Acciones de Corto Plazo.',
    icon: 'i-lucide-list-checks',
  },
]

const syncFormsFromRegistros = (items: PoaConfiguracion[]) => {
  const next: Record<number, PoaConfiguracionFormState> = {}
  for (const item of items) {
    next[item.id] = {
      nombre_formulacion: item.nombre_formulacion || '',
      nombre_seguimiento: item.nombre_seguimiento || '',
      formulacio_version_id: item.formulacio_version_id,
      seguimiento_version_id: item.seguimiento_version_id,
      certificacion_version_id: item.certificacion_version_id,
      acp_version_id: item.acp_version_id,
    }
  }
  forms.value = next
}

const cargarVersiones = async () => {
  loadingVersiones.value = true
  try {
    const res = await backendService.get<PoaVersionLookup[]>('poa-versiones')
    versiones.value =
      ((res as { data?: PoaVersionLookup[] })?.data || res || []) as PoaVersionLookup[]
  } catch {
    versiones.value = []
  } finally {
    loadingVersiones.value = false
  }
}

const cargar = async () => {
  loading.value = true
  try {
    const res = await backendService.get<PoaConfiguracion[]>('poa-configuracion')
    const data = ((res as { data?: PoaConfiguracion[] })?.data || res || []) as PoaConfiguracion[]
    registros.value = Array.isArray(data) ? data : []
    syncFormsFromRegistros(registros.value)
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.add({
      title: 'Error al cargar',
      description: err?.message || 'No se pudo obtener la configuración POA.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    registros.value = []
    forms.value = {}
  } finally {
    loading.value = false
  }
}

const guardar = async (id: number, event?: FormSubmitEvent<SchemaType>) => {
  const state = forms.value[id]
  if (!state) return

  const data = event?.data || state
  savingId.value = id
  try {
    await backendService.patch<PoaConfiguracion>('poa-configuracion', id, {
      nombre_formulacion: data.nombre_formulacion.trim(),
      nombre_seguimiento: data.nombre_seguimiento.trim(),
      formulacio_version_id: Number(data.formulacio_version_id),
      seguimiento_version_id: Number(data.seguimiento_version_id),
      certificacion_version_id: Number(data.certificacion_version_id),
      acp_version_id: Number(data.acp_version_id),
    })
    toast.add({
      title: 'Configuración guardada',
      description: 'Las versiones por defecto fueron actualizadas.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    await cargar()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string | string[] }; message?: string }
    toast.add({
      title: 'Error al guardar',
      description:
        (Array.isArray(err?.data?.message)
          ? err.data.message.join(', ')
          : err?.data?.message) ||
        err?.message ||
        'No se pudo guardar la configuración',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    savingId.value = null
  }
}

onMounted(async () => {
  await Promise.all([cargarVersiones(), cargar()])
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Configuración POA"
      description="Nombres base de procesos y gestiones (versiones) por defecto para formulación, seguimiento, certificación y ACP"
    />

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-48 w-full rounded-md" />
    </div>

    <UAlert
      v-else-if="registros.length === 0"
      color="warning"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      title="Sin registros de configuración"
      description="No hay filas en poa.configuracion. Registre versiones POA y cree el registro en base de datos si corresponde."
    />

    <UAlert
      v-else-if="versionOptions.length === 0"
      color="warning"
      variant="subtle"
      icon="i-lucide-calendar-off"
      title="Sin versiones POA"
      description="Cree al menos una gestión en Versiones POA antes de asignar valores por defecto."
    />

    <p
      v-else
      class="text-xs text-muted"
    >
      Los cambios afectan qué gestión utiliza cada módulo al abrir pantallas o procesos asociados.
    </p>

    <template v-for="registro in registros" :key="registro.id">
      <UCard
        v-if="forms[registro.id]"
        class="border border-default"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-sliders-horizontal" class="size-5 text-primary" />
            <span class="font-semibold text-highlighted">
              Parámetros globales
              <span class="text-muted font-normal text-sm">(id {{ registro.id }})</span>
            </span>
          </div>
        </template>

        <UForm
          :id="`poa-config-form-${registro.id}`"
          :schema="schema"
          :state="forms[registro.id]"
          class="space-y-6"
          @submit="(e) => guardar(registro.id, e)"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <UFormField
              label="Nombre base — Formulación"
              name="nombre_formulacion"
              required
              help="Se usa al crear poa_formulacion: nombre + gestión de formulación."
            >
              <UInput
                v-model="forms[registro.id]!.nombre_formulacion"
                icon="i-lucide-file-text"
                placeholder="Ej. Formulación POA"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Nombre base — Seguimiento"
              name="nombre_seguimiento"
              required
              help="Etiqueta base para procesos de seguimiento (gestión aparte)."
            >
              <UInput
                v-model="forms[registro.id]!.nombre_seguimiento"
                icon="i-lucide-line-chart"
                placeholder="Ej. Seguimiento POA"
                class="w-full"
              />
            </UFormField>
          </div>

          <div
            v-if="forms[registro.id]?.nombre_formulacion && forms[registro.id]?.formulacio_version_id"
            class="text-xs text-muted rounded-md border border-default px-3 py-2 bg-elevated/40"
          >
            Vista previa formulación nueva:
            <span class="font-medium text-highlighted">
              {{ forms[registro.id]!.nombre_formulacion.trim() }}
              {{ forms[registro.id]!.formulacio_version_id }}
            </span>
            <span class="text-dimmed"> (máx. 100 caracteres en BD)</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <UFormField
              v-for="campo in campos"
              :key="campo.key"
              :label="campo.label"
              :name="campo.key"
              :help="campo.description"
              required
            >
              <USelect
                v-model="forms[registro.id]![campo.key]"
                :items="versionOptions"
                :loading="loadingVersiones"
                :icon="campo.icon"
                placeholder="Seleccione gestión..."
                class="w-full"
              />
            </UFormField>
          </div>
        </UForm>

        <template #footer>
          <div class="flex justify-end w-full">
            <UButton
              label="Guardar cambios"
              color="primary"
              icon="i-lucide-save"
              :loading="savingId === registro.id"
              type="submit"
              :form="`poa-config-form-${registro.id}`"
            />
          </div>
        </template>
      </UCard>
    </template>
  </div>
</template>
