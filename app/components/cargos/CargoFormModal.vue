<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Cargo, CreateCargoPayload, UpdateCargoPayload } from '~/types/cargo'
import type { CodificadorDto } from '~/types/codificador'
import { TipoCodificadorEnum } from '~/types/correspondencia'
import { backendService } from '~/services/backend.service'
import CodificadorSelect from '~/components/codificador/CodificadorSelect.vue'

const props = defineProps<{
  cargo?: Cargo | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'guardado'): void
}>()

const toast = useToast()
const saving = ref(false)
const loadingUsuarios = ref(false)
const usuariosDisponibles = ref<CodificadorDto[]>([])
const filtroUsuarios = ref('')
const soloSeleccionados = ref(false)

type UsuarioOption = CodificadorDto & { email?: string }

const normalizarBusqueda = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const usuariosFiltrados = computed(() => {
  let lista = usuariosDisponibles.value
  if (soloSeleccionados.value) {
    const ids = new Set((form.value.usuarios_ids || []).map(String))
    lista = lista.filter((u) => ids.has(String(u.id)))
  }
  const q = normalizarBusqueda(filtroUsuarios.value)
  if (!q) return lista
  return lista.filter((u) => {
    const item = u as UsuarioOption
    const nombre = normalizarBusqueda(String(item.nombre ?? ''))
    const email = normalizarBusqueda(String(item.email ?? ''))
    const id = String(item.id).toLowerCase()
    return nombre.includes(q) || email.includes(q) || id.includes(q)
  })
})

const totalSeleccionados = computed(() => (form.value.usuarios_ids || []).length)

const cargoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre del cargo es obligatorio')
    .max(255, 'No puede exceder 255 caracteres'),
  id_anterior: z.number().int().optional(),
  cargos_cod_depto: z.string().max(255, 'No puede exceder 255 caracteres').optional(),
  area_id: z.string().optional(),
  usuarios_ids: z.array(z.string()).default([]),
  tipo_id: z.number({ message: 'Debe seleccionar el tipo de cargo' }).optional(),
  activa_transferencia: z.boolean().default(false),
})

type CargoSchemaType = z.infer<typeof cargoSchema>

const emptyForm = (): CargoSchemaType => ({
  nombre: '',
  id_anterior: undefined,
  cargos_cod_depto: '',
  area_id: '',
  usuarios_ids: [],
  tipo_id: undefined as unknown as number,
  activa_transferencia: false,
})

const form = ref<CargoSchemaType>(emptyForm())

const isEditing = computed(() => !!props.cargo?.id)

const cargarUsuarios = async () => {
  loadingUsuarios.value = true
  try {
    const res = await backendService.get<CodificadorDto[]>('comun/codificador/usuarios')
    const data = (res as { data?: CodificadorDto[] })?.data ?? res
    usuariosDisponibles.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error al cargar usuarios:', error)
    usuariosDisponibles.value = []
  } finally {
    loadingUsuarios.value = false
  }
}

const toggleUsuario = (usuarioId: string) => {
  const current = form.value.usuarios_ids || []
  if (current.includes(usuarioId)) {
    form.value.usuarios_ids = current.filter((id) => id !== usuarioId)
  } else {
    form.value.usuarios_ids = [...current, usuarioId]
  }
}

watch(
  () => props.cargo,
  (val) => {
    if (val) {
      const ids =
        val.usuarios?.map((u) => u.id).filter(Boolean) ||
        (val.usuario_id ? [val.usuario_id] : [])
      form.value = {
        nombre: val.nombre || '',
        id_anterior: val.id_anterior,
        cargos_cod_depto: val.cargos_cod_depto || '',
        area_id: val.area_id || '',
        usuarios_ids: ids,
        tipo_id: val.tipo_id ?? (val.codificador?.codificadorId as number | undefined),
        activa_transferencia: Boolean(val.activa_transferencia),
      }
    } else {
      form.value = emptyForm()
    }
  },
  { immediate: true },
)

watch(open, (isOpen) => {
  if (isOpen) {
    filtroUsuarios.value = ''
    soloSeleccionados.value = false
    void cargarUsuarios()
  }
})

