# Especificación Técnica Frontend: AFCOOP (Nuxt, Nuxt UI & Keycloak)

## 1. Descripción General
Interfaz de usuario para el sistema de correspondencia y trámites **AFCOOP**. Incorpora autenticación centralizada mediante **Keycloak**, gestión de bandejas de entrada/salida, creación y edición de documentos (OnlyOffice), flujos de derivación y una capa de servicios centralizada para la comunicación tipada con el backend.

## 2. Pil tecnológico Frontend
- **Framework:** Nuxt (Vue 3 con Composition API y `<script setup>`)
- **Librería UI:** Nuxt UI (Tailwind CSS integrado)
- **Autenticación / Identidad:** Keycloak (`keycloak-js`) bajo protocolo OpenID Connect (OIDC).
- **Capa HTTP Centralizada:** Wrapper sobre `$fetch` de Nuxt con inyección dinámica de tokens JWT, manejo de `Blob` para descargas y soporte para peticiones `multipart/form-data`.
- **Tipado:** TypeScript estricto con interfaces genéricas (`RespuestaApi<T>`, `RespuestaLista<T>`).

## 3. Patrón de Comunicación (Servicios Genéricos)
El sistema utiliza un módulo centralizado (`backendService`) que estandariza las operaciones HTTP:
- **Lectura:** `backendService.get(endpoint, params)` y `backendService.getBy(endpoint)`.
- **Búsqueda Paginada:** `backendService.buscar(endpoint, params)`.
- **Escritura / Creación:** `backendService.crear(endpoint, payload)` o `backendService.post`.
- **Modificación:** `backendService.put` y `backendService.patch`.
- **Eliminación:** `backendService.delete`.
- **Archivos y Binarios:** `backendService.descargarBlob(endpoint)` y `backendService.postMultipart(endpoint, body)`.

## 4. Estructura de Módulos y Vistas (Páginas)
1. **Módulo de Autenticación:** Pantalla de bienvenida e inicio de sesión OIDC.
2. **Módulo de Bandejas:** Entrada, Enviados y Archivados.
3. **Módulo de Correspondencia:** Listado, formulario de registro, visor OnlyOffice y Hoja de Ruta.
4. **Módulo de Administración:** Gestión de usuarios, roles, áreas y cargos.