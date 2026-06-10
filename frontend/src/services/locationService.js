// Vietnam Province API service
// Data: https://github.com/open-admin-data/vietnam-administrative-divisions
// In-memory cache — fetches from GitHub CDN once

const HIERARCHY_URL =
  'https://raw.githubusercontent.com/open-admin-data/vietnam-administrative-divisions/main/data/hierarchy.json'

const cache = {
  hierarchy: null,     // full hierarchy.json
  provinces: null,     // [{value, label}]
  wardsByProvince: {}, // { provinceCode: [{value, label}] }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

const normalizeCode = (code) => {
  if (code == null) return ''
  const str = String(code).trim()
  // Pad to 2 digits for backward compat with old "01" codes
  return str.length === 1 ? `0${str}` : str
}

const loadHierarchy = async () => {
  if (cache.hierarchy) return cache.hierarchy

  try {
    const res = await fetch(HIERARCHY_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    cache.hierarchy = json.data || []
    return cache.hierarchy
  } catch (err) {
    console.error('[locationService] loadHierarchy failed:', err)
    return []
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch all provinces. Cached after first call.
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export const fetchProvinces = async () => {
  if (cache.provinces) return cache.provinces

  const data = await loadHierarchy()
  if (!data.length) return []

  cache.provinces = data.map((p) => ({
    value: p.code.id,
    label: p.name.local,
  }))
  return cache.provinces
}

/**
 * Fetch districts — returns empty (district level abolished July 2025).
 * Kept for backward-compatible API signature.
 * @returns {Promise<Array>}
 */
export const fetchDistricts = async () => {
  return []
}

/**
 * Fetch wards for a given province code.
 * Cached per province. Uses hierarchy.json (province → ward direct).
 * @param {string|number} provinceCode
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export const fetchWards = async (provinceCode) => {
  if (!provinceCode) return []
  const code = normalizeCode(provinceCode)

  if (cache.wardsByProvince[code]) return cache.wardsByProvince[code]

  const data = await loadHierarchy()
  const province = data.find((p) => p.code.id === code)

  if (!province || !province.ward) {
    cache.wardsByProvince[code] = []
    return []
  }

  cache.wardsByProvince[code] = province.ward.map((w) => ({
    value: w.code.id,
    label: w.name.local,
  }))
  return cache.wardsByProvince[code]
}
