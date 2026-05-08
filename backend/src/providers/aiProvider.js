/**
 * AI Provider - Giao tiệp với Python AI Service
 * Module này chịu trách nhiệm giao tiệp trực tiếp với Python FastAPI service
 * Fallback sang mock data khi AI service không khả dụng
 */

import axios from 'axios'
import { env } from '~/config/enviroment'

// Base URL cho AI Service (Python FastAPI)
const AI_SERVICE_BASE_URL = `http://${env.AI_SERVICE_HOST || 'localhost'}:${env.AI_SERVICE_PORT || '8000'}`

/**
 * Mock data cho jobs - Sử dụng khi AI service không khả dụng
 */
const MOCK_JOBS = [
  {
    id: 'job_001',
    title: 'Nhân viên Pha chế (Barista)',
    company: 'Highlands Coffee',
    location: 'Quận 1, TP.HCM',
    salary_min: 7000000,
    salary_max: 10000000,
    job_type: 'full-time',
    required_skills: ['Pha chế', 'Phục vụ', 'Chăm sóc khách hàng'],
    match_score: 92,
    matching_skills: ['Pha chế'],
    description: 'Pha chế đồ uống, phục vụ khách hàng tại quầy',
    posted_date: new Date().toISOString()
  },
  {
    id: 'job_002',
    title: 'Kỹ thuật viên bảo trì',
    company: 'Công ty TNHH ABC',
    location: 'Bình Dương',
    salary_min: 10000000,
    salary_max: 15000000,
    job_type: 'full-time',
    required_skills: ['Điện tử', 'Cơ khí', 'Bảo trì máy móc'],
    match_score: 85,
    matching_skills: ['Cơ khí'],
    description: 'Bảo trì và sửa chữa máy móc thiết bị',
    posted_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'job_003',
    title: 'Thợ hàn xuất khí',
    company: 'Nhà máy XYZ',
    location: 'Hà Nội',
    salary_min: 8000000,
    salary_max: 12000000,
    job_type: 'full-time',
    required_skills: ['Hàn xì', 'Cơ khí', 'Đọc bản vẽ'],
    match_score: 78,
    matching_skills: ['Hàn xì', 'Cơ khí'],
    description: 'Hàn xuất khí các sản phẩm cơ khí',
    posted_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'job_004',
    title: 'Nhân viên bán hàng',
    company: 'Co.opmart',
    location: 'TP.HCM',
    salary_min: 6000000,
    salary_max: 9000000,
    job_type: 'full-time',
    required_skills: ['Bán hàng', 'Thu ngân', 'Giao tiếp'],
    match_score: 75,
    matching_skills: ['Bán hàng', 'Giao tiếp'],
    description: 'Bán hàng tại siêu thị, hỗ trợ khách hàng',
    posted_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'job_005',
    title: 'Lái xe giao hàng',
    company: 'Grab',
    location: 'Hồ Chí Minh',
    salary_min: 8000000,
    salary_max: 15000000,
    job_type: 'freelance',
    required_skills: ['Lái xe', 'Giao hàng'],
    match_score: 70,
    matching_skills: ['Lái xe'],
    description: 'Giao hàng cho GrabExpress',
    posted_date: new Date().toISOString()
  },
  {
    id: 'job_006',
    title: 'Thợ may công nghiệp',
    company: 'May Sài Gòn',
    location: 'Bình Dương',
    salary_min: 7000000,
    salary_max: 11000000,
    job_type: 'full-time',
    required_skills: ['May mặc', 'Làm việc nhóm'],
    match_score: 68,
    matching_skills: ['May mặc'],
    description: 'May các sản phẩm thời trang',
    posted_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'job_007',
    title: 'Nhân viên nấu ăn',
    company: 'Nhà hàng ABC',
    location: 'Đà Nẵng',
    salary_min: 8000000,
    salary_max: 12000000,
    job_type: 'full-time',
    required_skills: ['Nấu ăn', 'Vệ sinh an toàn thực phẩm'],
    match_score: 65,
    matching_skills: ['Nấu ăn'],
    description: 'Nấu ăn cho nhà hàng',
    posted_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'job_008',
    title: 'Kỹ thuật viên điện nước',
    company: 'Thiên Phú Corp',
    location: 'Hà Nội',
    salary_min: 9000000,
    salary_max: 14000000,
    job_type: 'full-time',
    required_skills: ['Điện nước', 'Lắp đặt', 'Sửa chữa'],
    match_score: 60,
    matching_skills: ['Điện nước', 'Lắp đặt'],
    description: 'Lắp đặt và sửa chữa điện nước',
    posted_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'job_009',
    title: 'Phục vụ bàn',
    company: 'Pizza Hut',
    location: 'TP.HCM',
    salary_min: 5500000,
    salary_max: 8000000,
    job_type: 'part-time',
    required_skills: ['Phục vụ bàn', 'Giao tiếp', 'Chịu áp lực'],
    match_score: 58,
    matching_skills: ['Phục vụ'],
    description: 'Phục vụ bàn tại nhà hàng',
    posted_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'job_010',
    title: 'Nhân viên kho vận',
    company: 'VNPost',
    location: 'Hà Nội',
    salary_min: 6000000,
    salary_max: 9000000,
    job_type: 'full-time',
    required_skills: ['Kho vận', 'Nhập liệu'],
    match_score: 55,
    matching_skills: ['Nhập liệu'],
    description: 'Quản lý kho hàng, nhập xuất hàng',
    posted_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  }
]

