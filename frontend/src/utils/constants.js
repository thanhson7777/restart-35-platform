let backendUrl = ''
let aiServiceUrl = ''

if (import.meta.env.MODE === 'development' || import.meta.env.VITE_BUILD_MODE === 'dev') {
  backendUrl = 'http://localhost:8017'
  aiServiceUrl = 'http://localhost:8000'
}

export const API_ROOT = backendUrl
export const AI_SERVICE_ROOT = aiServiceUrl
export const DEFAULT_PAGE = 1
export const DEFAULT_ITEM_PER_PAGE = 10
