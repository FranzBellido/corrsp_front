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

const props = withDefaults(
  defineProps<{
    documentKey: string
    documentUrl: string
    title?: string
    fileType?: string
    documentType?: string
    userId?: string
    userName?: string
    /** Si viene del backend, tiene prioridad sobre apiPublicUrl */
    callbackUrl?: string
  }>(),
  {
    title: 'Documento.docx',
    fileType: 'docx',
    documentType: 'word',
    userId: 'uid-1',
    userName: 'Usuario',
    callbackUrl: '',
  },
)

const config = useRuntimeConfig();
const { apiPublicUrl } = useApiUrls();

const documentServerUrl = config.public.onlyOfficeServer as string;
const editorId = `ooe-editor-${props.documentKey}`;

const loading = ref(true);
const editorConfig = ref<any>(null);

onMounted(async () => {
  try {
    const resolvedCallback =
      props.callbackUrl?.trim() || `${apiPublicUrl}/documents/callback`

    const baseConfig: any = {
      document: {
        fileType: props.fileType,
        key: props.documentKey,
        title: props.title,
        url: props.documentUrl,
        permissions: {
          edit: true,
          download: true,
          print: true,
        },
      },
      documentType: props.documentType,
      editorConfig: {
        callbackUrl: resolvedCallback,
        mode: 'edit',
        lang: 'es',
        customization: {
          forcesave: true,
        },
        user: {
          id: props.userId,
          name: props.userName,
        },
      }
    };

    console.info('[OnlyOffice] documentUrl=', props.documentUrl)
    console.info('[OnlyOffice] callbackUrl=', resolvedCallback)

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
