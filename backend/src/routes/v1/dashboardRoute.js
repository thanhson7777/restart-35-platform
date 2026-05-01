import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { outcomeService } from '~/services/outcomeService'
import { interactionService } from '~/services/interactionService'
import { workerProfileService } from '~/services/workerProfileService'

const router = express.Router()

/**
 * @route   GET /v1/dashboard
 * @desc    Lấy dashboard data cho user đã đăng nhập
 * @access  Private
 */
router.get('/',
  authMiddleware.isAuthorized,
  async (req, res, next) => {
    try {
      const userId = req.user._id.toString()

      // Lấy profile data
      let profileData = null
      try {
        profileData = await workerProfileService.getMyProfile(userId)
      } catch (e) {
        profileData = null
      }

      // Lấy outcome stats
      let outcomeStats = {
        totalApplications: 0,
        pendingApplications: 0,
        interviewedApplications: 0,
        acceptedApplications: 0,
        rejectedApplications: 0,
      }
      try {
        const outcomes = await outcomeService.getUserOutcomes(userId)
        if (outcomes) {
          outcomeStats = {
            totalApplications: outcomes.length || 0,
            pendingApplications: outcomes.filter(o => o.status === 'pending').length,
            interviewedApplications: outcomes.filter(o => o.status === 'interview').length,
            acceptedApplications: outcomes.filter(o => o.status === 'accepted').length,
            rejectedApplications: outcomes.filter(o => o.status === 'rejected').length,
          }
        }
      } catch (e) {
        // ignore
      }

      // Lấy interaction stats
      let interactionStats = {
        totalInteractions: 0,
        jobViews: 0,
        jobApplies: 0,
        jobBookmarks: 0,
      }
      try {
        const interactions = await interactionService.getUserInteractions(userId)
        if (interactions) {
          interactionStats = {
            totalInteractions: interactions.length || 0,
            jobViews: interactions.filter(i => i.action === 'view').length,
            jobApplies: interactions.filter(i => i.action === 'apply').length,
            jobBookmarks: interactions.filter(i => i.action === 'bookmark').length,
          }
        }
      } catch (e) {
        // ignore
      }

      res.json({
        success: true,
        message: 'Lấy dashboard thành công',
        data: {
          profile: profileData,
          stats: {
            outcomes: outcomeStats,
            interactions: interactionStats,
          },
          recentOutcomes: [],
        }
      })
    } catch (error) {
      next(error)
    }
  }
)

export { router as dashboardRoute }