const handleSave = async (event?: FormSubmitEvent<CargoSchemaType>) => {
  const data = event?.data || form.value

  saving.value = true
  try {
    const usuariosIds = [...new Set((data.usuarios_ids || []).filter(Boolean))]
    const payload: CreateCargoPayload = {
      nombre: data.nombre.trim(),
      id_anterior: data.id_anterior !== undefined ? Number(data.id_anterior) : undefined,
      cargos_cod_depto: data.cargos_cod_depto?.trim() || undefined,
      area_id: data.area_id || undefined,
      usuarios_ids: usuariosIds,
      tipo_id: data.tipo_id != null ? Number(data.tipo_id) : undefined,
      activa_transferencia: Boolean(data.activa_transferencia),
    }

    if (isEditing.value && props.cargo?.id) {
      await backendService.patch<Cargo>('cargos', props.cargo.id, payload as UpdateCargoPayload)
      toast.add({
        title: 'Cargo actualizado',
        description: 'El cargo ha sido modificado exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } else {
      await backendService.post<Cargo>('cargos', payload)
      toast.add({
        title: 'Cargo creado',
        description: 'El nuevo cargo fue registrado exitosamente.',
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    }

    open.value = false
    emit('guardado')
  } catch (error: unknown) {
    const err = error as { data?: { message?: string | string[] }; message?: string }
    const errorMsg =
      (Array.isArray(err?.data?.message) ? err.data.message.join(', ') : err?.data?.message) ||
      err?.message ||
      'Ocurrió un error al procesar el cargo'

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
    :title="isEditing ? 'Editar Cargo' : 'Nuevo Cargo'"
    :description="isEditing ? 'Modifique los campos correspondientes del cargo.' : 'Ingrese la información para registrar un nuevo cargo institucional.'"
    :ui="{
      content: 'sm:max-w-xl',
    }"
  >
    <template #body>
      <UForm
        id="cargo-form"
        :schema="cargoSchema"
        :state="form"
        class="space-y-4"
        @submit="handleSave"
      >
        <UFormField
          label="Nombre del Cargo"
          name="nombre"
          required
          help="Denominación formal del cargo o puesto."
        >
          <UInput
            v-model="form.nombre"
            placeholder="Ej. JEFE DE UNIDAD FINANCIERA"
            icon="i-lucide-briefcase"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField
          label="Tipo de cargo"
          name="tipo_id"
          help="Clasificación del cargo según el catálogo institucional (codificador tipo 3)."
        >
          <CodificadorSelect
            v-model="form.tipo_id"
            endpoint="comun/codificador"
            :params="{ tipo_id: TipoCodificadorEnum.TIPO_CARGO }"
            placeholder="Seleccione el tipo de cargo..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Área / Unidad Organizacional"
          name="area_id"
          help="Seleccione el área a la que pertenece este cargo."
        >
          <CodificadorSelect
            v-model="form.area_id"
            endpoint="comun/codificador/areas"
            placeholder="Buscar y seleccionar área..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Funcionarios asignados"
          name="usuarios_ids"
          :help="totalSeleccionados > 0
            ? `${totalSeleccionados} seleccionado(s). Busque por nombre, usuario o correo.`
            : 'Puede vincular uno o más usuarios a este cargo.'"
        >
          <div
            v-if="loadingUsuarios"
            class="text-sm text-neutral-500 py-2"
          >
            Cargando usuarios...
          </div>
          <div
            v-else-if="usuariosDisponibles.length === 0"
            class="text-sm text-neutral-500 italic py-2"
          >
            No hay usuarios disponibles para asignar.
          </div>
          <div
            v-else
            class="space-y-2"
          >
            <UInput
              v-model="filtroUsuarios"
              placeholder="Buscar por nombre, usuario o correo..."
              icon="i-lucide-search"
              class="w-full"
              :ui="{ trailing: 'pe-1' }"
            >
              <template
                v-if="filtroUsuarios"
                #trailing
              >
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-x"
                  aria-label="Limpiar búsqueda"
                  @click="filtroUsuarios = ''"
                />
              </template>
            </UInput>

            <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500">
              <span>
                Mostrando {{ usuariosFiltrados.length }} de {{ usuariosDisponibles.length }}
              </span>
              <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <UCheckbox
                  v-model="soloSeleccionados"
                  :disabled="totalSeleccionados === 0"
                />
                <span>Solo seleccionados</span>
              </label>
            </div>

            <div
              v-if="usuariosFiltrados.length === 0"
              class="text-sm text-neutral-500 italic py-3 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-md"
            >
              Ningún usuario coincide con el filtro.
            </div>

            <div
              v-else
              class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1"
            >
            <div
              v-for="usuario in usuariosFiltrados"
              :key="String(usuario.id)"
              class="flex items-start gap-2.5 p-2.5 rounded-md border transition-all duration-200 cursor-pointer select-none"
              :class="[
                (form.usuarios_ids || []).includes(String(usuario.id))
                  ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20 text-primary-950 dark:text-primary-100 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/60'
              ]"
              @click="toggleUsuario(String(usuario.id))"
            >
              <UCheckbox
                :model-value="(form.usuarios_ids || []).includes(String(usuario.id))"
                class="mt-0.5 pointer-events-none"
              />
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-bold leading-tight truncate">{{ usuario.nombre }}</span>
                <span
                  v-if="(usuario as UsuarioOption).email"
                  class="text-[10px] text-neutral-500 truncate"
                >
                  {{ (usuario as UsuarioOption).email }}
                </span>
              </div>
            </div>
            </div>
          </div>
        </UFormField>

        <UFormField
          label="Transferencia entre usuarios"
          name="activa_transferencia"
          help="Permite transferir correspondencia entre usuarios vinculados a este cargo."
        >
          <UCheckbox
            v-model="form.activa_transferencia"
            label="Activar transferencia"
            description="Habilita la transferencia de trámites entre usuarios del mismo cargo."
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          :disabled="saving"
          @click="open = false"
        />
        <UButton
          :label="isEditing ? 'Guardar Cambios' : 'Registrar Cargo'"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
          type="submit"
          form="cargo-form"
        />
      </div>
    </template>
  </UModal>
</template>
