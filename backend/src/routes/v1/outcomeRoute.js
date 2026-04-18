/**
 * Outcome Routes - Định nghĩa routes cho Job Outcome Tracking
 *
 * Các endpoint:
 * - POST   /outcomes                - Tạo outcome (apply)
 * - GET    /outcomes/me              - Lấy danh sách outcomes của user
 * - GET    /outcomes/me/stats        - Lấy thống kê của user
 * - GET    /outcomes/me/preferences  - Lấy preferences cho ML
 * - GET    /outcomes/:id             - Lấy chi tiết outcome
 * - PUT    /outcomes/:id/status      - Update status
 * - POST   /outcomes/:id/feedback    - Submit feedback
 * - DELETE /outcomes/:id             - Withdraw outcome
 * - GET    /outcomes/jobs/:jobId/stats - Thống kê job (admin)
 * - GET    /outcomes/stats           - Thống kê tổng hợp (admin)
 */

import express from 'express'
import { outcomeController } from '~/controllers/outcomeController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

/**
 * @route   POST /v1/outcomes
 * @desc    Tạo outcome (khi user apply)
 * @access  Private (requires auth)
 * @body    { userId, jobId, jobTitle, companyName, metadata }
 */
Router.post(
  '/',
  authMiddleware.isAuthorized,
  outcomeController.createOutcome
)

/**
 * @route   GET /v1/outcomes/me
 * @desc    Lấy danh sách outcomes của user hiện tại
 * @access  Private (requires auth)
 * @query   status, limit, skip
 */
Router.get(
  '/me',
  authMiddleware.isAuthorized,
  outcomeController.getMyOutcomes
)

/**
 * @route   GET /v1/outcomes/me/stats
 * @desc    Lấy thống kê thành công của user
 * @access  Private (requires auth)
 */
Router.get(
  '/me/stats',
  authMiddleware.isAuthorized,
  outcomeController.getMyStats
)

/**
 * @route   GET /v1/outcomes/me/preferences
 * @desc    Lấy preferences của user (dùng cho ML)
 * @access  Private (requires auth)
 */
Router.get(
  '/me/preferences',
  authMiddleware.isAuthorized,
  outcomeController.getMyPreferences
)

/**
 * @route   GET /v1/outcomes/:outcomeId
 * @desc    Lấy chi tiết một outcome
 * @access  Private (requires auth)
 * @param   outcomeId - Outcome ID
 */
Router.get(
  '/:outcomeId',
  authMiddleware.isAuthorized,
  outcomeController.getOutcomeById
)

/**
 * @route   PUT /v1/outcomes/:outcomeId/status
 * @desc    Update status của outcome
 * @access  Private (requires auth)
 * @param   outcomeId - Outcome ID
 * @body    { status, additionalData }
 */
Router.put(
  '/:outcomeId/status',
  authMiddleware.isAuthorized,
  outcomeController.updateStatus
)

/**
 * @route   POST /v1/outcomes/:outcomeId/feedback
 * @desc    Submit feedback cho outcome
 * @access  Private (requires auth)
 * @param   outcomeId - Outcome ID
 * @body    { rating, comment, wouldApplyAgain, recommendToOthers, pros, cons }
 */
Router.post(
  '/:outcomeId/feedback',
  authMiddleware.isAuthorized,
  outcomeController.submitFeedback
)

/**
 * @route   DELETE /v1/outcomes/:outcomeId
 * @desc    Withdraw/Rút đơn ứng tuyển
 * @access  Private (requires auth)
 * @param   outcomeId - Outcome ID
 * @body    { reason }
 */
Router.delete(
  '/:outcomeId',
  authMiddleware.isAuthorized,
  outcomeController.withdrawOutcome
)

/**
 * @route   GET /v1/outcomes/jobs/:jobId/stats
 * @desc    Lấy thống kê của một job
 * @access  Private (admin only)
 * @param   jobId - Job ID
 */
Router.get(
  '/jobs/:jobId/stats',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  outcomeController.getJobStats
)

/**
 * @route   GET /v1/outcomes/stats
 * @desc    Lấy thống kê tổng hợp
 * @access  Private (admin only)
 * @query   startDate, endDate
 */
Router.get(
  '/stats',
  authMiddleware.isAuthorized,
  authMiddleware.isAuthorizedAdmin,
  outcomeController.getAggregatedStats
)

export const outcomeRoute = Router
