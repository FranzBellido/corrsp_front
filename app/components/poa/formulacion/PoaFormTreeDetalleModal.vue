<script setup lang="ts">
import { computed } from 'vue'
import type { AcpResultado, FormRowTipo } from '~/types/poa/acp-resultado'
import type { PoaOperacion } from '~/types/poa/poa-operacion'
import type { PoaActividad } from '~/types/poa/poa-actividad'

export interface PoaFormTreeDetallePayload {
  tipo: FormRowTipo
  resultado?: AcpResultado | null
  operacion?: PoaOperacion | null
  actividad?: PoaActividad | null
  parentResultado?: AcpResultado | null
  parentOperacion?: PoaOperacion | null
}

const props = defineProps<{
  detalle?: PoaFormTreeDetallePayload | null
}>()

const open = defineModel<boolean>('open', { default: false })

const tituloModal = computed(() => {
  const t = props.detalle?.tipo
  if (t === 'resultado') return 'Detalle del resultado'
  if (t === 'operacion') return 'Detalle de la operación'
  if (t === 'actividad') return 'Detalle de la actividad'
  return 'Detalle'
})

const subtitulo = computed(() => {
  const d = props.detalle
  if (!d) return ''
  if (d.tipo === 'resultado') return d.resultado?.nombre ?? ''
  if (d.tipo === 'operacion') return d.operacion?.descripcion ?? ''
  return d.actividad?.descripcion ?? ''
})

type DetalleCampo = { label: string; value: string }

const campos = computed<DetalleCampo[]>(() => {
  const d = props.detalle
  if (!d) return []

  if (d.tipo === 'resultado' && d.resultado) {
    const r = d.resultado
    const acp = r.acp
    return [
      { label: 'Número', value: String(r.numero) },
      {
        label: 'ACP',
        value: acp ? `Nº ${acp.numero} — ${acp.descripcion}` : '—',
      },
      { label: 'Nombre', value: r.nombre || '—' },
      { label: 'Indicador', value: r.indicador?.trim() || '—' },
      { label: 'Ponderación', value: `${r.ponderacion}%` },
      { label: 'Estado', value: r.poa_estado?.nombre || '—' },
      {
        label: 'Operaciones',
        value: String(r._count?.poa_operacion ?? r.poa_operacion?.length ?? 0),
      },
    ]
  }

  if (d.tipo === 'operacion' && d.operacion) {
    const o = d.operacion
    const pr = d.parentResultado
    return [
      { label: 'Número', value: String(o.numero) },
      {
        label: 'Resultado padre',
        value: pr ? `${pr.numero}. ${pr.nombre}` : '—',
      },
      { label: 'Descripción', value: o.descripcion || '—' },
      { label: 'Ponderación', value: `${o.ponderacion}%` },
      { label: 'Meta', value: o.meta || '—' },
      { label: 'Indicador', value: o.indicador || '—' },
      { label: 'Estado', value: o.poa_estado?.nombre || '—' },
      {
        label: 'Actividades',
        value: String(o._count?.poa_actividades ?? o.poa_actividades?.length ?? 0),
      },
    ]
  }

  if (d.tipo === 'actividad' && d.actividad) {
    const a = d.actividad
    const po = d.parentOperacion
    return [
      { label: 'Número', value: String(a.numero) },
      {
        label: 'Operación padre',
        value: po ? `${po.numero}. ${po.descripcion}` : '—',
      },
      { label: 'Descripción', value: a.descripcion?.trim() || '—' },
      { label: 'Ponderación', value: `${a.ponderacion}%` },
      { label: 'Tareas', value: a.tareas?.trim() || '—' },
      { label: 'Medios', value: a.medios?.trim() || '—' },
      {
        label: 'Meta',
        value: a.meta != null ? String(a.meta) : '—',
      },
      {
        label: 'Línea base',
        value: a.linea_base != null ? String(a.linea_base) : '—',
      },
      {
        label: 'Seguimientos',
        value: String(a._count?.seguimiento_actividades ?? 0),
      },
    ]
  }

  return []
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="tituloModal"
    :description="subtitulo ? subtitulo.slice(0, 120) + (subtitulo.length > 120 ? '…' : '') : 'Información de solo lectura'"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <dl v-if="campos.length" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div
          v-for="(campo, idx) in campos"
          :key="idx"
          :class="[
            campo.label === 'Descripción' || campo.label === 'Tareas' || campo.label === 'Indicador'
              ? 'sm:col-span-2'
              : '',
          ]"
        >
          <dt class="text-xs text-muted font-medium mb-0.5">{{ campo.label }}</dt>
          <dd class="text-default whitespace-pre-wrap break-words">{{ campo.value }}</dd>
        </div>
      </dl>
      <p v-else class="text-sm text-muted">No hay datos para mostrar.</p>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton label="Cerrar" color="neutral" variant="ghost" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
