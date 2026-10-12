<template>
  <div class="w-full h-full relative">
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-50">
      <span class="text-gray-500 font-medium">Cargando editor...</span>
    </div>
    <DocumentEditor
      v-else-if="editorConfig"
      :id="editorId"
      :documentServerUrl="documentServerUrl"
      :config="editorConfig"
      width="100%"
      height="100%"
    />
  </div>
</template>

<script setup lang="ts">
import { DocumentEditor } from '@onlyoffice/document-editor-vue';
import { ref, onMounted } from 'vue';
import { useRuntimeConfig } from '#app';

const props = defineProps({
  documentKey: {
    type: String,
    required: true
  },
  documentUrl: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Nuevo Documento.docx'
  },
  fileType: {
    type: String,
    default: 'docx'
  },
  documentType: {
    type: String,
    default: 'word'
  }
});

const config = useRuntimeConfig();
const { apiPublicUrl } = useApiUrls();

const documentServerUrl = config.public.onlyOfficeServer as string;
const editorId = `ooe-editor-${props.documentKey}`;

const loading = ref(true);
const editorConfig = ref<any>(null);

onMounted(async () => {
  try {
    const baseConfig: any = {
      document: {
        fileType: props.fileType,
        key: props.documentKey,
        title: props.title,
        url: props.documentUrl,
      },
      documentType: props.documentType,
      editorConfig: {
        callbackUrl: `${apiPublicUrl}/documents/callback`,
        mode: 'edit',
        lang: 'es',
        user: {
          id: 'uid-1',
          name: 'Usuario',
        },
      }
    };

    // Fetch the JWT token signed with the secret on the backend
    const response = await $fetch<{ token: string }>('/api/onlyoffice/token', {
      method: 'POST',
      body: baseConfig
    });

    baseConfig.token = response.token;
    editorConfig.value = baseConfig;
  } catch (error) {
    console.error('Error fetching OnlyOffice token:', error);
  } finally {
    loading.value = false;
  }
});
</script>
