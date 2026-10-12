import type { RespuestaApi, RespuestaLista } from "~/types/respuestas";

/**
 * Función helper para obtener un cliente $fetch pre-configurado
 * con la BaseURL y el token de Keycloak inyectado (si está autenticado).
 */
export const getApi = () => {
  const { $api, $keycloak } = useNuxtApp();

  if ($api) {
    return $api;
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
    async onRequest({ options }: { options: RequestInit }) {
      if ($keycloak && ($keycloak as any).authenticated) {
        try {
          //console.log("[DEBUG] Updating Keycloak token...");
          await ($keycloak as any).updateToken(30);
          const headers = new Headers(options.headers || {});
          headers.set("Authorization", `Bearer ${($keycloak as any).token}`);
          options.headers = headers;
          // console.log('[DEBUG] Authorization header added.');
        } catch (error) {
          // console.error('[DEBUG] Keycloak token update failed:', error);
          ($keycloak as any).logout();
        }
      } else {
        // console.warn('[DEBUG] Keycloak not authenticated or not available!');
      }
    },
  });
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
 * POST multipart/form-data (subida de archivos)
 */
export async function postMultipart<T>(
  endpoint: string,
  body: FormData,
): Promise<RespuestaApi<T>> {
  const api = getApi();
  return await api(endpoint, {
    method: "POST",
    body,
  });
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
  postMultipart,
};
