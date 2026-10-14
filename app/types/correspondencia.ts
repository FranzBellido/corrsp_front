export enum TipoCodificadorEnum {
  PRIORIDAD = 1,
}

export interface HojaRuta {
  id: string;
  area_id: string;
  anio: number;
  numero: number;
  referencia?: string | null;
  areas?: {
    id: string;
    nombre: string;
    codigo: string;
  };
}

export interface Correspondencia {
  id: string;
  hr_id?: string | null;
  nro: number;
  area_origen_id: string;
  remitente_id?: string | null;
  referencia: string;
  contenido?: string | null;
  fecha_emision?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string | null;
  estado_id: number;
  confidencial: boolean;
  proc_id: number;
  gestion: number;
  cite_origen?: string | null;
  prioridad_id: number;
  firmado_id?: string | null;
  hoja_ruta?: HojaRuta | null;
  proceso?: {
    id: number;
    nombre: string;
    codigo?: string;
  } | null;
  codificador?: {
    codificadorId: number;
    nombre?: string;
    descripcion?: string;
  } | null;
  areas?: {
    id: string;
    nombre: string;
    codigo: string;
  } | null;
  cargos?: {
    id: string;
    nombre: string;
  } | null;
  estado?: {
    id: number;
    nombre: string;
    color?: number | null;
  } | null;
  _count?: {
    derivaciones: number;
  };
}

export interface CreateCorrespondenciaPayload {
  referencia: string;
  proc_id: number;
  prioridad_id: number;
  confidencial: boolean;
  area_origen_id: string;
  remitente_id?: string;
  firmado_id?: string;
  es_nueva_hr?: boolean;
  nro_hr?: number;
  hr_id?: string;
  cite_origen?: string;
}

export interface UpdateCorrespondenciaPayload {
  referencia?: string;
  proc_id?: number;
  prioridad_id?: number;
  confidencial?: boolean;
  cite_origen?: string;
  firmado_id?: string;
}

export interface FiltroCorrespondencia {
  criterio?: string;
  remitente_id?: string;
  area_origen_id?: string;
  estado_id?: number;
  proc_id?: number;
  gestion?: number;
  sin_derivaciones?: boolean;
  pagina?: number;
  limite?: number;
}

export interface RespuestaBusquedaCorrespondencia {
  items: Correspondencia[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}
