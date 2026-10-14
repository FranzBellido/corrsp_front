export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

export interface UsuarioCargo {
  id: string;
  nombre: string;
  areas?: {
    id: string;
    nombre: string;
    codigo: string;
  } | null;
}

export interface Usuario {
  id: string;
  nombre_completo: string;
  nombre_usuario: string;
  email: string;
  activo: boolean;
  disponible?: boolean | null;
  ni?: string | null;
  emitido_en?: string | null;
  titulo?: string | null;
  foto_url?: string | null;
  cargos?: UsuarioCargo[];
  roles?: Rol[];
}

export interface CreateUsuarioPayload {
  nombre_completo: string;
  nombre_usuario: string;
  email: string;
  activo?: boolean;
  disponible?: boolean;
  ni?: string;
  emitido_en?: string;
  titulo?: string;
  roles_ids?: string[];
}

export interface UpdateUsuarioPayload extends Partial<CreateUsuarioPayload> {}

export interface FiltroUsuario {
  criterio?: string;
  rol_id?: string;
  activo?: boolean;
  pagina?: number;
  limite?: number;
}

export interface RespuestaBusquedaUsuario {
  datos: Usuario[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}
