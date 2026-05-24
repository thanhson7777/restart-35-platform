import axios from 'axios'
import { escoOccupationModel } from '~/models/escoOccupationModel'
import { escoSkillModel } from '~/models/escoSkillModel'
import { escoTranslationOverrideModel } from '~/models/escoTranslationOverrideModel'

const ESCO_API_BASE = 'https://ec.europa.eu/esco/api'
const ESCO_API_TIMEOUT = 10000

class EscoService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: ESCO_API_BASE,
      timeout: ESCO_API_TIMEOUT,
      headers: {
        'Accept': 'application/json'
      }
    })
  }

  /**
   * Search occupations - Cache first, fallback to ESCO API
   */
  async searchOccupations(query, options = {}) {
    const { lang = 'vi', limit = 20, offset = 0 } = options

    // 1. Search in local database first
    const localResults = await escoOccupationModel.search(query, { lang, limit, offset })

    if (localResults.results.length > 0) {
      return {
        total: localResults.total,
        offset,
        limit,
        results: this.formatOccupations(localResults.results, lang),
        source: 'cache'
      }
    }

    // 2. Fallback to ESCO API
    try {
      const apiResults = await this.callEscoApi('/search', {
        text: query,
        type: 'occupation',
        language: 'en',
        limit,
        page: Math.floor(offset / limit)
      })

      const items = apiResults._embedded?.results || []

      // Store results for future caching
      if (items.length > 0) {
        await this.storeOccupations(items)
      }

      return {
        total: apiResults.total || items.length || 0,
        offset,
        limit,
        results: items.map(item => this.formatEscoItem(item)),
        source: 'api'
      }
    } catch (error) {
      console.error('[EscoService] ESCO API search failed:', error.message)
      // Return empty results instead of error to allow frontend to handle gracefully
      return {
        total: 0,
        offset,
        limit,
        results: [],
        source: 'error',
        error: error.message
      }
    }
  }

  /**
   * Get occupation details by URI
   */
  async getOccupationDetails(uri, options = {}) {
    const { lang = 'vi', includeSkills = true } = options

    // 1. Try local database
    const local = await escoOccupationModel.findByUri(uri)

    if (local) {
      return this.formatOccupationDetails(local, lang, includeSkills)
    }

    // 2. Fallback to ESCO API
    try {
      const apiData = await this.callEscoApi('/resource/occupation', {
        uri,
        language: 'en'
      })

      if (apiData) {
        await this.storeOccupation(apiData)
        return this.formatOccupationDetails(apiData, lang, includeSkills)
      }
    } catch (error) {
      console.error('[EscoService] Failed to get occupation details:', error.message)
    }

    return null
  }

  /**
   * Get skills for an occupation (prioritized: essential first)
   */
  async getOccupationSkills(uri, options = {}) {
    const { lang = 'vi', essentialOnly = false, limit = 50 } = options

    // 1. Get from local database
    const localSkills = await escoSkillModel.getByOccupation(uri, { limit })

    if (localSkills.total > 0) {
      return {
        occupationUri: uri,
        essentialSkills: this.formatSkills(localSkills.essentialSkills, lang),
        optionalSkills: this.formatSkills(localSkills.optionalSkills, lang),
        totalCount: localSkills.total,
        essentialCount: localSkills.essentialCount,
        optionalCount: localSkills.optionalCount,
        source: 'cache'
      }
    }

    // 2. Get from occupation details and fetch skills
    const occupation = await this.getOccupationDetails(uri, { includeSkills: true })

    if (occupation?.essentialSkills?.length > 0 || occupation?.optionalSkills?.length > 0) {
      // Fetch skill details from ESCO if needed
      const allSkillUris = [
        ...(occupation.essentialSkills || []),
        ...(occupation.optionalSkills || [])
      ]

      const skills = await this.fetchSkillsDetails(allSkillUris)

      const essentialSkills = skills.filter(s =>
        occupation.essentialSkills?.includes(s.escoUri)
      )
      const optionalSkills = skills.filter(s =>
        occupation.optionalSkills?.includes(s.escoUri)
      )

      return {
        occupationUri: uri,
        essentialSkills: this.formatSkills(essentialSkills, lang),
        optionalSkills: this.formatSkills(optionalSkills, lang),
        totalCount: skills.length,
        essentialCount: essentialSkills.length,
        optionalCount: optionalSkills.length,
        source: 'api'
      }
    }

    return {
      occupationUri: uri,
      essentialSkills: [],
      optionalSkills: [],
      totalCount: 0,
      essentialCount: 0,
      optionalCount: 0,
      source: 'empty'
    }
  }

  /**
   * Get popular occupations
   */
  async getPopularOccupations(limit = 10) {
    const popular = await escoOccupationModel.getPopular(limit)
    return popular.map(occ => ({
      uri: occ.escoUri,
      code: occ.code,
      titleEn: occ.titleEn,
      titleVi: occ.titleVi,
      popularity: occ.popularity
    }))
  }

  /**
   * Track occupation usage (increment popularity)
   */
  async trackOccupationUsage(uri) {
    await escoOccupationModel.incrementPopularity(uri)
  }

  /**
   * Translate text using LLM with fallback to override table
   */
  async translateText(text, targetLang = 'vi') {
    if (targetLang !== 'vi') {
      return text
    }

    // 1. Check override table first
    const override = await escoTranslationOverrideModel.findByOriginalText(text, targetLang)
    if (override?.overrideText) {
      return override.overrideText
    }

    // 2. Return original if no translation available
    return text
  }

  /**
   * Batch translate occupation titles
   */
  async batchTranslateOccupations(occupations) {
    const results = await Promise.all(
      occupations.map(async (occ) => {
        const titleVi = await this.translateText(occ.titleEn, 'vi')
        const descriptionVi = occ.descriptionEn
          ? await this.translateText(occ.descriptionEn, 'vi')
          : ''

        return {
          ...occ,
          titleVi,
          descriptionVi,
          translationStatus: titleVi !== occ.titleEn ? 'llm' : 'pending'
        }
      })
    )

    return results
  }

  /**
   * Sync all ESCO data (admin function)
   */
  async syncAllData(options = {}) {
    const { batchSize = 100, startOffset = 0 } = options
    let offset = startOffset
    let totalSynced = 0
    let keepRunning = true

    console.log('[EscoService] Starting ESCO data sync...')

    while (keepRunning) {
      try {
        const results = await this.callEscoApi('/search', {
          type: 'occupation',
          language: 'en',
          limit: batchSize,
          page: Math.floor(offset / batchSize)
        })

        const items = results._embedded?.results || []

        if (!items.length) break

        await this.storeOccupations(items)
        totalSynced += items.length
        offset += batchSize

        console.log(`[EscoService] Synced ${totalSynced} occupations...`)

        if (items.length < batchSize) break
      } catch (error) {
        console.error(`[EscoService] Sync error at offset ${offset}:`, error.message)
        keepRunning = false
      }
    }

    console.log(`[EscoService] Sync complete. Total: ${totalSynced} occupations`)
    return { totalSynced, lastOffset: offset }
  }

  // ============================================================================
  // Private helper methods
  // ============================================================================

  /**
   * Call ESCO API with error handling
   */
  async callEscoApi(endpoint, params = {}) {
    try {
      const response = await this.apiClient.get(endpoint, { params })
      return response.data
    } catch (error) {
      if (error.response) {
        throw new Error(`ESCO API error: ${error.response.status} - ${error.response.statusText}`)
      }
      throw error
    }
  }

  /**
   * Store occupation(s) from ESCO API to local database
   */
  async storeOccupations(items) {
    const occupations = items.map(item => this.parseEscoOccupation(item))

    // Store occupations
    for (const occ of occupations) {
      await escoOccupationModel.upsertByUri(occ)
    }

    // Extract and store skills
    const allSkillUris = new Set()
    occupations.forEach(occ => {
      if (occ.essentialSkills) occ.essentialSkills.forEach(uri => allSkillUris.add(uri))
      if (occ.optionalSkills) occ.optionalSkills.forEach(uri => allSkillUris.add(uri))
    })

    if (allSkillUris.size > 0) {
      await this.fetchAndStoreSkills([...allSkillUris])
    }
  }

  /**
   * Store single occupation
   */
  async storeOccupation(data) {
    const occupation = this.parseEscoOccupation(data)
    await escoOccupationModel.upsertByUri(occupation)

    // Store skills if available
    const allSkillUris = [
      ...(occupation.essentialSkills || []),
      ...(occupation.optionalSkills || [])
    ]

    if (allSkillUris.length > 0) {
      await this.fetchAndStoreSkills(allSkillUris)
    }
  }

  /**
   * Fetch and store skill details
   */
  async fetchAndStoreSkills(skillUris) {
    const batchSize = 20

    for (let i = 0; i < skillUris.length; i += batchSize) {
      const batch = skillUris.slice(i, i + batchSize)

      try {
        const skills = await Promise.all(
          batch.map(async (uri) => {
            const skillData = await this.callEscoApi('/resource/skill', {
              uri,
              language: 'en'
            })
            return this.parseEscoSkill(skillData)
          })
        )

        for (const skill of skills) {
          await escoSkillModel.upsertByUri(skill)
        }
      } catch (error) {
        console.error('[EscoService] Error fetching skills batch:', error.message)
      }
    }
  }

  /**
   * Parse ESCO occupation data to our schema
   */
  parseEscoOccupation(data) {
    const title = data.title || data.preferredLabel || ''
    const description = data.description || ''

    // Extract essential and optional skills
    const essentialSkills = []
    const optionalSkills = []

    if (data.essentialSkills) {
      data.essentialSkills.forEach(skill => {
        if (skill.uri || skill.skillUri) {
          essentialSkills.push(skill.uri || skill.skillUri)
        }
      })
    }

    if (data.optionalSkills) {
      data.optionalSkills.forEach(skill => {
        if (skill.uri || skill.skillUri) {
          optionalSkills.push(skill.uri || skill.skillUri)
        }
      })
    }

    // Handle broaderUri - can be string, array, or object
    let broaderUri = ''
    if (data.broaderOccupation) {
      if (typeof data.broaderOccupation === 'string') {
        broaderUri = data.broaderOccupation
      } else if (Array.isArray(data.broaderOccupation)) {
        broaderUri = data.broaderOccupation[0]?.uri || data.broaderOccupation[0] || ''
      } else if (data.broaderOccupation.uri) {
        broaderUri = data.broaderOccupation.uri
      }
    }

    return {
      escoUri: data.uri,
      code: data.code || data.iscoCode || '',
      iscoGroup: data.iscoGroup || '',
      broaderUri: String(broaderUri || ''),
      titleEn: title,
      descriptionEn: description,
      alternativeLabelsEn: data.alternativeLabels || [],
      essentialSkills,
      optionalSkills,
      essentialSkillsCount: essentialSkills.length,
      optionalSkillsCount: optionalSkills.length
    }
  }

  /**
   * Parse ESCO skill data to our schema
   */
  parseEscoSkill(data) {
    const title = data.title || data.preferredLabel || ''

    return {
      escoUri: data.uri,
      type: data.type === 'knowledge' ? 'knowledge' : 'skill',
      titleEn: title,
      descriptionEn: data.description || '',
      isEssentialFor: data.isEssentialFor || [],
      isOptionalFor: data.isOptionalFor || []
    }
  }

  /**
   * Format occupations for API response
   */
  formatOccupations(occupations, lang) {
    return occupations.map(occ => ({
      uri: occ.escoUri,
      code: occ.code,
      titleEn: occ.titleEn,
      titleVi: occ.titleVi || occ.titleEn,
      popularity: occ.popularity
    }))
  }

  /**
   * Format occupation details for API response
   */
  formatOccupationDetails(occupation, lang, includeSkills) {
    const result = {
      uri: occupation.escoUri || occupation.uri,
      code: occupation.code,
      iscoGroup: occupation.iscoGroup,
      titleEn: occupation.titleEn,
      titleVi: occupation.titleVi || occupation.titleEn,
      descriptionEn: occupation.descriptionEn || '',
      descriptionVi: occupation.descriptionVi || occupation.descriptionEn || '',
      alternativeLabelsEn: occupation.alternativeLabelsEn || [],
      alternativeLabelsVi: occupation.alternativeLabelsVi || [],
      essentialSkillsCount: occupation.essentialSkillsCount || 0,
      optionalSkillsCount: occupation.optionalSkillsCount || 0
    }

    return result
  }

  /**
   * Format skills for API response
   */
  formatSkills(skills, lang) {
    return skills.map(skill => ({
      uri: skill.escoUri,
      type: skill.type,
      titleEn: skill.titleEn,
      titleVi: skill.titleVi || skill.titleEn,
      descriptionEn: skill.descriptionEn || '',
      descriptionVi: skill.descriptionVi || ''
    }))
  }

  /**
   * Format single ESCO item for response
   */
  formatEscoItem(item) {
    return {
      uri: item.uri,
      code: item.code || item.iscoCode || '',
      titleEn: item.title || item.preferredLabel || '',
      titleVi: '', // Will be translated later
      descriptionEn: item.description || ''
    }
  }

  /**
   * Fetch skill details from URIs
   */
  async fetchSkillsDetails(skillUris) {
    const skills = []

    for (const uri of skillUris.slice(0, 50)) { // Limit to 50 skills
      try {
        const skillData = await this.callEscoApi('/resource/skill', { uri, language: 'en' })
        if (skillData) {
          skills.push(this.parseEscoSkill(skillData))
        }
      } catch (error) {
        // Skip failed skills
        console.error(`[EscoService] Failed to fetch skill: ${uri}`)
      }
    }

    return skills
  }
}

export const escoService = new EscoService()
