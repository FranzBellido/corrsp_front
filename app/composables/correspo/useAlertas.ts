import type { AlertasDashboard } from '~/types/correspo/alertas'
import { ALERTAS_AMBITO_AREA } from '~/types/correspo/alertas'
import type { RespuestaApi } from '~/types/shared/respuestas'
import { get } from '~/services/backend.service'
import { useProfile } from '~/composables/comun/useProfile'

export function useAlertas() {
  const { resolveCargoOrigenId } = useProfile()
  const loading = useState<boolean>('alertas-loading', () => false)
  const data = useState<AlertasDashboard | null>('alertas-data', () => null)
  const lastFiltro = useState<string | null>('alertas-last-filtro', () => null)

  const totalAlertas = computed(() => data.value?.resumen.total ?? 0)
  const totalRojas = computed(() => data.value?.resumen.rojas ?? 0)

  async function fetchAlertas(filtro?: string | null) {
    const valor = filtro?.trim() || resolveCargoOrigenId()
    loading.value = true
    try {
      const params: Record<string, string> = {}
      if (valor === ALERTAS_AMBITO_AREA) {
        params.ambito = 'area'
        const cargoRef = resolveCargoOrigenId()
        if (cargoRef) params.cargo_id = cargoRef
      } else if (valor) {
        params.ambito = 'cargo'
        params.cargo_id = valor
      }
      const res = await get<AlertasDashboard>('dashboard/alertas', params)
      data.value = (res as RespuestaApi<AlertasDashboard>)?.data ?? null
      lastFiltro.value = valor
      return data.value
    } catch (error) {
      console.error('Error cargando alertas:', error)
      data.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    data,
    lastFiltro,
    totalAlertas,
    totalRojas,
    fetchAlertas,
  }
}
