/**
 * AI Controller - Xử lý request cho AI features
 * Cầu nối giữa routes và service layer
 */

import { aiService } from '~/services/aiService'
import { careerRecommendationModel } from '~/models/careerRecommendationModel'
import { getRedis, isRedisAvailable, CACHE_KEYS } from '~/config/redis'
import { env } from '~/config/enviroment'
import { StatusCodes } from 'http-status-codes'
import axios from 'axios'

/**
 * Gợi ý công việc cho user
 * POST /v1/ai/recommend-jobs
 *
 * @param {Object} req.body - Worker profile data
 * @param {string[]} req.body.skills - Danh sách skills
 * @param {number} req.body.experience - Số năm kinh nghiệm
 * @param {string} [req.body.location] - Địa điểm mong muốn
 * @param {string} [req.body.targetJob] - Công việc mong muốn
 * @param {number} [req.body.targetSalary] - Mức lương mong muốn
 * @param {string} [req.body.preferredJobType] - Loại công việc ưa thích
 * @param {number} [req.body.limit] - Số lượng kết quả (default: 10)
 * @param {boolean} [req.body.allowRemote] - Cho phép remote
 */
const recommendJobs = async (req, res, next) => {
  try {
    const {
      skills,
      experience,
      location,
      targetJob,
      targetSalary,
      preferredJobType,
      limit,
      allowRemote
    } = req.body

    const result = await aiService.getRecommendedJobs({
      skills,
      experience,
      location,
      targetJob,
      targetSalary,
      preferredJobType,
      limit,
      allowRemote
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Gợi ý việc làm thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách tất cả jobs
 * GET /v1/ai/jobs
 *
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.limit - Số lượng jobs tối đa (default: 50)
 * @param {string} req.query.location - Tỉnh/TP mong muốn
 * @param {string} req.query.jobType - Loại công việc
 * @param {number} req.query.salaryMin - Mức lương tối thiểu
 * @param {number} req.query.salaryMax - Mức lương tối đa
 * @param {number} req.query.postedWithin - Jobs đăng trong N ngày
 * @param {string} req.query.skills - Lọc theo kỹ năng (comma-separated)
 * @param {number} req.query.matchMin - Match score tối thiểu
 */
const getAllJobs = async (req, res, next) => {
  try {
    const {
      limit,
      location,
      jobType,
      salaryMin,
      salaryMax,
      postedWithin,
      skills,
      matchMin
    } = req.query

    const result = await aiService.getAllJobs({
      limit: parseInt(limit) || 50,
      location,
      jobType,
      salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
      salaryMax: salaryMax ? parseInt(salaryMax) : undefined,
      postedWithin: postedWithin ? parseInt(postedWithin) : undefined,
      skills: skills ? skills.split(',') : undefined,
      matchMin: matchMin ? parseInt(matchMin) : undefined
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách việc làm thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thông tin chi tiết một job
 * GET /v1/ai/jobs/:id
 *
 * @param {string} req.params.id - Job ID
 */
const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await aiService.getJobById(id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin việc làm thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Dự đoán rủi ro thất nghiệp của người lao động
 * POST /v1/ai/predict-risk
 *
 * @param {Object} req.body - Worker data for risk prediction
 * @param {number} req.body.age - Tuổi (35-65)
 * @param {string} req.body.gender - Giới tính (male/female)
 * @param {string} [req.body.education] - Trình độ học vấn
 * @param {number} [req.body.experience_years] - Số năm kinh nghiệm
 * @param {string} [req.body.employment_status] - Tình trạng việc làm
 * @param {string} [req.body.marital_status] - Tình trạng hôn nhân
 * @param {number} [req.body.target_salary] - Mức lương mong muốn
 * @param {string} [req.body.region] - Khu vực
 * @param {string[]} req.body.skills - Danh sách kỹ năng
 * @param {string} [req.body.target_job] - Công việc mong muốn
 * @param {string} [req.body.preferred_job_type] - Loại công việc ưa thích
 */
const predictRisk = async (req, res, next) => {
  try {
    const workerData = req.body

    const result = await aiService.predictRisk(workerData)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Dự đoán rủi ro thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Phân tích tổng hợp người lao động (risk + recommendations)
 * POST /v1/ai/analyze-worker
 *
 * @param {Object} req.body - Worker data for comprehensive analysis
 * @param {number} req.body.age - Tuổi
 * @param {string[]} req.body.skills - Danh sách kỹ năng
 * @param {number} [req.body.limit] - Số lượng job recommendations
 */
const analyzeWorker = async (req, res, next) => {
  try {
    const workerData = req.body

    const result = await aiService.analyzeWorker(workerData)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Phân tích người lao động thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Health check AI Service
 * GET /v1/ai/health
 */
const healthCheck = async (req, res, next) => {
  try {
    const result = await aiService.healthCheck()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'AI Service status',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy feature importance từ model
 * GET /v1/ai/feature-importance
 */
const getFeatureImportance = async (req, res, next) => {
  try {
    const result = await aiService.getFeatureImportance()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy feature importance thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thông tin model đang sử dụng
 * GET /v1/ai/model-info
 */
const getModelInfo = async (req, res, next) => {
  try {
    const result = await aiService.getModelInfo()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy thông tin model thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

// ============================================================================
// CAREER PATH CONTROLLERS
// ============================================================================

/**
 * Khám phá lộ trình sự nghiệp
 * POST /v1/ai/career-path
 */
const discoverCareerPath = async (req, res, next) => {
  try {
    const {
      age,
      currentRole,
      currentIndustry,
      experiences,
      targetSalary,
      workPreference,
      includeAgeTransition,
      includeManagementTrack
    } = req.body

    const result = await aiService.discoverCareerPath({
      age,
      currentRole,
      currentIndustry,
      experiences,
      targetSalary,
      workPreference,
      includeAgeTransition,
      includeManagementTrack
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Khám phá lộ trình sự nghiệp thành công',
      // result chứa { success: true, data: { management_track: [...], age_transition: [...], ... } }
      // Frontend cần nhận { success: true, data: { management_track: [...], ... } }
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi
 * GET /v1/ai/career-path/urgency
 */
const getAgeUrgency = async (req, res, next) => {
  try {
    const { age } = req.query

    if (!age) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Tham số age là bắt buộc'
      })
    }

    const result = await aiService.getAgeUrgency(parseInt(age))

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy mức độ khẩn cấp thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách các ngành nghề được hỗ trợ
 * GET /v1/ai/career-path/industries
 */
const getCareerIndustries = async (req, res, next) => {
  try {
    const result = await aiService.getCareerIndustries()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách ngành nghề thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

// ============================================================================
// SEMANTIC SEARCH CONTROLLERS
// ============================================================================

/**
 * Kiểm tra trạng thái semantic search
 * GET /v1/ai/semantic-status
 */
const getSemanticStatus = async (req, res, next) => {
  try {
    const result = await aiService.getSemanticStatus()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy trạng thái semantic search thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Tìm jobs tương tự dựa trên semantic search
 * GET /v1/ai/jobs/:id/similar
 */
const getSimilarJobs = async (req, res, next) => {
  try {
    const { id } = req.params
    const { limit } = req.query

    const result = await aiService.getSimilarJobs(id, parseInt(limit) || 5)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tìm jobs tương tự thành công',
      data: result.data
    })
  } catch (error) {
    next(error)
  }
}

// ============================================================================
// CAREER TRANSITIONS CONTROLLERS (35+)
// ============================================================================

/**
 * Lấy gợi ý chuyển đổi nghề nghiệp cho lao động 35+
 * POST /v1/ai/career-transitions
 */
const getCareerTransitions = async (req, res, next) => {
  try {
    const profileData = req.body

    const result = await aiService.getCareerTransitions(profileData)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy gợi ý chuyển đổi nghề nghiệp thành công',
      data: result.data || result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi (35+)
 * GET /v1/ai/career-transitions/urgency
 */
const getTransitionsUrgency = async (req, res, next) => {
  try {
    const { age } = req.query

    if (!age) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Tham số age là bắt buộc'
      })
    }

    const result = await aiService.getTransitionsUrgency(parseInt(age))

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy mức độ khẩn cấp thành công',
      data: result.data || result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách ngành nghề được hỗ trợ cho chuyển đổi (35+)
 * GET /v1/ai/career-transitions/industries
 */
const getTransitionsIndustries = async (req, res, next) => {
  try {
    const result = await aiService.getTransitionsIndustries()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy danh sách ngành nghề thành công',
      data: result.data || result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy skill gaps cho một ngành cụ thể (35+)
 * GET /v1/ai/career-transitions/skills
 */
const getTransitionsSkills = async (req, res, next) => {
  try {
    const { industry } = req.query

    if (!industry) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Tham số industry là bắt buộc'
      })
    }

    const result = await aiService.getTransitionsSkills(industry)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Lấy skill gaps thành công',
      data: result.data || result
    })
  } catch (error) {
    next(error)
  }
}

// ============================================================================
// CACHED CAREER PATH CONTROLLERS
// ============================================================================

/**
 * Lấy career path từ cache (Redis -> MongoDB)
 * GET /v1/ai/career-path/cached
 */
const getCachedCareerPath = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Không xác định được người dùng'
      })
    }

    const redis = getRedis()

    // 1. Check Redis first (hot cache)
    if (redis && isRedisAvailable()) {
      try {
        const cachedData = await redis.get(CACHE_KEYS.careerPath(userId))
        if (cachedData) {
          console.log(`[Cache HIT] Redis - User: ${userId}`)
          return res.status(StatusCodes.OK).json({
            success: true,
            source: 'cache',
            data: JSON.parse(cachedData)
          })
        }
      } catch (redisError) {
        // Redis operation failed, continue to MongoDB
      }
    }

    // 2. Check MongoDB (persistent cache)
    const dbRecord = await careerRecommendationModel.findByUserId(userId)
    if (dbRecord) {
      console.log(`[Cache HIT] MongoDB - User: ${userId}`)

      // Repopulate Redis if available
      if (redis && isRedisAvailable()) {
        try {
          const cacheData = {
            careerPath: dbRecord.careerPath,
            careerTransitions: dbRecord.careerTransitions,
            generatedAt: dbRecord.generatedAt,
            scoringMethod: dbRecord.scoringMethod
          }
          await redis.setex(
            CACHE_KEYS.careerPath(userId),
            env.CAREER_PATH_CACHE_TTL,
            JSON.stringify(cacheData)
          )
          console.log(`[Cache POPULATE] Redis from MongoDB - User: ${userId}`)
        } catch (redisError) {
          // Redis operation failed, continue
        }
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        source: 'database',
        data: {
          careerPath: dbRecord.careerPath,
          careerTransitions: dbRecord.careerTransitions,
          generatedAt: dbRecord.generatedAt,
          scoringMethod: dbRecord.scoringMethod
        }
      })
    }

    // 3. No data found - needs generation
    console.log(`[Cache MISS] User: ${userId}`)
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      needsGeneration: true,
      message: 'Career path chưa được tạo cho người dùng này'
    })
  } catch (error) {
    console.error('[AIController] getCachedCareerPath error:', error)
    next(error)
  }
}

/**
 * Trigger generation career path mới
 * POST /v1/ai/career-path/generate
 */
const triggerCareerPathGeneration = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Không xác định được người dùng'
      })
    }

    const {
      age,
      currentRole,
      currentIndustry,
      experiences,
      skills,
      barriers,
      targetSalary,
      includeAgeTransition = true,
      includeManagementTrack = true
    } = req.body

    const redis = getRedis()

    // 1. Invalidate old cache
    if (redis && isRedisAvailable()) {
      try {
        await redis.del(CACHE_KEYS.careerPath(userId))
        console.log(`[Cache INVALIDATE] Redis - User: ${userId}`)
      } catch (redisError) {
        // Redis operation failed, continue
      }
    }

    // Mark MongoDB record as stale
    await careerRecommendationModel.markAsStale(userId)

    // 2. Generate new career path via AI Service
    console.log(`[Generation START] User: ${userId}`)
    const result = await aiService.discoverCareerPath({
      age,
      currentRole,
      currentIndustry,
      experiences,
      targetSalary,
      includeAgeTransition,
      includeManagementTrack
    })

    // 3. Save to MongoDB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const saveData = {
      userId,
      profileSnapshot: {
        age,
        currentRole,
        currentIndustry,
        experiences,
        skills,
        barriers,
        targetSalary
      },
      careerPath: result.data,
      scoringMethod: result.scoring_method || 'rule_based',
      generatedAt: new Date(),
      expiresAt,
      status: 'active',
      version: 1
    }

    await careerRecommendationModel.upsertByUserId(userId, saveData)
    console.log(`[Generation SAVE] MongoDB - User: ${userId}`)

    // 4. Cache in Redis
    if (redis && isRedisAvailable()) {
      try {
        const cacheData = {
          careerPath: result.data,
          careerTransitions: null,
          generatedAt: new Date().toISOString(),
          scoringMethod: result.scoring_method || 'rule_based'
        }
        await redis.setex(
          CACHE_KEYS.careerPath(userId),
          env.CAREER_PATH_CACHE_TTL,
          JSON.stringify(cacheData)
        )
        console.log(`[Cache SET] Redis - User: ${userId}`)
      } catch (redisError) {
        // Redis operation failed, continue
      }
    }

    console.log(`[Generation COMPLETE] User: ${userId}`)
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Career path đã được tạo thành công',
      data: result.data
    })
  } catch (error) {
    console.error('[AIController] triggerCareerPathGeneration error:', error)
    next(error)
  }
}

/**
 * Xóa cache career path
 * DELETE /v1/ai/career-path/cache
 */
const invalidateCareerPathCache = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Không xác định được người dùng'
      })
    }

    const redis = getRedis()

    // 1. Delete Redis cache
    if (redis && isRedisAvailable()) {
      try {
        await redis.del(CACHE_KEYS.careerPath(userId))
        console.log(`[Cache DELETE] Redis - User: ${userId}`)
      } catch (redisError) {
        // Redis operation failed, continue
      }
    }

    // 2. Mark MongoDB record as stale
    await careerRecommendationModel.markAsStale(userId)
    console.log(`[Cache INVALIDATE] MongoDB stale - User: ${userId}`)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cache career path đã được xóa'
    })
  } catch (error) {
    console.error('[AIController] invalidateCareerPathCache error:', error)
    next(error)
  }
}

