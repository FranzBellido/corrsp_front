<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Correspondencia } from '~/types/correspondencia'
import { TipoCodificadorEnum } from '~/types/correspondencia'
import type { CreateDerivacionPayload, Derivacion } from '~/types/derivacion'
import type { CodificadorDto } from '~/types/codificador'
import { backendService } from '~/services/backend.service'
import CodificadorSelect from '~/components/codificador/CodificadorSelect.vue'

const props = defineProps<{
  correspondencia?: Correspondencia | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'derivado'): void
}>()

const toast = useToast()
const { cargoActivo, resolveCargoOrigenId } = useProfile()
const saving = ref(false)
const conCopia = ref(false)

const schema = z.object({
  cargo_destino_id: z
    .string({ message: 'Debe seleccionar el cargo destino' })
    .min(1, 'Debe seleccionar el cargo destino')
    .uuid('Cargo destino inválido'),
  tipo_instruccion_id: z.number({ message: 'Debe seleccionar el tipo de instrucción' }),
  instruccion: z
    .string()
    .trim()
    .min(3, 'La instrucción debe tener al menos 3 caracteres')
    .max(500, 'No puede exceder 500 caracteres'),
  copias: z.array(z.string().uuid()).optional(),
})

type FormState = z.infer<typeof schema>

const form = ref<FormState>({
  cargo_destino_id: '',
  tipo_instruccion_id: undefined as unknown as number,
  instruccion: '',
  copias: [],
})

const copiasSeleccionadas = ref<{ id: string; nombre: string }[]>([])

const tituloDoc = computed(() => {
  const c = props.correspondencia
  if (!c) return ''
  return `Nº ${c.nro}/${c.gestion} — ${c.referencia?.slice(0, 80) || 'Sin referencia'}`
})

const resetForm = () => {
  form.value = {
    cargo_destino_id: '',
    tipo_instruccion_id: undefined as unknown as number,
    instruccion: '',
    copias: [],
  }
  copiasSeleccionadas.value = []
  conCopia.value = false
}

watch(open, (isOpen) => {
  if (isOpen) resetForm()
})

watch(conCopia, (activo) => {
  if (!activo) {
    copiasSeleccionadas.value = []
    form.value.copias = []
  }
})

const sincronizarCopiasForm = () => {
  form.value.copias = copiasSeleccionadas.value.map((c) => c.id)
}

const agregarCopiaDesdeItem = (item: CodificadorDto | null) => {
  if (!item?.id) return
  const id = String(item.id)
  if (id === form.value.cargo_destino_id) {
    toast.add({
      title: 'No permitido',
      description: 'El destinatario principal no puede ir también en copia.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    copiaTempId.value = null
    return
  }
  if (copiasSeleccionadas.value.some((c) => c.id === id)) {
    copiaTempId.value = null
    return
  }
  copiasSeleccionadas.value = [
    ...copiasSeleccionadas.value,
    { id, nombre: item.nombre || id },
  ]
  sincronizarCopiasForm()
  copiaTempId.value = null
}

const quitarCopia = (id: string) => {
  copiasSeleccionadas.value = copiasSeleccionadas.value.filter((c) => c.id !== id)
  sincronizarCopiasForm()
}

const copiaTempId = ref<string | null>(null)

const handleSave = async (event?: FormSubmitEvent<FormState>) => {
  const data = event?.data || form.value
  if (!props.correspondencia?.id) return

  if (!data.cargo_destino_id?.trim()) {
    toast.add({
      title: 'Validación',
      description: 'Seleccione el cargo destinatario.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  if (!data.tipo_instruccion_id) {
    toast.add({
      title: 'Validación',
      description: 'Seleccione el tipo de instrucción.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  const cargoOrigen = resolveCargoOrigenId() || cargoActivo.value?.id
  if (!cargoOrigen) {
    toast.add({
      title: 'Sin cargo activo',
      description: 'Configure su cargo de trabajo antes de derivar.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  saving.value = true
  try {
    const payload: CreateDerivacionPayload = {
      documento_id: props.correspondencia.id,
      cargo_destino_id: data.cargo_destino_id.trim(),
      instruccion: data.instruccion.trim(),
      tipo_instruccion_id: Number(data.tipo_instruccion_id),
      copias: conCopia.value ? copiasSeleccionadas.value.map((c) => c.id) : undefined,
      cargo_origen_id: cargoOrigen,
    }

    await backendService.post<Derivacion>('derivaciones', payload)
    toast.add({
      title: 'Derivación enviada',
      description: 'La correspondencia fue derivada correctamente.',
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
    title="Derivar correspondencia"
    description="Envíe el documento a un cargo destinatario con instrucción (previsto)."
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div
        v-if="correspondencia"
        class="mb-4 p-3 rounded-xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 text-xs"
      >
        <p class="font-semibold text-gray-800 dark:text-gray-200 truncate">{{ tituloDoc }}</p>
        <p class="text-muted mt-0.5">
          Origen:
          <span class="font-medium">{{ cargoActivo?.nombre || 'Cargo activo' }}</span>
        </p>
      </div>

      <UForm
        id="derivacion-form"
        :schema="schema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <UFormField
          label="Cargo destinatario"
          name="cargo_destino_id"
          required
          help="Cargo institucional que recibirá la derivación."
        >
          <CodificadorSelect
            v-model="form.cargo_destino_id"
            endpoint="comun/codificador/cargos"
            placeholder="Seleccione cargo destino..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Tipo de instrucción"
          name="tipo_instruccion_id"
          required
          help="Clasificación del previsto / instrucción (codificador tipo 2)."
        >
          <CodificadorSelect
            v-model="form.tipo_instruccion_id"
            endpoint="comun/codificador"
            :params="{ tipo_id: TipoCodificadorEnum.TIPO_INSTRUCCION }"
            placeholder="Seleccione tipo de instrucción..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Instrucción / Proveído"
          name="instruccion"
          required
          help="Indique la acción o instrucción para el destinatario."
        >
          <UTextarea
            v-model="form.instruccion"
            :rows="3"
            placeholder="Ej. Para su conocimiento y atención correspondiente..."
            class="w-full"
          />
        </UFormField>

        <div class="space-y-3">
          <UCheckbox
            v-model="conCopia"
            label="Enviar con copia (CC)"
            description="Notificar a otros cargos institucionales."
          />

          <div v-if="conCopia" class="space-y-2 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
            <UFormField label="Agregar cargo en copia" name="copia_temp">
              <CodificadorSelect
                v-model="copiaTempId"
                endpoint="comun/codificador/cargos"
                placeholder="Seleccione cargo para copia..."
                class="w-full"
                @item-selected="agregarCopiaDesdeItem"
              />
            </UFormField>

            <div v-if="copiasSeleccionadas.length" class="flex flex-wrap gap-1.5 pt-1">
              <UBadge
                v-for="copia in copiasSeleccionadas"
                :key="copia.id"
                color="neutral"
                variant="subtle"
                class="gap-1 pr-1 max-w-full"
              >
                <span class="truncate max-w-[220px]" :title="copia.nombre">{{ copia.nombre }}</span>
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  class="!p-0.5"
                  @click="quitarCopia(copia.id)"
                />
              </UBadge>
            </div>
            <p v-else class="text-[11px] text-muted">Aún no hay cargos en copia.</p>
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
          form="derivacion-form"
          label="Enviar derivación"
          icon="i-lucide-send"
          color="primary"
          :loading="saving"
        />
      </div>
    </template>
  </UModal>
</template>
