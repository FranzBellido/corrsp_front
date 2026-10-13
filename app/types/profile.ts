export interface AreaProfileDto {
  id: string
  codigo: string
  nombre: string
  activo?: boolean
}

export interface CargoProfileDto {
  id: string
  nombre: string
  cargos_cod_depto?: string | null
  area_id?: string | null
  area?: AreaProfileDto | null
}

export interface RolProfileDto {
  id: string
  nombre: string
  descripcion?: string | null
}

export interface ProfileDto {
  id: string
  nombre_completo: string
  nombre_usuario: string
  email: string
  activo?: boolean | null
  disponible?: boolean | null
  ni?: string | null
  emitido_en?: string | null
  titulo?: string | null
  foto_url?: string | null
  cargos: CargoProfileDto[]
  roles: RolProfileDto[]
  cargo_activo_id?: string | null
  area_activa_id?: string | null
  area_activa_nombre?: string | null
}
