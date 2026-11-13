<template>
  <UCard :ui="{ body: 'p-0 min-w-0', root: 'min-w-0 overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800' }">
    <UTable
      :columns="columns"
      :data="data"
      :loading="loading"
      :ui="{ 
        th: 'bg-slate-50/50 dark:bg-gray-800/50 uppercase text-[9px] font-black tracking-widest text-gray-400 py-2.5 px-4',
        td: 'px-4 py-1.5 text-[13px]'
      }"
    >
      <!-- Proxy all slots to allow custom cell templates -->
      <template v-for="(_, name) in $slots" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>

      <!-- Default empty state -->
      <template v-if="!$slots['empty-state']" #empty-state>
        <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div class="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-4">
            <UIcon name="i-lucide-database-zap" class="size-10 text-gray-300 dark:text-gray-600" />
          </div>
          <p class="text-gray-900 dark:text-white font-bold text-lg">No se encontraron registros</p>
          <p class="text-gray-500 text-sm max-w-xs mt-1">Intente ajustar sus filtros de búsqueda para obtener resultados.</p>
        </div>
      </template>
    </UTable>

    <!-- Pagination Footer -->
    <div v-if="total !== undefined && total > 0" class="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/40">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-black text-gray-400 uppercase tracking-widest">Mostrar</span>
          <USelect
            v-model="pageSizeProxy"
            :items="['10', '20', '50']"
            size="xs"
            class="w-16"
            :ui="{
              base: 'font-bold text-center',
              itemLabel: 'rounded-md',
            }"
          />
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-black text-gray-400 uppercase tracking-widest">Resultados</span>
          <div class="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs font-bold">
            {{ data.length }} / {{ total }}
          </div>
        </div>
      </div>
      
      <UPagination
        v-if="total > pageSize"
        v-model:page="currentPage"
        :total="total"
        :items-per-page="pageSize"
        size="sm"
        variant="ghost"
        :ui="{
          root: 'gap-0.5',
          label: 'min-w-[32px] font-bold rounded-md',
          list: 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
        }"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  columns: any[]
  data: any[]
  loading?: boolean
  total?: number
  page?: number
  pageSize?: number
}>(), {
  loading: false,
  total: 0,
  page: 1,
  pageSize: 10
})

const emit = defineEmits(['update:page', 'update:pageSize'])

const currentPage = computed({
  get: () => props.page,
  set: (val) => emit('update:page', val)
})

const pageSizeProxy = computed({
  get: () => String(props.pageSize),
  set: (val) => {
    emit('update:pageSize', Number(val))
    // Reset to first page when page size changes
    emit('update:page', 1)
  }
})
</script>

<style scoped>
@reference "../assets/css/main.css";

/* Transición suave para el estado de carga */
:deep(.u-table-loading) {
  @apply opacity-50 pointer-events-none grayscale transition-all duration-300;
}
</style>
