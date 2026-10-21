export enum TipoCodificadorEnum {
  PRIORIDAD = 1,
  TIPO_INSTRUCCION = 2,
  TIPO_CARGO = 3,
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
  cargo_origen_id?: string | null;
  remitente_id?: string | null;
  destinatario_id?: string | null;
  referencia: string;
  /** Ruta MinIO del .docx (OnlyOffice) */
  url_documento?: string | null;
  /** @deprecated usar url_documento */
  contenido?: string | null;
  fecha_emision?: string | null;
  fecha_plazo?: string | null;
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
  hoja_ruta?: HojaRuta | null;
  proceso?: {
    id: number;
    nombre: string;
    codigo?: string;
    plantilla?: string | null;
    requiere_cooperativa?: boolean;
    requiere_entidad?: boolean;
  } | null;
  corresp_cooperativa?: CorrespCooperativa[];
  corresp_entidad?: CorrespEntidad[];
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
  cargo_origen?: {
    id: string;
    nombre: string;
  } | null;
  cargo_destinatario?: {
    id: string;
    nombre: string;
  } | null;
  estado?: {
    id: number;
    nombre: string;
    color?: number | null;
  } | null;
  corresp_usuario?: CorrespUsuarioCompartido[];
  acceso_compartido?: {
    solo_lectura: boolean;
    comentario?: string | null;
  } | null;
  _count?: {
    derivaciones: number;
    corresp_usuario?: number;
  };
}

export interface CorrespUsuarioCompartido {
  usuario_id: string;
  corresp_id: string;
  solo_lectura: boolean;
  comentario?: string | null;
  usuarios?: {
    id: string;
    nombre_completo: string;
    nombre_usuario: string;
    email?: string | null;
  };
}

export interface CorrespCooperativa {
  corresp_id?: string;
  cooperativa_id: number;
  solicitante: string;
  nro_carnet: string;
  cargo_solicitante?: string | null;
  correo_solicitante?: string | null;
  nro_poder?: string | null;
  nro_deposito?: string | null;
  importe?: number | string | null;
  telefono?: string | null;
  cooperativa?: {
    id: number;
    denominacion?: string | null;
    razon_social?: string | null;
    nro_registro?: string | null;
  };
}

export interface CorrespCooperativaPayload {
  cooperativa_id: number;
  solicitante: string;
  nro_carnet: string;
  cargo_solicitante?: string;
  correo_solicitante?: string;
  nro_poder?: string;
  nro_deposito?: string;
  importe?: number;
  telefono?: string;
}

export interface CorrespEntidad {
  corresp_id?: string;
  entidad_id: number;
  entidad?: {
    id: number;
    nombre_ent?: string | null;
    estado?: number;
  };
}

export interface CorrespEntidadPayload {
  entidades_ids: number[];
}

export interface CreateCorrespondenciaPayload {
  referencia: string;
  proc_id: number;
  prioridad_id: number;
  confidencial: boolean;
  area_origen_id: string;
  cargo_origen_id: string;
  remitente_id?: string;
  destinatario_id: string;
  es_nueva_hr?: boolean;
  /** Si es false, no se genera HR ni correlativo/CITE al crear. */
  asignar_cite_hr?: boolean;
  nro_hr?: number;
  hr_id?: string;
  cite_origen?: string;
  cooperativa?: CorrespCooperativaPayload;
  entidades?: CorrespEntidadPayload;
  codigo_unico: string;   // para validar si ya existe la correspondencia
}

export interface AsignarCiteHrPayload {
  es_nueva_hr: boolean;
  nro_hr?: number;
}

export interface UpdateCorrespondenciaPayload {
  referencia?: string;
  proc_id?: number;
  prioridad_id?: number;
  confidencial?: boolean;
  cite_origen?: string;
  remitente_id?: string;
  destinatario_id?: string;
  cooperativa?: CorrespCooperativaPayload;
  entidades?: CorrespEntidadPayload;
}

export interface FiltroCorrespondencia {
  criterio?: string;
  remitente_id?: string;
  cargo_origen_id?: string;
  area_origen_id?: string;
  estado_id?: number;
  proc_id?: number;
  gestion?: number;
  sin_derivaciones?: boolean;
  solo_compartidos?: boolean;
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
