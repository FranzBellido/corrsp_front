/**
 * keycloak-js usa crypto.randomUUID() para state/nonce del login.
 * En contextos no seguros (http://192.168.x.x) el navegador no expone randomUUID.
 * getRandomValues sí está disponible en HTTP; esto evita el fallo en LAN sin TLS.
 * En producción conviene servir el front con HTTPS.
 */
export function ensureCryptoRandomUuid(): void {
  if (!import.meta.client) {
    return
  }

  const cryptoRef = globalThis.crypto
  if (!cryptoRef || typeof cryptoRef.getRandomValues !== 'function') {
    return
  }

  if (typeof cryptoRef.randomUUID === 'function') {
    return
  }

  cryptoRef.randomUUID = function randomUUID(): string {
    const bytes = new Uint8Array(16)
    cryptoRef.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
}
