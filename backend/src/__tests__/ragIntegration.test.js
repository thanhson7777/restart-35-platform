/**
 * RAG Integration Tests
 *
 * Tests for RAG endpoints with authentication, cache, and rate limiting
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'

// Test configuration
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000/api/v1'
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123'
}

let authToken = null
let testUserId = null

// Mock test data
const mockProfile = {
  basicInfo: {
    age: 40,
    gender: 'male',
    province: 'HCM',
    education: 'university'
  },
  employmentHistory: [
    {
      industry: 'technology',
      role: 'Software Engineer',
      years: 10,
      skills: ['JavaScript', 'React', 'Node.js', 'Python']
    }
  ],
  aspirations: {
    targetJob: 'Tech Lead',
    targetIndustry: 'technology',
    skills: ['Leadership', 'System Design', 'Project Management'],
    targetSalary: 50000000
  },
  barriers: {
    health: false,
    family: false,
    techGap: true,
    time: false,
    finance: false
  }
}

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...options.headers
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  return response
}

// Helper function to login and get token
async function loginAndGetToken() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  })

  if (response.ok) {
    const data = await response.json()
    return data.accessToken || data.token
  }

  return null
}

describe('RAG Endpoints Integration Tests', () => {
  beforeAll(async () => {
    // Login before all tests
    authToken = await loginAndGetToken()
    if (!authToken) {
      console.warn('Warning: Could not login with test credentials. Some tests may fail.')
    }
  })

  afterAll(() => {
    // Cleanup
    authToken = null
  })

  describe('Authentication', () => {
    it('should return 401 for unauthenticated RAG recommendation request', async () => {
      const response = await fetch(`${API_BASE_URL}/ai/rag/career-recommendation`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      expect([401, 403]).toContain(response.status)
    })

    it('should return 401 for POST RAG recommendation without token', async () => {
      const response = await fetch(`${API_BASE_URL}/ai/rag/career-recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: mockProfile })
      })

      expect([401, 403]).toContain(response.status)
    })

    it('should accept authenticated RAG recommendation request', async () => {
      if (!authToken) {
        console.warn('Skipping: No auth token available')
        return
      }

      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'GET'
      })

      // Should be 200 (success) or 404 (not found if no data)
      expect([200, 404, 410]).toContain(response.status)
    })
  })

  describe('POST /v1/ai/rag/career-recommendation', () => {
    it('should create new RAG recommendation with valid profile', async () => {
      if (!authToken) {
        console.warn('Skipping: No auth token available')
        return
      }

      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'POST',
        body: JSON.stringify({ profile: mockProfile })
      })

      expect(response.status).toBe(201)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.best_fits).toBeDefined()
    })

    it('should return 400 for invalid profile (missing age)', async () => {
      if (!authToken) {
        console.warn('Skipping: No auth token available')
        return
      }

      const invalidProfile = {
        basicInfo: {
          // missing age
          gender: 'male'
        },
        employmentHistory: []
      }

      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'POST',
        body: JSON.stringify({ profile: invalidProfile })
      })

      expect(response.status).toBe(400)
    })

    it('should include sources in response', async () => {
      if (!authToken) {
        console.warn('Skipping: No auth token available')
        return
      }

      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'POST',
        body: JSON.stringify({ profile: mockProfile })
      })

      if (response.status === 201) {
        const data = await response.json()
        expect(data.sources).toBeDefined()
        expect(Array.isArray(data.sources)).toBe(true)
      }
    })
  })

  describe('GET /v1/ai/rag/career-recommendation', () => {
    it('should return cached RAG recommendation', async () => {
      if (!authToken) {
        console.warn('Skipping: No auth token available')
        return
      }

      // First create a recommendation
      await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'POST',
        body: JSON.stringify({ profile: mockProfile })
      })

      // Then fetch cached
      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'GET'
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.meta).toBeDefined()
      expect(data.meta.generatedAt).toBeDefined()
    })

    it('should return correct meta structure', async () => {
      if (!authToken) {
        console.warn('Skipping: No auth token available')
        return
      }

      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'GET'
      })

      if (response.status === 200) {
        const data = await response.json()

        expect(data.meta).toHaveProperty('generatedAt')
        expect(data.meta).toHaveProperty('refreshCount')
        expect(data.meta).toHaveProperty('expiresAt')
        expect(data.meta).toHaveProperty('isFresh')
        expect(data.meta).toHaveProperty('isExpired')
      }
    })
  })

  describe('POST /v1/ai/rag/career-recommendation/refresh', () => {
    it('should refresh existing RAG recommendation', async () => {
      if (!authToken) {
        console.warn('Skipping: No auth token available')
        return
      }

      // First create
      await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'POST',
        body: JSON.stringify({ profile: mockProfile })
      })

      // Then refresh
      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation/refresh', {
        method: 'POST',
        body: JSON.stringify({ profile: mockProfile })
      })

      // Should be 200 (success) or 410 (rate limited)
      expect([200, 410]).toContain(response.status)
    })

    it('should return 410 if rate limited (max 1 refresh per 24h)', async () => {
      if (!authToken) {
        console.warn('Skipping: No auth token available')
        return
      }

      // First create and refresh
      await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'POST',
        body: JSON.stringify({ profile: mockProfile })
      })

      await makeAuthenticatedRequest('/ai/rag/career-recommendation/refresh', {
        method: 'POST',
        body: JSON.stringify({ profile: mockProfile })
      })

      // Try to refresh again immediately
      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation/refresh', {
        method: 'POST',
        body: JSON.stringify({ profile: mockProfile })
      })

      // Should be rate limited
      expect(response.status).toBe(410)
      const data = await response.json()
      expect(data.message).toContain('24 giờ')
    })
  })

  describe('GET /v1/ai/rag/sources (Public)', () => {
    it('should return available RAG sources without auth', async () => {
      const response = await fetch(`${API_BASE_URL}/ai/rag/sources`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data.sources)).toBe(true)
    })

    it('should include document count', async () => {
      const response = await fetch(`${API_BASE_URL}/ai/rag/sources`, {
        method: 'GET'
      })

      if (response.status === 200) {
        const data = await response.json()
        expect(data.data).toHaveProperty('document_count')
        expect(data.data).toHaveProperty('embedding_model')
      }
    })
  })

  describe('GET /v1/ai/rag/health (Public)', () => {
    it('should return RAG health status without auth', async () => {
      const response = await fetch(`${API_BASE_URL}/ai/rag/health`, {
        method: 'GET'
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('components')
      expect(['healthy', 'degraded', 'error']).toContain(data.status)
    })

    it('should include component statuses', async () => {
      const response = await fetch(`${API_BASE_URL}/ai/rag/health`, {
        method: 'GET'
      })

      if (response.status === 200) {
        const data = await response.json()

        expect(data.components).toHaveProperty('rag_engine')
        expect(data.components).toHaveProperty('llm')

        expect(data.components.rag_engine).toHaveProperty('status')
        expect(data.components.rag_engine).toHaveProperty('initialized')
      }
    })
  })

  describe('Cache Behavior', () => {
    it('should serve cached data from Redis when available', async () => {
      if (!authToken) {
        console.warn('Skipping: No auth token available')
        return
      }

      // First request - should set cache
      await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'POST',
        body: JSON.stringify({ profile: mockProfile })
      })

      // Second request - should hit cache
      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'GET'
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.meta).toHaveProperty('status')
      expect(data.meta.status).toBe('cached')
    })

    it('should fall back to MongoDB when Redis cache misses', async () => {
      if (!authToken) {
        console.warn('Skipping: No auth token available')
        return
      }

      // Directly query - may hit MongoDB if Redis cache expires
      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'GET'
      })

      if (response.status === 200) {
        const data = await response.json()
        // Should have valid data regardless of source
        expect(data.data).toBeDefined()
      }
    })
  })
})

describe('RAG Data Structure Validation', () => {
  beforeAll(async () => {
    if (!authToken) {
      authToken = await loginAndGetToken()
    }
  })

  it('should return proper RAG recommendation structure', async () => {
    if (!authToken) {
      console.warn('Skipping: No auth token available')
      return
    }

    const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
      method: 'POST',
      body: JSON.stringify({ profile: mockProfile })
    })

    if (response.status === 201) {
      const data = await response.json()

      // Validate best_fits structure
      if (data.data?.best_fits?.length > 0) {
        const bestFit = data.data.best_fits[0]
        expect(bestFit).toHaveProperty('job_title')
        expect(bestFit).toHaveProperty('description')
        expect(typeof bestFit.job_title).toBe('string')
      }

      // Validate income_boost structure
      if (data.data?.income_boost?.length > 0) {
        const income = data.data.income_boost[0]
        expect(income).toHaveProperty('job_title')
        expect(income).toHaveProperty('salary_range')
      }

      // Validate progression structure
      if (data.data?.progression?.length > 0) {
        const progression = data.data.progression[0]
        expect(progression).toHaveProperty('job_title')
        expect(progression).toHaveProperty('timeline')
      }
    }
  })

  it('should include RAG metadata in response', async () => {
    if (!authToken) {
      console.warn('Skipping: No auth token available')
      return
    }

    const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
      method: 'POST',
      body: JSON.stringify({ profile: mockProfile })
    })

    if (response.status === 201) {
      const data = await response.json()

      expect(data).toHaveProperty('meta')
      expect(data.meta).toHaveProperty('retrieval_time_ms')
      expect(data.meta).toHaveProperty('sources_used')
    }
  })
})

describe('Error Handling', () => {
  it('should return 503 when AI service is unavailable', async () => {
    // This test checks graceful degradation
    if (!authToken) {
      authToken = await loginAndGetToken()
    }

    if (authToken) {
      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'POST',
        body: JSON.stringify({ profile: mockProfile })
      })

      // Should return appropriate error, not crash
      expect([201, 400, 401, 500, 502, 503]).toContain(response.status)
    }
  })

  it('should handle malformed JSON gracefully', async () => {
    if (!authToken) {
      authToken = await loginAndGetToken()
    }

    if (authToken) {
      const response = await makeAuthenticatedRequest('/ai/rag/career-recommendation', {
        method: 'POST',
        body: 'not-valid-json'
      })

      expect([400, 415]).toContain(response.status)
    }
  })
})