/**
 * Xóa cache RAG recommendation
 * DELETE /v1/ai/rag/cache
 */
const invalidateRAGCache = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Không xác định được người dùng'
      })
    }

    const redis = getRedis()

    // 1. Delete Redis cache
    if (redis && isRedisAvailable()) {
      try {
        await redis.del(CACHE_KEYS.ragRecommendation(userId))
        await redis.del(CACHE_KEYS.careerPath(userId))
        console.log(`[Cache INVALIDATE] Redis deleted - User: ${userId}`)
      } catch (redisError) {
        // Redis operation failed, continue
      }
    }

    // 2. Mark RAG recommendation as stale in MongoDB
    await careerRecommendationModel.markAsStale(userId)
    console.log(`[Cache INVALIDATE] RAG cache stale - User: ${userId}`)

    // 3. Invalidate AI Service in-memory cache
    await aiService.invalidateAIRAGCache()

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cache RAG recommendation đã được xóa'
    })
  } catch (error) {
    console.error('[AIController] invalidateRAGCache error:', error)
    next(error)
  }
}

// ============================================================================
// RAG (RETRIEVAL-AUGMENTED GENERATION) CONTROLLERS
// ============================================================================

/**
 * Trigger RAG-based career recommendation
 * POST /v1/ai/rag/career-recommendation
 */
