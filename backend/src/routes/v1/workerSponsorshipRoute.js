import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { enrollmentModel } from '~/models/enrollmentModel'
import { courseModel } from '~/models/courseModel'
import { courseSponsorshipModel } from '~/models/courseSponsorshipModel'

const Router = express.Router()

// GET /v1/worker-sponsorships/my - Get worker's sponsorships
Router.get('/my', authMiddleware.isAuthorized, async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id.toString()

    // Find all enrollments with sponsorships for this worker
    const db = GET_DB()
    const enrollments = await db.collection('enrollments')
      .find({
        userId,
        _destroy: { $ne: true },
        'sponsorships.0': { $exists: true }
      })
      .toArray()

    // Enrich with course and sponsorship details
    const enriched = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await courseModel.findOneById(enrollment.courseId)

        const enrichedSponsorships = await Promise.all(
          (enrollment.sponsorships || []).map(async (s) => {
            let sponsorship = null
            try {
              sponsorship = await courseSponsorshipModel.findOneById(s.sponsorshipId)
            } catch { /* sponsorship might have been deleted */ }

            return {
              sponsorshipId: s.sponsorshipId,
              sponsorType: s.sponsorType,
              fundedAmount: s.fundedAmount || 0,
              disbursedAmount: s.disbursedAmount || 0,
              clawbackAmount: s.clawbackAmount || 0,
              coverage: s.coverage,
              status: s.status,
              disbursements: s.disbursements || [],
              // Flattened sponsorship info for display
              sponsorshipTitle: sponsorship?.title || 'Chương trình tài trợ',
              sponsorOrg: sponsorship?.sponsorId ? `ID: ${sponsorship.sponsorId}` : 'Không xác định',
              disbursementModel: sponsorship?.disbursementModel || 'upfront',
              // Clawback policy
              clawbackEnabled: sponsorship?.clawbackPolicy?.enabled || false,
              refundOnDrop: sponsorship?.clawbackPolicy?.refundOnDrop || false,
            }
          })
        )

        return {
          enrollmentId: enrollment._id.toString(),
          courseId: enrollment.courseId.toString(),
          courseName: course?.title || course?.name || 'Khóa học',
          enrollmentStatus: enrollment.status,
          enrolledAt: enrollment.createdAt,
          sponsorships: enrichedSponsorships
        }
      })
    )

    res.status(StatusCodes.OK).json({
      success: true,
      data: enriched,
      total: enriched.length
    })
  } catch (error) {
    next(error)
  }
})

export default Router
