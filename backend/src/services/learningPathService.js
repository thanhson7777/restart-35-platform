/**
 * Learning Path Service
 * Orchestration: job detail + ESCO skill gaps + course recommendations
 */

import { ScrapedJobModel } from '~/models/scrapedJobModel'
import { aiService } from '~/services/aiService'

/**
 * Get complete learning path for a job: job info + skill gaps + course recommendations
 *
 * @param {Object} params
 * @param {string} params.jobId - ScrapedJob ID
 * @param {string[]} params.userSkills - User's current skills
 * @param {number} params.userAge - User age (default 30)
 * @param {Object} params.constraints - Course filter constraints
 * @returns {Promise<Object>} Combined job + skill gap + courses
 */
export const getJobLearningPath = async ({
  jobId,
  userSkills = [],
  userAge = 30,
  constraints = {}
}) => {
  // 1. Lấy job detail từ MongoDB
  const job = await ScrapedJobModel.findOne({ scrapedJobId: jobId })
  if (!job) {
    throw new Error('Job not found')
  }

  // 2. Gọi AI skill-gap service
  const skillGapResult = await aiService.analyzeEscoSkillGaps({
    user_skills: userSkills,
    target_occupation: job.title,
    age: userAge,
    max_gaps: 15
  })

  const skillGaps = skillGapResult?.data?.skill_gaps || []

  // 3. Gọi AI course-recommendation service
  let recommendedCourses = []
  try {
    const courseResult = await aiService.getCourseRecommendations({
      skill_gaps: skillGaps,
      constraints,
      limit: 10
    })
    recommendedCourses = courseResult?.courses || []
  } catch (err) {
    console.error('[LearningPathService] getCourseRecommendations error:', err.message)
    recommendedCourses = []
  }

  // 4. Tính job match score đơn giản
  const jobMatchScore = calculateJobMatchScore(userSkills, job.skills || [])

  // 5. Gộp kết quả
  return {
    job: {
      id: job.scrapedJobId,
      title: job.title,
      company: job.company,
      skills: job.skills || [],
      location: job.location,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      match_score: jobMatchScore
    },
    skill_gap: {
      total: skillGaps.length,
      essential: skillGaps.filter(s => s.priority === 'essential').length,
      important: skillGaps.filter(s => s.priority === 'important').length,
      nice_to_have: skillGaps.filter(s => s.priority === 'nice_to_have').length,
      skills: skillGaps
    },
    recommended_courses: recommendedCourses
  }
}

/**
 * Tính match score đơn giản giữa user skills và job required skills
 * @param {string[]} userSkills
 * @param {string[]} jobSkills
 * @returns {number} 0-100
 */
const calculateJobMatchScore = (userSkills, jobSkills) => {
  if (!jobSkills || jobSkills.length === 0) return 50
  const normalized = s => s.toLowerCase().trim()
  const userSet = new Set((userSkills || []).map(normalized))
  const matched = jobSkills.filter(s => userSet.has(normalized(s))).length
  return Math.round((matched / jobSkills.length) * 100)
}