const triggerRAGCareerRecommendation = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Không xác định được người dùng'
      })
    }

    const { profile } = req.body

    if (!profile) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Profile data là bắt buộc'
      })
    }

    console.log(`[RAG Trigger] User: ${userId}`)

    const result = await aiService.triggerRAGCareerRecommendation(userId, profile)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('[AIController] triggerRAGCareerRecommendation error:', error)
    next(error)
  }
}

/**
 * Get cached RAG recommendation
 * GET /v1/ai/rag/career-recommendation
 */
const getCachedRAGRecommendation = async (req, res, next) => {
  try {
    // Fix: JWT payload có _id, không phải userId
    const userId = req.user?.userId || req.user?._id || req.user?._id

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Không xác định được người dùng'
      })
    }

    console.log(`[RAG Get Cached] User: ${userId}`)

    const result = await aiService.getCachedRAGRecommendation(userId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('[AIController] getCachedRAGRecommendation error:', error)
    next(error)
  }
}

/**
 * Refresh RAG recommendation
 * POST /v1/ai/rag/career-recommendation/refresh
 */
const refreshRAGRecommendation = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Không xác định được người dùng'
      })
    }

    const { profile } = req.body

    if (!profile) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Profile data là bắt buộc để refresh'
      })
    }

    console.log(`[RAG Refresh] User: ${userId}`)

    const result = await aiService.refreshRAGRecommendation(userId, profile)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('[AIController] refreshRAGRecommendation error:', error)
    next(error)
  }
}

