<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Usuario, FiltroUsuario, RespuestaBusquedaUsuario, Rol } from '~/types/usuario'
import { backendService } from '~/services/backend.service'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')

const toast = useToast()

// Estado de listado y paginación
const loading = ref(false)
const usuarios = ref<Usuario[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// Filtros de búsqueda
const searchCriterio = ref('')
const selectedRolId = ref<string | null>(null)
const selectedActivo = ref<string | null>(null)

// Modal de Creación / Edición
const isModalOpen = ref(false)
const usuarioToEdit = ref<Usuario | null>(null)

// Modal de detalle (consulta)
const isDetalleOpen = ref(false)
const usuarioDetalleId = ref<string | null>(null)

// Modal de Confirmación de Eliminación
const isDeleteOpen = ref(false)
const usuarioToDelete = ref<Usuario | null>(null)
const deleting = ref(false)

// Columnas para CorTable
const columns: TableColumn<Usuario>[] = [
  {
    accessorKey: 'nombre_completo',
    header: 'Usuario / Funcionario',
    cell: ({ row }) => {
      const u = row.original
      return h('div', { class: 'flex items-center gap-3' }, [
        h(
          'div',
          {
            class:
              'size-9 rounded-full bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs shrink-0',
          },
          u.nombre_completo.charAt(0).toUpperCase(),
        ),
        h('div', { class: 'flex flex-col' }, [
          h('div', { class: 'flex items-center gap-1.5 flex-wrap' }, [
            u.titulo
              ? h(
                  UBadge,
                  { color: 'neutral', variant: 'outline', size: 'xs', class: 'text-[10px] px-1 py-0' },
                  () => u.titulo,
                )
              : null,
            h('span', { class: 'font-semibold text-gray-900 dark:text-white text-sm' }, u.nombre_completo),
          ]),
          h('span', { class: 'text-xs text-gray-400 font-mono' }, `@${u.nombre_usuario}`),
        ]),
      ])
    },
  },
  {
    accessorKey: 'ni',
    header: 'Identificación (CI/NI)',
    cell: ({ row }) => {
      const u = row.original
      if (!u.ni) return h('span', { class: 'text-xs text-gray-400' }, '—')
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UIcon, { name: 'i-lucide-id-card', class: 'size-4 text-gray-400 shrink-0' }),
        h('span', { class: 'text-xs font-mono font-medium text-gray-700 dark:text-gray-300' }, [
          u.ni,
          u.emitido_en ? ` ${u.emitido_en}` : '',
        ]),
      ])
    },
  },
  {
    accessorKey: 'email',
    header: 'Correo Electrónico',
    cell: ({ row }) => {
      const u = row.original
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UIcon, { name: 'i-lucide-mail', class: 'size-4 text-gray-400 shrink-0' }),
        h('span', { class: 'text-xs text-gray-700 dark:text-gray-300' }, u.email || '—'),
      ])
    },
  },
  {
    accessorKey: 'roles',
    header: 'Roles Asignados',
    cell: ({ row }) => {
      const roles = row.original.roles || []
      if (roles.length === 0) {
        return h(
          UBadge,
          { color: 'neutral', variant: 'subtle', size: 'xs' },
          () => 'Sin rol',
        )
      }
      return h(
        'div',
        { class: 'flex flex-wrap gap-1 max-w-xs' },
        roles.map((r: Rol) =>
          h(
            UBadge,
            {
              key: r.id,
              color: 'primary',
              variant: 'subtle',
              size: 'xs',
              class: 'font-medium',
            },
            () => r.nombre,
          ),
        ),
      )
    },
  },
  {
    accessorKey: 'cargos',
    header: 'Cargo / Unidad',
    cell: ({ row }) => {
      const cargos = row.original.cargos || []
      if (cargos.length === 0) {
        return h('span', { class: 'text-xs text-gray-400 italic' }, 'Sin cargo')
      }
      return h('div', { class: 'flex flex-col gap-1' }, [
        ...cargos.map((c) =>
          h('div', { key: c.id, class: 'flex flex-col' }, [
            h('span', { class: 'text-xs font-medium text-gray-800 dark:text-gray-200' }, c.nombre),
            c.areas
              ? h('span', { class: 'text-[11px] text-gray-400' }, c.areas.nombre)
              : null,
          ]),
        ),
      ])
    },
  },
  {
    accessorKey: 'activo',
    header: 'Estado / Disponibilidad',
    cell: ({ row }) => {
      const u = row.original
      return h('div', { class: 'flex flex-col gap-1 items-start' }, [
        h(
          UBadge,
          {
            color: u.activo ? 'success' : 'neutral',
            variant: 'subtle',
            size: 'xs',
          },
          () => (u.activo ? 'Activo' : 'Inactivo'),
        ),
        h(
          UBadge,
          {
            color: u.disponible ? 'info' : 'warning',
            variant: 'subtle',
            size: 'xs',
          },
          () => (u.disponible ? 'Disponible' : 'No Disponible'),
        ),
      ])
    },
  },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => {
      const usuario = row.original
      return h('div', { class: 'flex items-center justify-end gap-1.5' }, [
        h(UButton, {
          icon: 'i-lucide-eye',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          title: 'Ver detalle del usuario',
          onClick: () => handleVerDetalle(usuario),
        }),
        h(UButton, {
          icon: 'i-lucide-pencil',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          title: 'Editar Usuario y Roles',
          onClick: () => handleEditar(usuario),
        }),
        h(UButton, {
          icon: 'i-lucide-trash-2',
          color: 'error',
          variant: 'ghost',
          size: 'xs',
          title: 'Eliminar',
          onClick: () => handleConfirmarEliminar(usuario),
        }),
      ])
    },
  },
]

