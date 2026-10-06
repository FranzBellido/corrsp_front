<template>
  <div class="flex flex-col h-screen">
    <header class="bg-white shadow p-4">
      <h1 class="text-xl font-bold">Gestión de Documentos</h1>
    </header>
    <main class="flex-1 p-4 bg-gray-50 flex flex-col">
      <div class="max-w-4xl mx-auto w-full">
        <h2 class="text-lg font-semibold mb-4">Lista de Documentos</h2>
        <div class="bg-white p-6 rounded shadow border">
          <p class="mb-4 text-gray-600">No hay documentos seleccionados. Crea o edita uno nuevo para empezar.</p>
          <UButton 
            @click="openEditor"
            color="primary"
            size="md"
            :loading="isLoading"
          >
            Crear / Editar Documento de Prueba
          </UButton>
        </div>
      </div>
    </main>

    <UModal v-model:open="showEditor" fullscreen :ui="{ content: 'h-screen w-screen' }">
      <template #content>
        <div class="flex flex-col h-full w-full">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
            <h3 class="text-lg font-semibold text-gray-900">
              Editor de Documentos
            </h3>
            <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="showEditor = false" />
          </div>
          <div class="flex-1 w-full overflow-hidden">
            <OnlyOfficeEditor
              v-if="currentDocKey && currentDocUrl"
              :documentKey="currentDocKey"
              :documentUrl="currentDocUrl"
              title="carta.docx"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const { apiBaseUrl, apiPublicUrl } = useApiUrls();

const showEditor = ref(false);
const currentDocKey = ref('');
const currentDocUrl = ref('');
const isLoading = ref(false);

const openEditor = async () => {
  isLoading.value = true;
  try {
    // Generar un key único para la sesión de edición
    const key = `doc_${Date.now()}`;
    currentDocKey.value = key;
    
    // Crear la plantilla en blanco en el backend
    const response = await $fetch<{ fileName: string }>(`${apiBaseUrl}/documents/template`, {
      method: 'POST',
      body: { key }
    });

    currentDocUrl.value = `${apiPublicUrl}/documents/file/${response.fileName}`;
    
    showEditor.value = true;
  } catch (error) {
    console.error('Error al crear plantilla:', error);
  } finally {
    isLoading.value = false;
  }
};
</script>
