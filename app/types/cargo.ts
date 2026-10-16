export interface Cargo {
  id: string;
  nombre: string;
  id_anterior?: number;
  cargos_cod_depto?: string | null;
  area_id?: string | null;
  usuario_id?: string | null;
  tipo_id?: number | null;
  activa_transferencia?: boolean | null;
  areas?: {
    id: string;
    nombre: string;
    codigo: string;
  } | null;
  usuarios?: {
    id: string;
    nombre_completo: string;
    email: string;
    nombre_usuario: string;
  } | null;
  codificador?: {
    codificadorId: number;
    nombre?: string | null;
  } | null;
}

export interface CreateCargoPayload {
  nombre: string;
  id_anterior?: number;
  cargos_cod_depto?: string;
  area_id?: string;
  usuario_id?: string;
  tipo_id?: number;
  activa_transferencia?: boolean;
}

export interface UpdateCargoPayload extends Partial<CreateCargoPayload> {}

export interface FiltroCargo {
  criterio?: string;
  nombre?: string;
  area_id?: string;
  usuario_id?: string;
  cargos_cod_depto?: string;
  pagina?: number;
  limite?: number;
}

export interface VistaCargo {
  datos: Cargo[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export type RespuestaBusquedaCargo = VistaCargo;
