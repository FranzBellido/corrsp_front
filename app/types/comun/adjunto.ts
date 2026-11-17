export const ENTIDAD_ADJUNTO_CORRESPONDENCIA = 'correspondencia'
export const ENTIDAD_ADJUNTO_SEGUIMIENTO_ACTIVIDAD = 'seguimiento_actividad'

export interface AdjuntoCorrespondencia {
  id: string
  descripcion: string
  extension: string
  tipo_mime: string
  tamanio: string | number
  itemId: string
  entidad: string
  url_archivo?: string | null
}
