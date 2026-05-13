/**
 * AI Slice Unit Tests
 *
 * Tests for RAG Career Recommendation thunks, reducers, and selectors
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import aiReducer, {
  // Actions
  clearRAGRecommendation,
  setRAGRecommendation,
  resetAIState,
  // Thunks
  triggerRAGRecommendation,
  fetchCachedRAGRecommendation,
  refreshRAGRecommendation,
  fetchRAGSources,
  fetchRAGHealth,
  // Selectors
  selectRAGRecommendation,
  selectRAGLoading,
  selectRAGError,
  selectRAGSources,
  selectRAGHealth,
  selectRAGGeneratedAt,
  selectRAGIsFresh,
  selectBestFits,
  selectIncomeBoost,
  selectProgression
} from '@/redux/ai/aiSlice'

// Mock API functions
vi.mock('@/apis/aiAPI', () => ({
  triggerRAGCareerRecommendationAPI: vi.fn(),
  getCachedRAGRecommendationAPI: vi.fn(),
  refreshRAGRecommendationAPI: vi.fn(),
  getRAGSourcesAPI: vi.fn(),
  getRAGHealthAPI: vi.fn()
}))

describe('AI Slice - RAG State Management', () => {
  let store

  beforeEach(() => {
    store = configureStore({
      reducer: {
        ai: aiReducer
      }
    })
  })

  describe('Initial State', () => {
    it('should have correct initial RAG state', () => {
      const state = store.getState().ai

      expect(state.ragRecommendation).toBeNull()
      expect(state.ragLoading).toBe(false)
      expect(state.ragError).toBeNull()
      expect(state.ragSources).toEqual([])
      expect(state.ragHealth).toBeNull()
      expect(state.ragGeneratedAt).toBeNull()
      expect(state.ragRefreshCount).toBe(0)
      expect(state.ragExpiresAt).toBeNull()
      expect(state.ragIsFresh).toBeNull()
      expect(state.ragIsExpired).toBeNull()
    })
  })

  describe('RAG Actions', () => {
    it('should clear RAG recommendation', () => {
      // First set a recommendation
      store.dispatch(setRAGRecommendation({ best_fits: [{ title: 'Test' }] }))
      expect(selectRAGRecommendation(store.getState())).not.toBeNull()

      // Then clear it
      store.dispatch(clearRAGRecommendation())
      expect(selectRAGRecommendation(store.getState())).toBeNull()
      expect(selectRAGError(store.getState())).toBeNull()
    })

    it('should set RAG recommendation', () => {
      const mockRecommendation = {
        best_fits: [{ job_title: 'Software Engineer', score: 0.9 }],
        income_boost: [{ job_title: 'Tech Lead', score: 0.85 }],
        progression: [{ job_title: 'Manager', score: 0.8 }]
      }

      store.dispatch(setRAGRecommendation(mockRecommendation))

      const state = store.getState().ai
      expect(state.ragRecommendation).toEqual(mockRecommendation)
      expect(state.ragError).toBeNull()
    })

    it('should reset all AI state including RAG', () => {
      // Set some RAG state
      store.dispatch(setRAGRecommendation({ best_fits: [] }))
      store.dispatch(fetchRAGSources.fulfilled({ data: { sources: ['test.json'] } }))

      // Reset
      store.dispatch(resetAIState())

      const state = store.getState().ai
      expect(state.ragRecommendation).toBeNull()
      expect(state.ragSources).toEqual([])
    })
  })

  describe('RAG Selectors', () => {
    it('should select RAG recommendation', () => {
      const mockData = { best_fits: [{ title: 'Test' }] }
      store.dispatch(setRAGRecommendation(mockData))

      expect(selectRAGRecommendation(store.getState())).toEqual(mockData)
    })

    it('should select RAG loading state', () => {
      expect(selectRAGLoading(store.getState())).toBe(false)
    })

    it('should select RAG error', () => {
      expect(selectRAGError(store.getState())).toBeNull()
    })

    it('should select RAG sources', () => {
      expect(selectRAGSources(store.getState())).toEqual([])
    })

    it('should select best fits', () => {
      const mockData = {
        best_fits: [{ job_title: 'DevOps', match_score: 0.95 }],
        income_boost: [],
        progression: []
      }
      store.dispatch(setRAGRecommendation(mockData))

      expect(selectBestFits(store.getState())).toEqual(mockData.best_fits)
    })

    it('should select income boost', () => {
      const mockData = {
        best_fits: [],
        income_boost: [{ job_title: 'Manager', score: 0.9 }],
        progression: []
      }
      store.dispatch(setRAGRecommendation(mockData))

      expect(selectIncomeBoost(store.getState())).toEqual(mockData.income_boost)
    })

    it('should select progression', () => {
      const mockData = {
        best_fits: [],
        income_boost: [],
        progression: [{ job_title: 'Director', score: 0.85 }]
      }
      store.dispatch(setRAGRecommendation(mockData))

      expect(selectProgression(store.getState())).toEqual(mockData.progression)
    })

    it('should return empty array for missing fields', () => {
      store.dispatch(setRAGRecommendation(null))

      expect(selectBestFits(store.getState())).toEqual([])
      expect(selectIncomeBoost(store.getState())).toEqual([])
      expect(selectProgression(store.getState())).toEqual([])
    })

    it('should select RAG metadata', () => {
      expect(selectRAGGeneratedAt(store.getState())).toBeNull()
      expect(selectRAGIsFresh(store.getState())).toBeNull()
    })
  })

  describe('RAG Thunks', () => {
    it('should handle fetchRAGSources.fulfilled', async () => {
      const mockSources = {
        data: {
          sources: ['salary_benchmarks.json', 'industry_trends.json', 'skill_matrix.json']
        }
      }

      await store.dispatch(fetchRAGSources.fulfilled(mockSources))

      const state = store.getState().ai
      expect(state.ragSources).toEqual(mockSources.data.sources)
      expect(state.ragLoading).toBe(false)
    })

    it('should handle fetchRAGHealth.fulfilled', async () => {
      const mockHealth = {
        status: 'healthy',
        components: {
          rag_engine: { status: 'ok', initialized: true, document_count: 100 },
          llm: { status: 'ok', available: true }
        }
      }

      await store.dispatch(fetchRAGHealth.fulfilled(mockHealth))

      const state = store.getState().ai
      expect(state.ragHealth).toEqual(mockHealth)
    })
  })

  describe('RAG Data Structure', () => {
    it('should handle complete RAG recommendation response', () => {
      const completeRAGData = {
        best_fits: [
          {
            job_title: 'Senior Software Engineer',
            description: 'Phù hợp với kỹ năng hiện tại của bạn',
            salary_range: '30-50 triệu',
            timeline_months: 12,
            match_score: 0.92,
            learning_path: ['AWS', 'Kubernetes', 'System Design'],
            sources: ['salary_benchmarks.json']
          }
        ],
        income_boost: [
          {
            job_title: 'Tech Lead',
            description: 'Tăng thu nhập 30%',
            salary_range: '50-70 triệu',
            timeline_months: 24,
            match_score: 0.85
          }
        ],
        progression: [
          {
            job_title: 'Engineering Manager',
            description: 'Lộ trình thăng tiến dài hạn',
            salary_range: '60-100 triệu',
            timeline_months: 36,
            match_score: 0.78
          }
        ]
      }

      store.dispatch(setRAGRecommendation(completeRAGData))

      const bestFits = selectBestFits(store.getState())
      const incomeBoost = selectIncomeBoost(store.getState())
      const progression = selectProgression(store.getState())

      expect(bestFits).toHaveLength(1)
      expect(bestFits[0].job_title).toBe('Senior Software Engineer')
      expect(bestFits[0].match_score).toBe(0.92)
      expect(bestFits[0].learning_path).toContain('AWS')

      expect(incomeBoost).toHaveLength(1)
      expect(incomeBoost[0].salary_range).toBe('50-70 triệu')

      expect(progression).toHaveLength(1)
      expect(progression[0].timeline_months).toBe(36)
    })

    it('should handle minimal RAG data', () => {
      const minimalData = {
        best_fits: [{ job_title: 'Simple Job' }],
        income_boost: [],
        progression: []
      }

      store.dispatch(setRAGRecommendation(minimalData))

      expect(selectBestFits(store.getState())).toHaveLength(1)
      expect(selectIncomeBoost(store.getState())).toHaveLength(0)
      expect(selectProgression(store.getState())).toHaveLength(0)
    })
  })
})

describe('AI Slice - Error Handling', () => {
  let store

  beforeEach(() => {
    store = configureStore({
      reducer: {
        ai: aiReducer
      }
    })
  })

  it('should handle fetchCachedRAGRecommendation.rejected', () => {
    // Simulate rejected action with rejectWithValue
    const errorMessage = 'Network error'

    store.dispatch({
      type: 'ai/fetchCachedRAGRecommendation/rejected',
      payload: errorMessage
    })

    const state = store.getState().ai
    expect(state.ragLoading).toBe(false)
    expect(state.ragError).toBe(errorMessage)
  })

  it('should handle triggerRAGRecommendation.pending', () => {
    store.dispatch({
      type: 'ai/triggerRAGRecommendation/pending'
    })

    const state = store.getState().ai
    expect(state.ragLoading).toBe(true)
    expect(state.ragError).toBeNull()
  })

  it('should handle triggerRAGRecommendation.rejected', () => {
    const errorPayload = 'Failed to generate recommendation'

    store.dispatch({
      type: 'ai/triggerRAGRecommendation/rejected',
      payload: errorPayload
    })

    const state = store.getState().ai
    expect(state.ragLoading).toBe(false)
    expect(state.ragError).toBe(errorPayload)
  })

  it('should handle refreshRAGRecommendation with rate limit', () => {
    const rateLimitError = 'Đã refresh gần đây. Vui lòng chờ 24 giờ.'

    store.dispatch({
      type: 'ai/refreshRAGRecommendation/rejected',
      payload: rateLimitError
    })

    const state = store.getState().ai
    expect(state.ragLoading).toBe(false)
    expect(state.ragError).toBe(rateLimitError)
  })
})

describe('AI Slice - Cached Data Metadata', () => {
  let store

  beforeEach(() => {
    store = configureStore({
      reducer: {
        ai: aiReducer
      }
    })
  })

  it('should update metadata from cached response', async () => {
    const cachedResponse = {
      success: true,
      data: {
        best_fits: [{ job_title: 'Cached Job' }],
        income_boost: [],
        progression: []
      },
      meta: {
        generatedAt: '2024-01-15T10:30:00Z',
        refreshCount: 2,
        expiresAt: '2024-01-16T10:30:00Z',
        isFresh: true,
        isExpired: false,
        status: 'cached'
      }
    }

    await store.dispatch(fetchCachedRAGRecommendation.fulfilled(cachedResponse))

    const state = store.getState().ai
    expect(state.ragRecommendation).toEqual(cachedResponse.data)
    expect(state.ragGeneratedAt).toBe(cachedResponse.meta.generatedAt)
    expect(state.ragRefreshCount).toBe(cachedResponse.meta.refreshCount)
    expect(state.ragExpiresAt).toBe(cachedResponse.meta.expiresAt)
    expect(state.ragIsFresh).toBe(true)
    expect(state.ragIsExpired).toBe(false)
  })

  it('should handle no cached data response', () => {
    // Simulate fulfilled action with proper payload structure
    const noCacheResponse = {
      success: true,
      data: null,
      meta: {
        hasData: false,
        generatedAt: null,
        isFresh: false  // Add isFresh to match expected behavior
      }
    }

    store.dispatch({
      type: 'ai/fetchCachedRAGRecommendation/fulfilled',
      payload: noCacheResponse
    })

    const state = store.getState().ai
    expect(state.ragRecommendation).toBeNull()
    expect(state.ragIsFresh).toBe(false)
  })
})
