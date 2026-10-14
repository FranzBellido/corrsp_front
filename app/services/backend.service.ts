import type { RespuestaApi, RespuestaLista } from "~/types/respuestas";

import type { $Fetch } from "ofetch";

/**
 * Función helper para obtener un cliente $fetch pre-configurado
 * con la BaseURL y el token de Keycloak inyectado (si está autenticado).
 */
export const getApi = (): $Fetch => {
  const nuxtApp = useNuxtApp() as any;
  const { $api, $keycloak } = nuxtApp;

  if ($api) {
    return $api as $Fetch;
  }

  // Fallback if $api is not available (shouldn't happen on client)
  const config = useRuntimeConfig();
  const base = config.public.apiBaseUrl as string;
  const baseUrl = base.endsWith("/api") ? base : `${base}/api`;

  return $fetch.create({
    baseURL: baseUrl,
    headers: {
      "Content-Type": "application/json",
    },
    async onRequest(context: any) {
      const headers = new Headers(context.options.headers || {});

      // FormData debe enviar el boundary automático; application/json rompe la subida multipart.
      if (context.options.body instanceof FormData) {
        headers.delete("Content-Type");
        headers.delete("content-type");
      }

      if ($keycloak && ($keycloak as any).authenticated) {
        try {
          await ($keycloak as any).updateToken(30);
          headers.set("Authorization", `Bearer ${($keycloak as any).token}`);
        } catch {
          ($keycloak as any).logout();
        }
      }

      context.options.headers = headers;
    },
  }) as $Fetch;
};

/**
 * Buscador genérico para cualquier recurso paginado
 */
export async function buscarGenerico<T>(
  endpoint: string,
  params: Record<string, any>,
): Promise<RespuestaLista<T>> {
  const api = getApi();
  return await api(endpoint, {
    method: "POST",
    body: params,
  });
}

/**
 * Servicio genérico para realizar peticiones POST
 */
export async function postGenerico<T>(
  endpoint: string,
  payload: Record<string, any>,
): Promise<RespuestaApi<T>> {
  const api = getApi();
  return await api(endpoint, {
    method: "POST",
    body: payload,
  });
}

/**
 * Servicio genérico para crear recursos (alias de postGenerico)
 */
export async function crearGenerico<T>(
  endpoint: string,
  payload: Record<string, any>,
): Promise<RespuestaApi<T>> {
  return postGenerico<T>(endpoint, payload);
}

/**
 * Servicio genérico para actualizar recursos
 */
export async function actualizarGenerico<T>(
  endpoint: string,
  id: number | string,
  payload: Record<string, any>,
): Promise<RespuestaApi<T>> {
  const api = getApi();
  return await api(`${endpoint}/${id}`, {
    method: "PUT",
    body: payload,
  });
}

/**
 * Servicio genérico para actualización parcial (PATCH)
 */
export async function patchGenerico<T>(
  endpoint: string,
  id: number | string,
  payload: Record<string, any>,
): Promise<RespuestaApi<T>> {
  const api = getApi();
  return await api(`${endpoint}/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

/**
 * Servicio genérico para obtener por ID
 */
export async function obtenerPorIdGenerico<T>(
  endpoint: string,
  id: number | string,
): Promise<RespuestaApi<T>> {
  const api = getApi();
  return await api(`${endpoint}/${id}`, {
    method: "GET",
  });
}

/**
 * Servicio genérico para obtener listas sin paginación o de origen o un solo registro
 */
export async function obtenerPorGenerico<T>(
  endpoint: string,
): Promise<RespuestaApi<T>> {
  const api = getApi();
  return await api(endpoint, {
    method: "GET",
  });
}

/**
 * Servicio genérico para eliminar
 */
export async function eliminarGenerico<T>(
  endpoint: string,
  id: number | string,
): Promise<RespuestaApi<T>> {
  const api = getApi();
  return await api(`${endpoint}/${id}`, {
    method: "DELETE",
  });
}

/**
 * Servicio genérico para realizar peticiones GET con parámetros
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, any>,
): Promise<RespuestaApi<T>> {
  const api = getApi();
  return await api(endpoint, {
    method: "GET",
    params: params,
  });
}

/**
 * Descarga binaria (PDF, archivos adjuntos, etc.)
 */
export async function descargarBlob(endpoint: string): Promise<Blob> {
  const api = getApi();
  const response = await api(endpoint, {
    method: "GET",
    responseType: "blob",
  });
  return response as Blob;
}

/**
 * Convierte una clave de storage (ej: avatars/xxx.jpg) en un blob URL
 * listo para mostrar en <img> / UAvatar. Las URLs http(s)/blob se dejan igual.
 */
export async function obtenerUrlDesdeStorage(
  fotoPath: string | null | undefined,
): Promise<string | null> {
  if (!fotoPath) {
    return null;
  }

  if (
    fotoPath.startsWith("blob:") ||
    fotoPath.startsWith("http://") ||
    fotoPath.startsWith("https://") ||
    fotoPath.includes("ui-avatars.com")
  ) {
    return fotoPath;
  }

  // Clave MinIO: folder/filename → GET storage/download/:folder/:filename
  const blob = await descargarBlob(`storage/download/${fotoPath}`);
  return URL.createObjectURL(blob);
}

/**
 * POST multipart/form-data (subida de archivos)
 */
const multipartFetch = async <T>(
  method: "POST" | "PATCH",
  endpoint: string,
  body: FormData,
): Promise<RespuestaApi<T>> => {
  const api = getApi();
  return await api(endpoint, {
    method,
    body,
    headers: {
      Accept: "application/json",
      // Evita heredar application/json del cliente por defecto (ofetch/h3).
      "Content-Type": false,
    },
  });
};

export async function postMultipart<T>(
  endpoint: string,
  body: FormData,
): Promise<RespuestaApi<T>> {
  return multipartFetch<T>("POST", endpoint, body);
}

/**
 * PATCH multipart/form-data (actualización con archivos)
 */
export async function patchMultipart<T>(
  endpoint: string,
  body: FormData,
): Promise<RespuestaApi<T>> {
  return multipartFetch<T>("PATCH", endpoint, body);
}

/**
 * Agrupación de servicios en un solo objeto para facilitar el uso
 */
export const backendService = {
  get,
  post: postGenerico,
  put: actualizarGenerico,
  patch: patchGenerico,
  delete: eliminarGenerico,
  getById: obtenerPorIdGenerico,
  getBy: obtenerPorGenerico,
  buscar: buscarGenerico,
  crear: crearGenerico,
  descargarBlob,
  obtenerUrlDesdeStorage,
  postMultipart,
  patchMultipart,
};
