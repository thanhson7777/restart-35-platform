/**
 * Learning Path Controller
 * HTTP handler cho /jobs/:id/learning-path
 */

import { getJobLearningPath } from '~/services/learningPathService'
import { StatusCodes } from 'http-status-codes'

/**
 * GET /v1/jobs/:id/learning-path
 *
 * @param {string} req.params.id - Job ID (scrapedJobId)
 * @param {string[]} req.query.user_skills - Array of user skills
 * @param {number} req.query.user_age - User age (default 30)
 * @param {string|Object} req.query.constraints - Course filter constraints
 */
export const getJobLearningPathController = async (req, res, next) => {
  try {
    const { id } = req.params
    const { user_skills, user_age = 30, constraints = {} } = req.query

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Job ID là bắt buộc'
      })
    }

    const skills = user_skills
      ? (Array.isArray(user_skills) ? user_skills : JSON.parse(user_skills))
      : []

    const parsedConstraints = typeof constraints === 'string'
      ? JSON.parse(constraints)
      : (constraints || {})

    const result = await getJobLearningPath({
      jobId: id,
      userSkills: skills,
      userAge: parseInt(user_age) || 30,
      constraints: parsedConstraints
    })

    return res.status(StatusCodes.OK).json({
      success: true,
      data: result
    })
  } catch (error) {
    if (error.message === 'Job not found') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy công việc'
      })
    }
    next(error)
  }
}