// Cargar usuarios consumiendo POST 'usuarios/buscar'
const cargarUsuarios = async () => {
  loading.value = true
  try {
    const filtro: FiltroUsuario = {
      pagina: page.value,
      limite: pageSize.value,
      criterio: searchCriterio.value?.trim() || undefined,
      rol_id: selectedRolId.value || undefined,
      activo:
        selectedActivo.value === 'true'
          ? true
          : selectedActivo.value === 'false'
            ? false
            : undefined,
    }

    const res = await backendService.post<RespuestaBusquedaUsuario>('usuarios/buscar', filtro)
    const data = (res as any)?.data || res
    usuarios.value = data.datos || []
    total.value = data.total || 0
  } catch (error: any) {
    toast.add({
      title: 'Error de conexión',
      description: error?.message || 'No se pudieron cargar los usuarios.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    loading.value = false
  }
}

// Búsqueda con debounce
let debounceTimer: any = null
const onSearchInput = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    cargarUsuarios()
  }, 350)
}

const limpiarFiltros = () => {
  searchCriterio.value = ''
  selectedRolId.value = null
  selectedActivo.value = null
  page.value = 1
  cargarUsuarios()
}

// Acciones de CRUD
const handleCrear = () => {
  usuarioToEdit.value = null
  isModalOpen.value = true
}

const handleEditar = (usuario: Usuario) => {
  usuarioToEdit.value = usuario
  isModalOpen.value = true
}

const handleVerDetalle = (usuario: Usuario) => {
  usuarioDetalleId.value = usuario.id
  isDetalleOpen.value = true
}

const handleConfirmarEliminar = (usuario: Usuario) => {
  usuarioToDelete.value = usuario
  isDeleteOpen.value = true
}