/**
 * Get RAG data sources
 * GET /v1/ai/rag/sources
 */
const getRAGSources = async (req, res, next) => {
  try {
    const result = await aiService.getRAGSources()
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('[AIController] getRAGSources error:', error)
    next(error)
  }
}

/**
 * Get RAG health status
 * GET /v1/ai/rag/health
 */
const getRAGHealth = async (req, res, next) => {
  try {
    const result = await aiService.getRAGHealth()
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('[AIController] getRAGHealth error:', error)
    next(error)
  }
}

/**
 * Get RAG-based startup suggestions
 * POST /v1/ai/rag/startup-suggestions
 */
const getRAGStartupSuggestions = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Không xác định được người dùng'
      })
    }

    const { profile, budget } = req.body

    if (!profile) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Profile data là bắt buộc'
      })
    }

    console.log(`[RAG Startup] User: ${userId}`)

    const result = await aiService.getRAGStartupSuggestions(profile, budget)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('[AIController] getRAGStartupSuggestions error:', error)
    next(error)
  }
}

/**
 * Get RAG-based skills gap analysis
 * POST /v1/ai/rag/skills-gap
 */
const getRAGSkillsGap = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Không xác định được người dùng'
      })
    }

    const { profile } = req.body

    if (!profile) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Profile data là bắt buộc'
      })
    }

    console.log(`[RAG Skills Gap] User: ${userId}`)

    const result = await aiService.getRAGSkillsGap(profile)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('[AIController] getRAGSkillsGap error:', error)
    next(error)
  }
}

