import type { RouterConfig } from '@nuxt/schema'

// Custom router options to safely handle scrollBehavior with URL fragments/hashes
// particularly when Keycloak returns tokens or state containing special characters in hash/query
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    if (to.hash) {
      // Validate that hash can be queried safely with CSS.escape
      const id = to.hash.replace(/^#/, '')
      if (id) {
        try {
          const element = document.getElementById(id) || document.querySelector(`#${CSS.escape(id)}`)
          if (element) {
            return {
              el: `#${CSS.escape(id)}`,
              behavior: 'smooth'
            }
          }
        } catch {
          // If selector is invalid or parsing fails, fallback gracefully
          return { top: 0 }
        }
      }
      return { top: 0 }
    }

    return { top: 0 }
  }
}
