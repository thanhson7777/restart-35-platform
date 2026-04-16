/**
 * Interaction Routes - Định nghĩa routes cho User Interaction Tracking
 *
 * Các endpoint:
 * - POST   /interactions              - Ghi nhận interaction
 * - POST   /interactions/batch        - Ghi nhận nhiều interactions
 * - GET    /interactions/user/:userId - Lấy lịch sử interaction của user
 * - GET    /interactions/user/:userId/engagement - Lấy engagement score
 * - GET    /interactions/user/:userId/similar - Lấy similar users
 * - GET    /interactions/user/:userId/cf-recommendations - CF recommendations
 * - GET    /interactions/jobs/:jobId/popularity - Lấy job popularity
 * - GET    /interactions/stats        - Thống kê (admin)
 * - GET    /interactions/users/:userId1/similarity/:userId2 - User similarity
 */

import express from 'express'
import { interactionController } from '~/controllers/interactionController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

/**
 * @route   POST /v1/interactions
 * @desc    Ghi nhận một interaction từ user
 * @access  Private (requires auth)
 * @body    { userId, jobId, action, context, metadata, ... }
 */
Router.post('/', authMiddleware.isAuthorized, interactionController.createInteraction)

/**
 * @route   POST /v1/interactions/batch
 * @desc    Ghi nhận nhiều interactions cùng lúc
 * @access  Private (requires auth)
 * @body    { interactions: [...] }
 */
Router.post('/batch', authMiddleware.isAuthorized, interactionController.createBatchInteractions)

/**
 * @route   GET /v1/interactions/user/:userId
 * @desc    Lấy lịch sử interaction của một user
 * @access  Private (requires auth)
 * @param   userId - User ID
 * @query   action, limit, skip
 */
Router.get('/user/:userId', authMiddleware.isAuthorized, interactionController.getUserInteractions)

/**
 * @route   GET /v1/interactions/user/:userId/engagement
 * @desc    Lấy engagement score của user
 * @access  Private (requires auth)
 * @param   userId - User ID
 */
Router.get('/user/:userId/engagement', authMiddleware.isAuthorized, interactionController.getUserEngagement)

/**
 * @route   GET /v1/interactions/user/:userId/similar
 * @desc    Lấy danh sách similar users (cho collaborative filtering)
 * @access  Private (requires auth)
 * @param   userId - User ID
 * @query   limit - Số lượng similar users
 */
Router.get('/user/:userId/similar', authMiddleware.isAuthorized, interactionController.getSimilarUsers)

/**
 * @route   GET /v1/interactions/user/:userId/cf-recommendations
 * @desc    Lấy job recommendations dựa trên collaborative filtering
 * @access  Private (requires auth)
 * @param   userId - User ID
 * @query   limit - Số lượng recommendations
 */
Router.get('/user/:userId/cf-recommendations', authMiddleware.isAuthorized, interactionController.getCFRecommendations)

/**
 * @route   GET /v1/interactions/jobs/:jobId/popularity
 * @desc    Lấy popularity score của một job
 * @access  Public
 * @param   jobId - Job ID
 */
Router.get('/jobs/:jobId/popularity', interactionController.getJobPopularity)

/**
 * @route   GET /v1/interactions/stats
 * @desc    Lấy thống kê tổng quan (admin)
 * @access  Private (admin only)
 * @query   startDate, endDate
 */
Router.get('/stats', authMiddleware.isAuthorizedAdmin, interactionController.getStats)

/**
 * @route   GET /v1/interactions/users/:userId1/similarity/:userId2
 * @desc    Lấy độ tương đồng giữa 2 users
 * @access  Private (requires auth)
 * @param   userId1 - User ID 1
 * @param   userId2 - User ID 2
 */
Router.get('/users/:userId1/similarity/:userId2', authMiddleware.isAuthorized, interactionController.getUserSimilarity)

export const interactionRoute = Router