// ============================================================================
// ESCO SKILL GAP CONTROLLERS
// ============================================================================

/**
 * Analyze ESCO skill gaps - Proxy to AI Service
 * POST /v1/ai/skill-gap/esco
 */
const analyzeEscoSkillGaps = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?._id

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Không xác định được người dùng'
      })
    }

    const { user_skills, target_occupation, age, max_gaps, career_context } = req.body

    if (!user_skills || !target_occupation) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'user_skills và target_occupation là bắt buộc'
      })
    }

    console.log(`[ESCO Skill Gap] User: ${userId}, Occupation: ${target_occupation}`)

    const result = await aiService.analyzeEscoSkillGaps({
      user_skills,
      target_occupation,
      age: age || 30,
      max_gaps: max_gaps || 15,
      career_context: career_context || null
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('[AIController] analyzeEscoSkillGaps error:', error)
    next(error)
  }
}

/**
 * Get ESCO skill gap service health
 * GET /v1/ai/skill-gap/health
 */
const getSkillGapHealth = async (req, res, next) => {
  try {
    const result = await aiService.getSkillGapHealth()
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('[AIController] getSkillGapHealth error:', error)
    next(error)
  }
}

// ============================================================================
// COURSE RECOMMENDATION CONTROLLERS
// ============================================================================

/**
 * Admin: Đồng bộ Vector cho khóa học
 * POST /v1/ai/sync-embeddings
 */
