<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProfile } from '~/composables/useProfile'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  (e: 'selected', cargoId: string): void
}>()

const { profile, setCargoActivo } = useProfile()
const selectedCargoId = ref<string>('')
const saving = ref(false)
const toast = useToast()

const cargos = computed(() => profile.value?.cargos || [])

watch(
  () => open.value,
  (isOpen) => {
    if (isOpen) {
      selectedCargoId.value = profile.value?.cargo_id || profile.value?.cargo_activo_id || ''
    }
  },
)

const handleSelect = (id: string) => {
  selectedCargoId.value = id
}

const handleConfirmar = async () => {
  if (!selectedCargoId.value) {
    toast.add({
      title: 'Selección requerida',
      description: 'Por favor seleccione el cargo con el que desea operar.',
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
    return
  }

  saving.value = true
  try {
    await setCargoActivo(selectedCargoId.value)
    toast.add({
      title: 'Cargo configurado',
      description: 'Se ha establecido su cargo de trabajo por defecto.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    emit('selected', selectedCargoId.value)
    open.value = false
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'No se pudo guardar el cargo',
      description: err?.data?.message || err?.message || 'Error al actualizar el cargo activo.',
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
    title="Seleccionar Cargo de Trabajo"
    description="Se detectaron múltiples cargos asociados a su usuario. Seleccione con cuál desea operar."
    :ui="{ content: 'sm:max-w-md' }"
    :dismissible="false"
  >
    <template #body>
      <div class="space-y-3">
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          El cargo elegido se guardará en su perfil y se usará en las transacciones de correspondencia.
          Podrá cambiarlo después desde <strong>Configuración</strong>.
        </p>

        <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
          <div
            v-for="cargo in cargos"
            :key="cargo.id"
            class="p-3.5 rounded-md border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none"
            :class="[
              selectedCargoId === cargo.id
                ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/40 text-primary-950 dark:text-primary-100 ring-2 ring-primary-500/20 shadow-xs'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/60'
            ]"
            @click="handleSelect(cargo.id)"
          >
            <div class="mt-0.5 shrink-0">
              <UIcon
                :name="selectedCargoId === cargo.id ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                :class="selectedCargoId === cargo.id ? 'text-primary-500' : 'text-neutral-400'"
                class="size-5"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm text-neutral-900 dark:text-neutral-100 leading-tight">
                {{ cargo.nombre }}
              </div>
              <div v-if="cargo.area" class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                <UIcon name="i-lucide-building-2" class="size-3.5 text-primary-500 shrink-0" />
                <span class="truncate">{{ cargo.area.nombre }}</span>
                <span
                  v-if="cargo.area.codigo"
                  class="text-[10px] font-mono px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800"
                >
                  {{ cargo.area.codigo }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          label="Continuar con este cargo"
          color="primary"
          icon="i-lucide-arrow-right"
          :loading="saving"
          :disabled="!selectedCargoId"
          class="rounded-md px-5 h-10 font-bold"
          @click="handleConfirmar"
        />
      </div>
    </template>
  </UModal>
</template>