const ejecutarEliminacion = async () => {
  if (!usuarioToDelete.value) return
  deleting.value = true
  try {
    await backendService.delete<Usuario>('usuarios', usuarioToDelete.value.id)
    toast.add({
      title: 'Usuario eliminado',
      description: `El usuario "${usuarioToDelete.value.nombre_completo}" fue eliminado exitosamente.`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    isDeleteOpen.value = false
    usuarioToDelete.value = null
    cargarUsuarios()
  } catch (error: any) {
    const msg =
      error?.data?.message ||
      error?.message ||
      'No se pudo eliminar el usuario. Verifique que no posea registros asociados.'
    toast.add({
      title: 'No se pudo eliminar',
      description: msg,
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  cargarUsuarios()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado de página -->
    <PageHeader
      title="Administración de Usuarios"
      description="Gestión integral de funcionarios institucionales, cuentas de acceso y asignación de roles del sistema"
    >
      <template #actions>
        <UButton
          icon="i-lucide-user-plus"
          color="primary"
          class="justify-center h-10 rounded-xl font-bold px-6 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-300 cursor-pointer"
          @click="handleCrear"
        >
          Nuevo Usuario
        </UButton>
      </template>
    </PageHeader>

    <!-- Barra de Filtros (Glassmorphism con AppFilter) -->
    <AppFilter>
      <AppFilterItem label="Búsqueda" min-w="320px" flex1>
        <UInput
          v-model="searchCriterio"
          icon="i-lucide-search"
          placeholder="Buscar por nombre, usuario o email..."
          variant="ghost"
          class="w-full font-medium text-neutral-800 dark:text-neutral-200"
          @update:model-value="onSearchInput"
        />
      </AppFilterItem>

      <AppFilterItem label="Filtrar por Rol" min-w="240px" border>
        <CodificadorSelect
          v-model="selectedRolId"
          endpoint="comun/codificador/roles"
          placeholder="Todos los roles..."
          incluir-todos
          class="w-full"
          @update:model-value="() => { page = 1; cargarUsuarios() }"
        />
      </AppFilterItem>

      <div v-if="searchCriterio || selectedRolId || selectedActivo" class="pl-3 flex items-center">
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          label="Limpiar"
          @click="limpiarFiltros"
        />
      </div>
    </AppFilter>

    <!-- Tabla con CorTable -->
    <CorTable
      :columns="columns"
      :data="usuarios"
      :loading="loading"
      :total="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      @update:page="cargarUsuarios"
      @update:page-size="cargarUsuarios"
    />

    <!-- Modal de Creación / Edición con Roles -->
    <UsuariosUsuarioFormModal
      v-model:open="isModalOpen"
      :usuario="usuarioToEdit"
      @guardado="cargarUsuarios"
    />

    <UsuariosUsuarioDetalleModal
      v-model:open="isDetalleOpen"
      :usuario-id="usuarioDetalleId"
    />

    <!-- Modal de Confirmación de Eliminación -->
    <UModal
      v-model:open="isDeleteOpen"
      title="Confirmar Eliminación"
      description="¿Está seguro de que desea eliminar la cuenta del siguiente usuario?"
    >
      <template #body>
        <div v-if="usuarioToDelete" class="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/50">
          <p class="font-bold text-red-900 dark:text-red-200 text-sm">
            {{ usuarioToDelete.nombre_completo }} (@{{ usuarioToDelete.nombre_usuario }})
          </p>
          <p class="text-xs text-red-700 dark:text-red-300 mt-1">
            Correo: {{ usuarioToDelete.email }}
          </p>
          <p v-if="usuarioToDelete.cargos && usuarioToDelete.cargos.length > 0" class="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
            Tiene cargos vinculados: {{ usuarioToDelete.cargos.map(c => c.nombre).join(', ') }}.
          </p>
          <p class="text-xs text-red-500 mt-2">
            Esta acción desvinculará sus roles. Si el usuario tiene correspondencia histórica o cargos, el sistema restringirá la eliminación.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-3 w-full">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            :disabled="deleting"
            @click="isDeleteOpen = false"
          />
          <UButton
            label="Eliminar Usuario"
            color="error"
            icon="i-lucide-trash"
            :loading="deleting"
            @click="ejecutarEliminacion"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