const syncCourseEmbeddings = async (req, res, next) => {
  try {
    const response = await axios.post(`${env.AI_SERVICE_URL}/api/v1/ai/course-recommendations/sync-embeddings`)
    res.status(StatusCodes.OK).json(response.data)
  } catch (error) {
    console.error('[AIController] syncCourseEmbeddings error:', error.message)
    next(error)
  }
}

/**
 * Get course recommendations based on skill gaps
 * POST /v1/ai/course-recommendations
 */
const getCourseRecommendations = async (req, res, next) => {
  try {
    const { skill_gaps, constraints, limit } = req.body

    if (!skill_gaps || skill_gaps.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'skill_gaps là bắt buộc'
      })
    }

    console.log(`[Course Recommendations] Calling AI Service (Semantic Search) for ${skill_gaps.length} skill gaps`)

    // Format if they are string arrays
    const formatted_gaps = skill_gaps.map(g => {
      if (typeof g === 'string') return { skill_name: g, priority: 'essential' }
      return { skill_name: g.skill_name || g.name || 'Unknown', priority: g.priority || 'essential' }
    })

    const response = await axios.post(`${env.AI_SERVICE_URL}/api/v1/ai/course-recommendations`, {
      skill_gaps: formatted_gaps,
      constraints: constraints || {},
      limit: limit || 10
    })

    res.status(StatusCodes.OK).json(response.data)
  } catch (error) {
    console.error('[AIController] getCourseRecommendations error:', error.message)
    next(error)
  }
}

/**
 * Get learning path with LLM explanations
 * POST /v1/ai/learning-path
 */
const getLearningPath = async (req, res, next) => {
  try {
    const { skill_gaps, courses, job_title, max_steps } = req.body

    if (!skill_gaps || skill_gaps.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'skill_gaps là bắt buộc'
      })
    }

    console.log(`[Learning Path] Request with ${skill_gaps.length} skill gaps`)

    const result = await aiService.getLearningPath({
      skill_gaps,
      courses: courses || [],
      job_title: job_title || '',
      max_steps: max_steps || 5
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    console.error('[AIController] getLearningPath error:', error)
    next(error)
  }
}

// ============================================================================
// FEDERATED CAREER ANALYSIS (Phase 3)
// ============================================================================

/**
 * Federated career analysis - Proxy to AI Service
 * POST /v1/ai/career/analyze-full
 */
const federatedCareerAnalysis = async (req, res, next) => {
  try {
    const { user_profile, options } = req.body

    // AI Service URL (từ env)
    const AI_SERVICE_URL = `http://${env.AI_SERVICE_HOST}:${env.AI_SERVICE_PORT}`

    const response = await axios.post(
      `${AI_SERVICE_URL}/api/v1/career/analyze-full`,
      { user_profile, options },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        timeout: 30000
      }
    )

    res.json(response.data)
  } catch (error) {
    console.error('[AIController] federatedCareerAnalysis error:', error.message)
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.message || 'Federated analysis failed'
    })
  }
}

// Export controller functions
export const aiController = {
  recommendJobs,
  getAllJobs,
  getJobById,
  predictRisk,
  analyzeWorker,
  healthCheck,
  getFeatureImportance,
  getModelInfo,
  discoverCareerPath,
  getAgeUrgency,
  getCareerIndustries,
  getSemanticStatus,
  getSimilarJobs,
  // Career Transitions (35+)
  getCareerTransitions,
  getTransitionsUrgency,
  getTransitionsIndustries,
  getTransitionsSkills,
  // Cached Career Path
  getCachedCareerPath,
  triggerCareerPathGeneration,
  invalidateCareerPathCache,
  // RAG Controllers
  triggerRAGCareerRecommendation,
  getCachedRAGRecommendation,
  invalidateRAGCache,
  refreshRAGRecommendation,
  getRAGSources,
  getRAGHealth,
  // RAG Startup & Skills Gap
  getRAGStartupSuggestions,
  getRAGSkillsGap,
  // ESCO Skill Gap
  analyzeEscoSkillGaps,
  getSkillGapHealth,
  // Course Recommendations
  getCourseRecommendations,
  syncCourseEmbeddings,
  getLearningPath,
  // Federated Career Analysis (Phase 3)
  federatedCareerAnalysis
}