/**
 * Axios instance cho AI Service với timeout cao hơn (ML models cần thời gian xử lý)
 */
const aiApiClient = axios.create({
  baseURL: AI_SERVICE_BASE_URL,
  timeout: 60000, // 60s cho ML predictions
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * Helper function để lọc jobs dựa trên skills
 */
const filterJobsBySkills = (jobs, userSkills, limit = 10) => {
  if (!userSkills || userSkills.length === 0) {
    return jobs.slice(0, limit)
  }

  // Tính match score cho mỗi job dựa trên skills
  const jobsWithMatch = jobs.map(job => {
    const jobSkills = (job.required_skills || []).map(s => s.toLowerCase())
    const matchedSkills = userSkills.filter(skill =>
      jobSkills.some(js => js.includes(skill.toLowerCase()) || skill.toLowerCase().includes(js))
    )
    const matchScore = jobSkills.length > 0
      ? Math.round((matchedSkills.length / jobSkills.length) * 100)
      : 50

    return {
      ...job,
      match_score: Math.max(job.match_score || 50, matchScore),
      matching_skills: matchedSkills
    }
  })

  // Sắp xếp theo match score giảm dần
  jobsWithMatch.sort((a, b) => b.match_score - a.match_score)

  return jobsWithMatch.slice(0, limit)
}

/**
 * AI Provider class - Singleton pattern để quản lý AI Service connections
 */
class AIProvider {
  /**
   * Health check AI Service
   * GET /api/v1/ai/health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/health')
      return response.data
    } catch (error) {
      return {
        status: 'mock',
        message: 'Using mock data',
        service: 'mock'
      }
    }
  }

  /**
   * Gợi ý công việc cho user dựa trên kỹ năng
   * POST /api/v1/ai/recommend-jobs
   */
  async recommendJobs({
    skills,
    experience = 0,
    location = null,
    targetJob = null,
    targetSalary = null,
    preferredJobType = null,
    limit = 10,
    allowRemote = false
  }) {
    try {
      const payload = {
        skills,
        experience,
        limit
      }

      // Cap experience ở backend (0-50 năm)
      payload.experience = Math.min(50, Math.max(0, parseInt(experience) || 0))

      if (location) payload.location = location
      if (targetJob) payload.target_job = targetJob
      if (targetSalary) payload.target_salary = targetSalary
      if (preferredJobType) payload.preferred_job_type = preferredJobType
      if (allowRemote) payload.allow_remote = allowRemote

const response = await aiApiClient.post('/api/v1/ai/recommend-jobs', payload)
      return response.data
    } catch (error) {
      console.warn('[AIProvider] recommendJobs - AI Service error, using mock data')
      // Trả về mock data khi AI service không khả dụng
      let filteredJobs = filterJobsBySkills(MOCK_JOBS, skills, limit)

      // Filter theo location nếu có
      if (location) {
        filteredJobs = filteredJobs.filter(job =>
          job.location?.toLowerCase().includes(location.toLowerCase())
        )
      }

      // Filter theo job type nếu có
      if (preferredJobType) {
        filteredJobs = filteredJobs.filter(job =>
          job.job_type === preferredJobType
        )
      }

      // Filter theo salary nếu có
      if (targetSalary) {
        filteredJobs = filteredJobs.filter(job =>
          job.salary_min <= targetSalary
        )
      }

      return {
        data: {
          jobs: filteredJobs,
          total: filteredJobs.length,
          filters_applied: { skills, location, targetJob, targetSalary, preferredJobType }
        }
      }
    }
  }

  /**
   * Lấy danh sách tất cả jobs từ database
   * GET /api/v1/ai/jobs
   */
  async getAllJobs(limit = 50) {
    try {
      const response = await aiApiClient.get('/api/v1/ai/jobs', {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Using mock data')
      return {
        data: {
          jobs: MOCK_JOBS.slice(0, limit),
          total: MOCK_JOBS.length
        }
      }
    }
  }

  /**
   * Lấy thông tin chi tiết một job
   * GET /api/v1/ai/jobs/{jobId}
   */
  async getJobById(jobId) {
    try {
      const response = await aiApiClient.get(`/api/v1/ai/jobs/${jobId}`)
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Using mock data')
      const job = MOCK_JOBS.find(j => j.id === jobId || j._id === jobId)
      if (job) {
        return { data: job }
      }
      throw new Error('Job not found')
    }
  }

  /**
   * Dự đoán rủi ro thất nghiệp
   * POST /api/v1/ai/predict-risk
   */
  async predictRisk(workerData) {
    try {
      const response = await aiApiClient.post('/api/v1/ai/predict-risk', workerData)
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Using mock data')
      const baseRisk = 50
      const ageFactor = (workerData.age - 35) * 2
      const skillsFactor = workerData.skills?.length ? -5 : 10
      const riskScore = Math.min(100, Math.max(0, baseRisk + ageFactor + skillsFactor))

      return {
        data: {
          risk_level: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
          risk_score: riskScore,
          probability: riskScore / 100,
          recommendation: riskScore > 70
            ? 'Nên chuyển đổi nghề nghiệp sớm'
            : riskScore > 40
              ? 'Cần nâng cao kỹ năng'
              : 'Rủi ro thấp, tiếp tục phát triển'
        }
      }
    }
  }

  /**
   * Phân tích tổng hợp người lao động
   * POST /api/v1/ai/analyze-worker
   */
  async analyzeWorker(workerData) {
    try {
      const response = await aiApiClient.post('/api/v1/ai/analyze-worker', workerData)
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Using mock data')
      const riskResult = await this.predictRisk(workerData)
      const jobs = await this.recommendJobs({
        skills: workerData.skills,
        experience: workerData.experience_years || 0,
        limit: workerData.limit || 5
      })

      return {
        data: {
          risk_data: riskResult.data,
          jobs: jobs.data?.jobs || [],
          metadata: {
            analyzed_at: new Date().toISOString(),
            source: 'mock'
          }
        }
      }
    }
  }

  /**
   * Lấy thông tin feature importance từ model
   * GET /api/v1/ai/feature-importance
   */
  async getFeatureImportance() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/feature-importance')
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Using mock data')
      return {
        data: {
          features: [
            { name: 'Tuổi', importance: 0.25 },
            { name: 'Kỹ năng', importance: 0.30 },
            { name: 'Kinh nghiệm', importance: 0.20 },
            { name: 'Học vấn', importance: 0.15 },
            { name: 'Địa điểm', importance: 0.10 }
          ]
        }
      }
    }
  }

  /**
   * Lấy thông tin model
   * GET /api/v1/ai/model-info
   */
  async getModelInfo() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/model-info')
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Using mock data')
      return {
        data: {
          model_type: 'Random Forest (Mock)',
          version: '1.0.0',
          threshold: 0.5,
          strategy: 'skill_matching'
        }
      }
    }
  }

  /**
   * Khám phá lộ trình sự nghiệp
   * POST /api/v1/ai/career-path
   */
  async discoverCareerPath({
    age,
    currentRole = null,
    currentIndustry = null,
    experiences = [],
    targetSalary = null,
    workPreference = null,
    includeAgeTransition = true,
    includeManagementTrack = true
  }) {
    try {
      // Convert years từ tháng sang năm cho mỗi experience
      const normalizedExperiences = experiences.map(exp => ({
        ...exp,
        years: Math.floor((parseInt(exp.years) || 0) / 12)  // Convert months to years
      }))

      // Calculate total years
      const totalYears = normalizedExperiences.reduce((sum, exp) => sum + exp.years, 0)
      const cappedTotalYears = Math.min(50, Math.max(0, totalYears))

      const payload = { 
        age: parseInt(age) || 0,
        experiences: normalizedExperiences,
        total_years: cappedTotalYears
      }
      if (currentRole) payload.current_role = currentRole
      if (currentIndustry) payload.current_industry = currentIndustry
      if (targetSalary) payload.target_salary = targetSalary
      if (workPreference) payload.work_preference = workPreference
      payload.include_age_transition = includeAgeTransition
      payload.include_management_track = includeManagementTrack

      const response = await aiApiClient.post('/api/v1/ai/career-path', payload)

      // Python AI Service returns: { success: true, data: { management_track: [...], ... } }
      // We need to unwrap to: { success: true, data: { ... } } for the Controller to wrap again
      return response.data
    } catch (error) {
      console.warn('[AIProvider] discoverCareerPath - AI Service error, using mock data')
      return {
        data: {
          career_paths: [
            { title: 'Chuyên gia kỹ thuật', steps: ['Cập nhật kỹ năng', 'Thăng tiến nghề nghiệp'], salary_range: '15-25 triệu' },
            { title: 'Huấn luyện viên', steps: ['Chia sẻ kinh nghiệm', 'Đào tạo người khác'], salary_range: '12-20 triệu' }
          ],
          urgency: age > 50 ? 'high' : 'medium'
        }
      }
    }
  }

  /**
   * Lấy mức độ khẩn cấp chuyển đổi nghề
   * GET /api/v1/ai/career-path/urgency
   */
  async getAgeUrgency(age) {
    try {
      const response = await aiApiClient.get('/api/v1/ai/career-path/urgency', { params: { age } })
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Using mock data')
      return {
        data: {
          urgency: age > 55 ? 'critical' : age > 45 ? 'high' : 'medium',
          description: 'Mức độ khẩn cấp chuyển đổi nghề nghiệp'
        }
      }
    }
  }

  /**
   * Lấy danh sách các ngành nghề
   * GET /api/v1/ai/career-path/industries
   */
  async getCareerIndustries() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/career-path/industries')
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Using mock data')
      return {
        data: {
          industries: [
            { id: 'food', name: 'F&B - Thực phẩm', jobs_count: 150 },
            { id: 'retail', name: 'Bán lẻ', jobs_count: 120 },
            { id: 'manufacturing', name: 'Sản xuất', jobs_count: 100 },
            { id: 'service', name: 'Dịch vụ', jobs_count: 200 },
            { id: 'construction', name: 'Xây dựng', jobs_count: 80 }
          ]
        }
      }
    }
  }

  /**
   * Kiểm tra trạng thái semantic search
   * GET /api/v1/ai/semantic-status
   */
  async getSemanticStatus() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/semantic-status')
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Using mock data')
      return {
        data: {
          status: 'unavailable',
          message: 'Semantic search not available in mock mode'
        }
      }
    }
  }

  /**
   * Tìm jobs tương tự
   * GET /api/v1/ai/jobs/{jobId}/similar
   */
  async getSimilarJobs(jobId, limit = 5) {
    try {
      const response = await aiApiClient.get(`/api/v1/ai/jobs/${jobId}/similar`, { params: { limit } })
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Using mock data')
      const currentJob = MOCK_JOBS.find(j => j.id === jobId || j._id === jobId)

      if (!currentJob) {
        return { data: { jobs: [], similar_jobs: [] } }
      }

      const similarJobs = MOCK_JOBS
        .filter(j => j.id !== jobId)
        .map(job => {
          const commonSkills = (currentJob.required_skills || [])
            .filter(skill => (job.required_skills || []).includes(skill))
          return {
            ...job,
            similarity: commonSkills.length / Math.max(currentJob.required_skills.length, 1)
          }
        })
        .filter(job => job.similarity > 0.2)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

      return {
        data: {
          jobs: similarJobs,
          similar_jobs: similarJobs
        }
      }
    }
  }

  // ============================================================================
  // CAREER TRANSITIONS (35+) PROVIDER METHODS
  // ============================================================================

  /**
   * Lấy gợi ý chuyển đổi nghề nghiệp cho lao động 35+
   * POST /api/v1/ai/career-transitions
   */
  async getCareerTransitions(profileData) {
    try {
      const payload = {
        age: profileData.age,
        current_role: profileData.current_role,
        current_industry: profileData.current_industry,
        experience_years: profileData.experience_years || 0,
        skills: profileData.skills || [],
        target_salary: profileData.target_salary || null,
        barriers: profileData.barriers || [],
        transition_types: profileData.transition_types || ['management', 'cross_industry', 'universal', 'multi_industry'],
        limit: profileData.limit || 10,
        work_history: profileData.work_history || [],
        personality_traits: profileData.personality_traits || [],
        interests: profileData.interests || [],
        values: profileData.values || []
      }

      const response = await aiApiClient.post('/api/v1/ai/career-transitions', payload)
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Career transitions error')
      // Trả về mock data khi AI service không khả dụng
      return {
        success: false,
        data: {
          transitions: [],
          urgency: { urgency: 'medium', message: 'Không thể kết nối AI Service' },
          statistics: { total_transitions: 0 },
          error: error.message
        }
      }
    }
  }

  /**
   * Lấy mức độ khẩn cấp chuyển đổi nghề theo tuổi
   * GET /api/v1/ai/career-transitions/urgency
   */
  async getTransitionsUrgency(age) {
    try {
      const response = await aiApiClient.get('/api/v1/ai/career-transitions/urgency', {
        params: { age }
      })
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Transitions urgency error')
      // Tính urgency cơ bản khi AI service không khả dụng
      const urgency = age > 55 ? 'critical' : age > 45 ? 'high' : age > 35 ? 'medium' : 'low'
      return {
        success: true,
        data: {
          age,
          urgency,
          message: urgency === 'critical' ? 'Đây là giai đoạn chuyển đổi cuối cùng'
            : urgency === 'high' ? 'Đây là GIAI ĐOẠN VÀNG để chuyển đổi'
            : urgency === 'medium' ? 'Đã đến lúc bắt đầu khám phá các hướng đi mới'
            : 'Bạn còn nhiều thời gian - hãy tập trung phát triển'
        }
      }
    }
  }

  /**
   * Lấy danh sách ngành nghề được hỗ trợ cho chuyển đổi
   * GET /api/v1/ai/career-transitions/industries
   */
  async getTransitionsIndustries() {
    try {
      const response = await aiApiClient.get('/api/v1/ai/career-transitions/industries')
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Transitions industries error')
      // Trả về danh sách mặc định
      return {
        success: true,
        data: {
          industries: {
            'bao_ve': 'Bảo Vệ & An Ninh',
            'lai_xe': 'Lái Xe & Vận Tải',
            'co_khi': 'Cơ Khí & Sản Xuất',
            'ban_hang': 'Bán Hàng & Kinh Doanh',
            'phuc_vu': 'Phục Vụ & Nhà Hàng',
            'hanh_chinh': 'Hành Chính',
            'nhan_su': 'Nhân Sự & HR',
            'tu_van': 'Tư Vấn'
          },
          total: 8,
          recommended_for_35_plus: ['co_khi', 'tu_van', 'nhan_su', 'hanh_chinh']
        }
      }
    }
  }

  /**
   * Lấy skill gaps cho một ngành cụ thể
   * GET /api/v1/ai/career-transitions/skills
   */
  async getTransitionsSkills(industry) {
    try {
      const response = await aiApiClient.get('/api/v1/ai/career-transitions/skills', {
        params: { industry }
      })
      return response.data
    } catch (error) {
      console.warn('[AIProvider] Transitions skills error')
      // Trả về skills mặc định
      const defaultSkills = {
        'bao_ve': ['Security Audit', 'Risk Assessment', 'Report Writing'],
        'lai_xe': ['Fleet Management', 'GPS Systems', 'Route Planning'],
        'co_khi': ['Lean Manufacturing', 'Six Sigma', 'Quality Control'],
        'ban_hang': ['Presentation', 'Training Design', 'Strategic Selling'],
        'phuc_vu': ['Restaurant Operations', 'Food Safety', 'Cost Control'],
        'hanh_chinh': ['Legal Knowledge', 'Compliance Systems', 'Audit'],
        'nhan_su': ['HR Consulting', 'Compensation Design', 'LMS'],
        'tu_van': ['Business Strategy', 'Change Management', 'Coaching']
      }
      return {
        success: true,
        data: {
          industry,
          recommended_skills: defaultSkills[industry] || []
        }
      }
    }
  }
}

// Export singleton instance
export const aiProvider = new AIProvider()
