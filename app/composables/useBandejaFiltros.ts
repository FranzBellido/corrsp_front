import { ref, type Ref } from 'vue'

export interface BandejaFiltrosState {
  criterio: string
  hoja_ruta: string
  /** Gestión (año). Por defecto la gestión actual. */
  gestion: number
  /** null / 0 = todos los procesos del área */
  proc_id: number | null
}

export function gestionActual(): number {
  return new Date().getFullYear()
}

/** Opciones de gestión: año actual ± 4. */
export function opcionesGestionBandeja(anioBase = gestionActual()) {
  const years: number[] = []
  for (let y = anioBase + 1; y >= anioBase - 4; y -= 1) {
    years.push(y)
  }
  return years.map((y) => ({ label: String(y), value: y }))
}

export function defaultsBandejaFiltros(): BandejaFiltrosState {
  return {
    criterio: '',
    hoja_ruta: '',
    gestion: gestionActual(),
    proc_id: null,
  }
}

function storageKey(bandejaKey: string) {
  return `bandeja_filtros_${bandejaKey}`
}

function leerStorage(bandejaKey: string): Partial<BandejaFiltrosState> | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(storageKey(bandejaKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BandejaFiltrosState>
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function escribirStorage(bandejaKey: string, state: BandejaFiltrosState) {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(storageKey(bandejaKey), JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Filtros de bandeja con persistencia en sessionStorage por clave (modo / bandeja).
 */
export function useBandejaFiltros(bandejaKey: string) {
  const defaults = defaultsBandejaFiltros()
  const saved = leerStorage(bandejaKey)

  const criterio = ref(typeof saved?.criterio === 'string' ? saved.criterio : defaults.criterio)
  const hojaRuta = ref(
    typeof saved?.hoja_ruta === 'string' ? saved.hoja_ruta : defaults.hoja_ruta,
  )
  const gestion = ref(
    typeof saved?.gestion === 'number' && saved.gestion >= 2000
      ? saved.gestion
      : defaults.gestion,
  )
  const procId = ref<number | null>(
    typeof saved?.proc_id === 'number' && saved.proc_id > 0 ? saved.proc_id : null,
  )

  const snapshot = (): BandejaFiltrosState => ({
    criterio: criterio.value,
    hoja_ruta: hojaRuta.value,
    gestion: gestion.value,
    proc_id: procId.value && procId.value > 0 ? procId.value : null,
  })

  const persistir = () => {
    escribirStorage(bandejaKey, snapshot())
  }

  const limpiar = () => {
    const d = defaultsBandejaFiltros()
    criterio.value = d.criterio
    hojaRuta.value = d.hoja_ruta
    gestion.value = d.gestion
    procId.value = d.proc_id
    persistir()
  }

  return {
    criterio,
    hojaRuta,
    gestion,
    procId,
    snapshot,
    persistir,
    limpiar,
    opcionesGestion: opcionesGestionBandeja(),
  }
}

export type UseBandejaFiltrosReturn = {
  criterio: Ref<string>
  hojaRuta: Ref<string>
  gestion: Ref<number>
  procId: Ref<number | null>
  snapshot: () => BandejaFiltrosState
  persistir: () => void
  limpiar: () => void
  opcionesGestion: Array<{ label: string; value: number }>
}
