import { StatusCodes } from 'http-status-codes'
import { escoService } from '~/services/escoService'
import { translationService } from '~/services/translationService'
import ApiError from '~/utils/ApiError'

/**
 * Search occupations
 * GET /api/esco/search?q=welder&lang=vi&limit=20
 */
const search = async (req, res) => {
  try {
    const { q, lang = 'vi', limit = 20, offset = 0 } = req.query

    if (!q || q.length < 2) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Query too short. Minimum 2 characters.'
      )
    }

    const results = await escoService.searchOccupations(q, {
      lang,
      limit: Math.min(parseInt(limit), 50),
      offset: parseInt(offset)
    })

    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[EscoController] search error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Search failed. Please try again.'
    )
  }
}

/**
 * Get occupation details
 * GET /api/esco/occupation/:uri
 */
const getOccupation = async (req, res) => {
  try {
    const { uri } = req.params
    const { lang = 'vi', includeSkills = 'true' } = req.query

    if (!uri) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Occupation URI is required')
    }

    const decodedUri = decodeURIComponent(uri)
    const occupation = await escoService.getOccupationDetails(decodedUri, {
      lang,
      includeSkills: includeSkills === 'true'
    })

    if (!occupation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Occupation not found')
    }

    res.json({
      success: true,
      data: occupation
    })
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[EscoController] getOccupation error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to get occupation details'
    )
  }
}

/**
 * Get skills for an occupation
 * GET /api/esco/occupation/:uri/skills
 */
const getOccupationSkills = async (req, res) => {
  try {
    const { uri } = req.params
    const {
      lang = 'vi',
      essentialOnly = 'false',
      limit = 50
    } = req.query

    if (!uri) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Occupation URI is required')
    }

    const decodedUri = decodeURIComponent(uri)
    const skills = await escoService.getOccupationSkills(decodedUri, {
      lang,
      essentialOnly: essentialOnly === 'true',
      limit: Math.min(parseInt(limit), 100)
    })

    res.json({
      success: true,
      data: skills
    })
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[EscoController] getOccupationSkills error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to get skills'
    )
  }
}

/**
 * Get popular occupations
 * GET /api/esco/occupation/popular
 */
const getPopular = async (req, res) => {
  try {
    const { lang = 'vi', limit = 10 } = req.query

    const popular = await escoService.getPopularOccupations(
      Math.min(parseInt(limit), 20)
    )

    res.json({
      success: true,
      data: popular
    })
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[EscoController] getPopular error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to get popular occupations'
    )
  }
}

/**
 * Track occupation usage (for analytics)
 * POST /api/esco/track
 */
const trackUsage = async (req, res) => {
  try {
    const { uri } = req.body

    if (!uri) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Occupation URI is required')
    }

    await escoService.trackOccupationUsage(uri)

    res.json({
      success: true,
      message: 'Usage tracked'
    })
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[EscoController] trackUsage error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to track usage'
    )
  }
}

/**
 * Create translation override
 * POST /api/esco/translate
 */
const createTranslationOverride = async (req, res) => {
  try {
    const { escoUri, field, originalText, overrideText, source = 'manual' } = req.body
    const userId = req.user?._id || ''

    if (!escoUri || !field || !originalText || !overrideText) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'escoUri, field, originalText, and overrideText are required'
      )
    }

    const validFields = ['title', 'description', 'alternativeLabel', 'skill']
    if (!validFields.includes(field)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Invalid field. Must be one of: ${validFields.join(', ')}`
      )
    }

    const override = await translationService.saveOverride(
      escoUri,
      field,
      originalText,
      overrideText,
      source,
      userId
    )

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: override
    })
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[EscoController] createTranslationOverride error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to create translation override'
    )
  }
}

/**
 * Sync all ESCO data (Admin only)
 * POST /api/esco/sync
 */
const syncData = async (req, res) => {
  try {
    // Check admin role
    if (req.user?.role !== 'admin') {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Admin access required')
    }

    const { batchSize = 100, startOffset = 0 } = req.body

    // Start sync in background
    const syncPromise = escoService.syncAllData({
      batchSize: Math.min(parseInt(batchSize), 500),
      startOffset: parseInt(startOffset)
    })

    // Return immediately to client
    res.json({
      success: true,
      message: 'Sync started',
      status: 'in_progress'
    })

    // Log completion
    syncPromise
      .then(result => {
        console.log(`[EscoController] Sync complete:`, result)
      })
      .catch(err => {
        console.error('[EscoController] Sync failed:', err)
      })
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[EscoController] syncData error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to start sync'
    )
  }
}

/**
 * Get sync status
 * GET /api/esco/sync/status
 */
const getSyncStatus = async (req, res) => {
  try {
    const { escoOccupationModel } = await import('~/models/escoOccupationModel')
    const { escoSkillModel } = await import('~/models/escoSkillModel')
    const { escoTranslationOverrideModel } = await import('~/models/escoTranslationOverrideModel')

    const [occupationCount, skillCount, translationStats] = await Promise.all([
      escoOccupationModel.countAll(),
      escoSkillModel.countAll(),
      escoTranslationOverrideModel.countByStatus()
    ])

    res.json({
      success: true,
      data: {
        occupations: occupationCount,
        skills: skillCount,
        translations: translationStats
      }
    })
  } catch (error) {
    if (error.isApiError) {
      throw error
    }

    console.error('[EscoController] getSyncStatus error:', error)
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to get sync status'
    )
  }
}

export const escoController = {
  search,
  getOccupation,
  getOccupationSkills,
  getPopular,
  trackUsage,
  createTranslationOverride,
  syncData,
  getSyncStatus
}
