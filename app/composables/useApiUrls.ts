export function useApiUrls() {
  const config = useRuntimeConfig()
  const apiBaseUrl = config.public.apiBaseUrl as string
  const onlyOfficeServer = config.public.onlyOfficeServer as string
  const configuredPublic = (config.public.apiPublicUrl as string) || ''

  const apiPublicUrl = configuredPublic || publicUrlForOnlyOffice(apiBaseUrl, onlyOfficeServer)

  return { apiBaseUrl, apiPublicUrl }
}

function publicUrlForOnlyOffice(apiBaseUrl: string, onlyOfficeServer: string) {
  try {
    const api = new URL(apiBaseUrl)
    if (api.hostname === 'localhost' || api.hostname === '127.0.0.1') {
      const onlyOffice = new URL(onlyOfficeServer)
      api.hostname = onlyOffice.hostname
      return api.origin
    }
    return api.origin
  } catch {
    return apiBaseUrl
  }
}
