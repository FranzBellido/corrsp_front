<script setup lang="ts">
import type { CodificadorDto } from '~/types/codificador'
import { TipoCodificadorEnum } from '~/types/correspondencia'
import CodificadorSelect from '~/components/codificador/CodificadorSelect.vue'
import CorrespondenciaHojaRutaFields from '~/components/correspondencia/CorrespondenciaHojaRutaFields.vue'

defineProps<{
  remitenteParams: Record<string, string>
  procesoParams: Record<string, string>
  procesoCorrelativoBloqueado: boolean
  esModoRespuesta: boolean
  mostrarCheckboxAsignarCiteHr: boolean
  mostrarBloqueHojaRuta: boolean
  pendienteNumeracion: boolean
  requiereDestinatario: boolean
  cargoOrigenNombre: string
  areaActivaNombre: string
  verificandoHr?: boolean
}>()

const emit = defineEmits<{
  (e: 'proceso-seleccionado', item: CodificadorDto | null): void
  (e: 'verificar-hr'): void
}>()

const remitenteId = defineModel<string>('remitenteId', { required: true })
const procId = defineModel<number | undefined>('procId', { required: true })
const prioridadId = defineModel<number | undefined>('prioridadId', { required: true })
const destinatarioId = defineModel<string>('destinatarioId', { required: true })
const referencia = defineModel<string>('referencia', { required: true })
const confidencial = defineModel<boolean>('confidencial', { required: true })
const asignarCiteHr = defineModel<boolean>('asignarCiteHr', { required: true })
const tipoHr = defineModel<'nueva' | 'existente'>('tipoHr', { required: true })
const nroHrInput = defineModel<number | undefined>('nroHrInput')
const hrEncontrada = defineModel<Record<string, unknown> | null>('hrEncontrada', { default: null })
const errorHr = defineModel<string | null>('errorHr', { default: null })
</script>

<template>
  <div class="space-y-4">
    <div class="p-3 rounded-md bg-elevated border border-default flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-clipboard-pen" class="size-4 text-primary shrink-0" />
        <div>
          <span class="font-semibold text-highlighted">Cargo de origen (registro): </span>
          <span class="text-muted">{{ cargoOrigenNombre || 'Configure su cargo en Configuración' }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-building" class="size-4 text-primary shrink-0" />
        <div>
          <span class="font-semibold text-highlighted">Área: </span>
          <span class="text-muted">{{ areaActivaNombre || 'Área activa' }}</span>
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
        v-model="remitenteId"
        endpoint="comun/codificador/cargos"
        :params="remitenteParams"
        placeholder="Seleccione el cargo remitente..."
        class="w-full"
      />
    </UFormField>

    <div
      v-if="esModoRespuesta && hrEncontrada"
      class="p-3 rounded-md border border-primary/30 bg-primary/5 text-xs space-y-1"
    >
      <p class="font-semibold text-highlighted flex items-center gap-1.5">
        <UIcon name="i-lucide-link" class="size-4 text-primary" />
        Hoja de Ruta del trámite entrante
      </p>
      <p class="text-muted">
        HR {{ (hrEncontrada as any).numero }}/{{ (hrEncontrada as any).anio }}
        <span v-if="(hrEncontrada as any).referencia"> — {{ (hrEncontrada as any).referencia }}</span>
      </p>
    </div>

    <div
      v-if="mostrarCheckboxAsignarCiteHr"
      class="p-3 rounded-md border border-default bg-elevated/30"
    >
      <UCheckbox
        v-model="asignarCiteHr"
        label="Asignar CITE y Hoja de Ruta"
        :description="pendienteNumeracion
          ? 'Marque para configurar HR y numerar con el botón «Asignar CITE y numerar», o desmarque para seguir editando solo como borrador.'
          : 'Si está desmarcado, se guarda un borrador sin número ni HR. Podrá numerar y asignar CITE después.'"
      />
    </div>

    <div
      v-if="pendienteNumeracion && asignarCiteHr"
      class="p-3 rounded-md border border-warning/40 bg-warning/10 text-xs text-default space-y-1"
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
      v-if="mostrarBloqueHojaRuta"
      v-model:tipo-hr="tipoHr"
      v-model:nro-hr-input="nroHrInput"
      v-model:hr-encontrada="hrEncontrada"
      v-model:error-hr="errorHr"
      :verificando-hr="verificandoHr"
      :fijar-hr-existente="esModoRespuesta"
      @verificar="emit('verificar-hr')"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField
        label="Tipo de proceso"
        name="proc_id"
        required
        :help="procesoCorrelativoBloqueado
          ? 'No se puede cambiar: ya tiene número correlativo asignado para este proceso.'
          : 'Filtrado según los procesos autorizados para el área activa. Define pasos adicionales del formulario.'"
      >
        <CodificadorSelect
          v-model="procId"
          endpoint="comun/codificador/procesos"
          :params="procesoParams"
          placeholder="Seleccione proceso..."
          class="w-full"
          :disabled="procesoCorrelativoBloqueado"
          @item-selected="emit('proceso-seleccionado', $event)"
        />
      </UFormField>

      <UFormField
        label="Prioridad"
        name="prioridad_id"
        required
        help="Nivel de urgencia de la correspondencia."
      >
        <CodificadorSelect
          v-model="prioridadId"
          endpoint="comun/codificador"
          :params="{ tipo_id: TipoCodificadorEnum.PRIORIDAD }"
          placeholder="Seleccione prioridad..."
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField
      label="Referencia"
      name="referencia"
      required
      help="Descripción concisa y tema principal de la correspondencia."
    >
      <UTextarea
        v-model="referencia"
        placeholder="Ej. SOLICITUD DE INFORME TÉCNICO SOBRE ADECUACIÓN ESTATUTARIA..."
        class="w-full"
        :rows="3"
        autofocus
      />
    </UFormField>

    <UFormField
      v-if="requiereDestinatario"
      label="Cargo destinatario"
      name="destinatario_id"
      required
      help="Cargo institucional al que va dirigida la correspondencia."
    >
      <CodificadorSelect
        v-model="destinatarioId"
        endpoint="comun/codificador/cargos"
        placeholder="Seleccione el cargo destinatario..."
        class="w-full"
      />
    </UFormField>

    <UCheckbox
      v-model="confidencial"
      label="Documento confidencial"
      description="Restringe la visualización a remitente y destinatarios autorizados."
    />
  </div>
</template>
