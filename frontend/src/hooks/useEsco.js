import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from './useToast'
import { publicAxiosInstance } from '~/utils/authorizeAxios'

const API_BASE = '/v1/esco'

// Fetch function with error handling
const fetchEsco = async (url) => {
  const res = await publicAxiosInstance.get(`${API_BASE}${url}`)
  return res.data
}

/**
 * Hook for searching occupations with debounce
 */
export function useEscoSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [total, setTotal] = useState(0)
  const toast = useToast()

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Fetch when debounced query changes
  useEffect(() => {
    const searchOccupations = async () => {
      if (debouncedQuery.length < 2) {
        setResults([])
        setTotal(0)
        return
      }

      setIsLoading(true)
      setIsError(false)

      try {
        const response = await fetchEsco(`/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`)
        if (response.success) {
          setResults(response.data.results || [])
          setTotal(response.data.total || 0)
        }
      } catch (error) {
        console.error('ESCO search error:', error)
        setIsError(true)
        toast.error('Không thể tìm kiếm nghề nghiệp')
      } finally {
        setIsLoading(false)
      }
    }

    searchOccupations()
  }, [debouncedQuery])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setTotal(0)
  }, [])

  return {
    query,
    setQuery,
    results,
    isLoading,
    isError,
    total,
    clear
  }
}

/**
 * Hook for getting occupation details
 */
export function useOccupationDetails(uri) {
  const [occupation, setOccupation] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!uri) {
      setOccupation(null)
      return
    }

    const getDetails = async () => {
      setIsLoading(true)
      setIsError(false)

      try {
        const response = await fetchEsco(`/occupation/${encodeURIComponent(uri)}`)
        if (response.success) {
          setOccupation(response.data)
        }
      } catch (error) {
        console.error('Get occupation error:', error)
        setIsError(true)
        toast.error('Không thể lấy thông tin nghề nghiệp')
      } finally {
        setIsLoading(false)
      }
    }

    getDetails()
  }, [uri])

  return {
    occupation,
    isLoading,
    isError
  }
}

/**
 * Hook for getting skills of an occupation
 */
export function useOccupationSkills(uri, options = {}) {
  const { essentialOnly = false, limit = 50 } = options
  const [skills, setSkills] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!uri) {
      setSkills(null)
      return
    }

    const getSkills = async () => {
      setIsLoading(true)
      setIsError(false)

      try {
        const params = new URLSearchParams({
          essentialOnly: essentialOnly.toString(),
          limit: limit.toString()
        })
        const response = await fetchEsco(`/occupation/${encodeURIComponent(uri)}/skills?${params}`)
        if (response.success) {
          setSkills(response.data)
        }
      } catch (error) {
        console.error('Get skills error:', error)
        setIsError(true)
        toast.error('Không thể lấy danh sách kỹ năng')
      } finally {
        setIsLoading(false)
      }
    }

    getSkills()
  }, [uri, essentialOnly, limit])

  return {
    skills,
    essentialSkills: skills?.essentialSkills || [],
    optionalSkills: skills?.optionalSkills || [],
    totalCount: skills?.totalCount || 0,
    isLoading,
    isError
  }
}

/**
 * Hook for getting popular occupations
 */
export function usePopularOccupations(limit = 10) {
  const [popular, setPopular] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const getPopular = async () => {
      setIsLoading(true)
      setIsError(false)

      try {
        const response = await fetchEsco(`/occupation/popular?limit=${limit}`)
        if (response.success) {
          setPopular(response.data || [])
        }
      } catch (error) {
        console.error('Get popular error:', error)
        setIsError(true)
      } finally {
        setIsLoading(false)
      }
    }

    getPopular()
  }, [limit])

  return {
    popular,
    isLoading,
    isError
  }
}

/**
 * Hook for tracking occupation usage
 */
export function useTrackOccupation() {
  const [isTracking, setIsTracking] = useState(false)
  const toast = useToast()

  const track = useCallback(async (uri) => {
    setIsTracking(true)
    try {
      await fetchEsco(`/track`)
    } catch (error) {
      // Silent fail for tracking
      console.error('Track occupation error:', error)
    } finally {
      setIsTracking(false)
    }
  }, [])

  return { track, isTracking }
}

/**
 * Combined hook for occupation search and selection
 */
export function useOccupationSelect(initialValue = null) {
  const [selected, setSelected] = useState(initialValue)
  const [isOpen, setIsOpen] = useState(false)

  const search = useEscoSearch()
  const { occupation: details, isLoading: detailsLoading } = useOccupationDetails(selected?.uri)

  const select = useCallback((occupation) => {
    setSelected(occupation)
    setIsOpen(false)
  }, [])

  const clear = useCallback(() => {
    setSelected(null)
    search.clear()
  }, [search])

  return {
    selected,
    select,
    clear,
    isOpen,
    setIsOpen,
    search,
    details,
    detailsLoading
  }
}
