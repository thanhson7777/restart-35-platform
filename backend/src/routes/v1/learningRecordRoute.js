import express from 'express'
import { learningRecordValidation } from '~/validators/learningRecordValidation'
import { learningRecordController } from '~/controllers/learningRecordController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// ============ WORKER ROUTES ============

// Ghi nhận sự kiện học tập
Router.post(
  '/',
  authMiddleware.isAuthorized,
  learningRecordValidation.createLearningRecord,
  learningRecordController.createLearningRecord
)

// Lịch sử học tập của tôi
Router.get(
  '/my',
  authMiddleware.isAuthorized,
  learningRecordController.getMyLearningRecords
)

// ============ TRAINER / ADMIN ROUTES ============

// Danh sách learning records (filter)
Router.get(
  '/',
  authMiddleware.isAuthorizedTrainerOrAdmin,
  learningRecordValidation.queryLearningRecords,
  learningRecordController.getLearningRecords
)

// Phân tích nguy cơ bỏ học
Router.get(
  '/analytics/dropout-risk',
  authMiddleware.isAuthorizedTrainerOrAdmin,
  learningRecordController.getDropoutRisk
)

// ============ SHARED ROUTES (Owner + Trainer + Admin) ============

// Lịch sử học tập theo enrollment
Router.get(
  '/enrollment/:enrollmentId',
  authMiddleware.isAuthorized,
  learningRecordValidation.checkEnrollmentId,
  learningRecordController.getEnrollmentHistory
)

// Tiến độ học tập theo enrollment
Router.get(
  '/enrollment/:enrollmentId/progress',
  authMiddleware.isAuthorized,
  learningRecordValidation.checkEnrollmentId,
  learningRecordController.calculateProgress
)

export const learningRecordRoute = Router
