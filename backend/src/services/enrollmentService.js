import { enrollmentModel } from '~/models/enrollmentModel'
import { courseModel } from '~/models/courseModel'
import { userModel } from '~/models/userModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { fundingConfigModel } from '~/models/fundingConfigModel'
import { courseSponsorshipModel } from '~/models/courseSponsorshipModel'
import { partnershipModel } from '~/models/partnershipModel'
import { GET_DB } from '~/config/mongodb'
import { applicationService } from './applicationService'
import { isaRepaymentService } from './isaRepaymentService'
import { notificationService } from './notificationService'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  DEFAULT_PAGE,
  DEFAULT_ITEM_PER_PAGE,
  ENROLLMENT_STATUS_V2,
  ENROLLMENT_PAYMENT_STATUS,
  COMPLETION_STATUS,
  COURSE_STATUS,
  USER_ROLES,
  SCHOLARSHIP_COVERAGE,
  FUNDING_LEARNER_PAY_MODE
} from '~/utils/constants'

const resolveEnrollmentSponsorships = async (profile, course, requestedSource = null) => {
  const sponsorships = await courseSponsorshipModel.findActiveByCourse(course._id.toString())
  const matched = []

  for (const sponsorship of sponsorships) {
    const eligibility = await courseSponsorshipModel.checkEligibility(profile, sponsorship)
    if (!eligibility.eligible) continue

    const linkedCourse = (sponsorship.linkedCourses || []).find(item => item.courseId === course._id.toString())
    const fundedAmount = linkedCourse?.maxAmount ?? sponsorship.maxAmountPerLearner ?? course.fee ?? 0
    const availability = await courseSponsorshipModel.checkAvailability(sponsorship, fundedAmount)
    if (!availability.available) continue

    matched.push({
      sponsorshipId: sponsorship._id.toString(),
      sponsorType: sponsorship.sponsorType,
      fundedAmount,
      disbursedAmount: 0,
      clawbackAmount: 0,
      coverage: linkedCourse?.coverage || sponsorship.coverageType,
      status: 'matched',
      disbursements: [],
      matchedAt: Date.now(),
      _sponsorship: sponsorship
    })
  }

  if (requestedSource) {
    return matched.filter(item => {
      if (requestedSource === 'enterprise_sponsored') return item.sponsorType === USER_ROLES.ENTERPRISE
      if (requestedSource === 'ngo_sponsored') return item.sponsorType === USER_ROLES.NGO
      return true
    })
  }

  return matched
}

const syncEnrollmentFundingMetadata = async (course, sponsorshipMatches) => {
  const partnership = await partnershipModel.findActiveByCourse(course._id.toString())
  const enterpriseSponsorship = sponsorshipMatches.find(item => item.sponsorType === USER_ROLES.ENTERPRISE)

  return {
    source: sponsorshipMatches.length > 1
      ? 'co_funded'
      : enterpriseSponsorship
        ? 'enterprise_sponsored'
        : sponsorshipMatches[0]?.sponsorType === USER_ROLES.NGO
          ? 'ngo_sponsored'
          : partnership
            ? 'enterprise_linked'
            : 'direct',
    partnershipId: partnership?._id?.toString() || null,
    enterpriseId: partnership?.enterpriseId || enterpriseSponsorship?._sponsorship?.sponsorId || null,
    sponsorships: sponsorshipMatches.map(({ _sponsorship, ...rest }) => rest)
  }
}

const processMilestoneDisbursements = async (enrollment, milestoneType = 'completion') => {
  const sponsorships = enrollment.sponsorships || []
  const processed = []

  for (const sponsorshipRecord of sponsorships) {
    const sponsorship = await courseSponsorshipModel.findOneById(sponsorshipRecord.sponsorshipId)
    if (!sponsorship) continue

    const hasAlreadyDisbursed = (sponsorshipRecord.disbursements || []).some(item => item.milestoneType === milestoneType)
    if (hasAlreadyDisbursed) continue

    const shouldDisburse =
      (milestoneType === 'completion' && [ 'completion', 'milestone' ].includes(sponsorship.disbursementModel)) ||
      (milestoneType === 'upfront' && sponsorship.disbursementModel === 'upfront')

    if (!shouldDisburse) continue

    const amount = sponsorshipRecord.fundedAmount || 0
    if (amount <= 0) continue

    const disbursement = {
      enrollmentId: enrollment._id.toString(),
      courseId: enrollment.courseId.toString(),
      amount,
      type: 'disbursement',
      status: 'completed',
      milestoneType,
      createdAt: Date.now()
    }

    await courseSponsorshipModel.incrementSpent(sponsorshipRecord.sponsorshipId, amount)
    await courseSponsorshipModel.addDisbursement(sponsorshipRecord.sponsorshipId, disbursement)

    sponsorshipRecord.disbursedAmount = (sponsorshipRecord.disbursedAmount || 0) + amount
    sponsorshipRecord.status = 'disbursed'
    sponsorshipRecord.disbursements = [...(sponsorshipRecord.disbursements || []), disbursement]

    processed.push({
      sponsorshipId: sponsorshipRecord.sponsorshipId,
      amount,
      recipients: [sponsorship.sponsorId]
    })
  }

  if (processed.length > 0) {
    await enrollmentModel.update(enrollment._id.toString(), {
      sponsorships,
      updatedAt: Date.now()
    })
  }

  return processed
}

const processEnrollmentCompletionTriggers = async (enrollment) => {
  const sponsorshipNotifications = await processMilestoneDisbursements(enrollment, 'completion')

  if (enrollment.partnershipId) {
    const partnership = await partnershipModel.findOneById(enrollment.partnershipId)
    if (partnership) {
      await partnershipModel.incrementStat(enrollment.partnershipId, 'completedLearners', 1)
      await notificationService.notifyPartnershipParticipants(
        partnership,
        notificationService.NOTIFICATION_EVENT_TYPES.ENROLLMENT_COMPLETED_FOR_PARTNERSHIP,
        {
          enrollmentId: enrollment._id.toString(),
          courseId: enrollment.courseId.toString()
        }
      )
    }
  }

  if (sponsorshipNotifications.length > 0) {
    await notificationService.notifySponsors(
      sponsorshipNotifications,
      notificationService.NOTIFICATION_EVENT_TYPES.SPONSORSHIP_DISBURSEMENT_CREATED,
      { enrollmentId: enrollment._id.toString() }
    )
  }

  if (enrollment.scholarship?.scholarshipId) {
    await applicationService.processCompletion(enrollment._id.toString())
  }

  // Tự động nộp đơn nếu khóa học có liên kết việc làm (Cam kết việc làm)
  if (enrollment.sponsorships && enrollment.sponsorships.length > 0) {
    for (const s of enrollment.sponsorships) {
      if (s.sponsorshipId) {
        const sponsorship = await courseSponsorshipModel.findOneById(s.sponsorshipId)
        if (sponsorship && sponsorship.linkedJobId && sponsorship.autoApplyOnCompletion) {
          try {
            await applicationService.applyToJob(sponsorship.linkedJobId.toString(), enrollment.userId.toString(), {
              source: 'course_linked',
              notes: 'Hệ thống tự động nộp hồ sơ dựa trên cam kết việc làm sau khóa học.'
            })
          } catch (e) {
            console.error(`Auto apply failed for enrollment ${enrollment._id}:`, e.message)
          }
        }
      }
    }
  }
}

const processEnrollmentDropTriggers = async (enrollment, reason = null) => {
  const sponsorships = enrollment.sponsorships || []
  const clawbackNotifications = []

  for (const sponsorshipRecord of sponsorships) {
    const amount = sponsorshipRecord.disbursedAmount || 0
    if (amount <= 0) continue

    const sponsorship = await courseSponsorshipModel.findOneById(sponsorshipRecord.sponsorshipId)
    if (!sponsorship?.clawbackPolicy?.enabled) continue

    const clawback = {
      enrollmentId: enrollment._id.toString(),
      courseId: enrollment.courseId.toString(),
      amount,
      status: 'completed',
      reason: reason || enrollment.dropReason || null,
      createdAt: Date.now()
    }

    await courseSponsorshipModel.addClawback(sponsorshipRecord.sponsorshipId, clawback)
    sponsorshipRecord.clawbackAmount = (sponsorshipRecord.clawbackAmount || 0) + amount
    sponsorshipRecord.status = 'clawback'
    sponsorshipRecord.disbursements = [...(sponsorshipRecord.disbursements || []), { ...clawback, type: 'clawback' }]

    clawbackNotifications.push({
      sponsorshipId: sponsorshipRecord.sponsorshipId,
      amount,
      recipients: [sponsorship.sponsorId]
    })
  }

  if (clawbackNotifications.length > 0) {
    await enrollmentModel.update(enrollment._id.toString(), { sponsorships })
    await notificationService.notifySponsors(
      clawbackNotifications,
      notificationService.NOTIFICATION_EVENT_TYPES.SPONSORSHIP_CLAWBACK_CREATED,
      {
        enrollmentId: enrollment._id.toString(),
        reason: reason || enrollment.dropReason || null
      }
    )
  }

  if (enrollment.partnershipId) {
    const partnership = await partnershipModel.findOneById(enrollment.partnershipId)
    if (partnership) {
      await notificationService.notifyPartnershipParticipants(
        partnership,
        notificationService.NOTIFICATION_EVENT_TYPES.ENROLLMENT_DROPPED_WITH_FUNDING,
        {
          enrollmentId: enrollment._id.toString(),
          reason: reason || enrollment.dropReason || null
        }
      )
    }
  }

  if (enrollment.scholarship?.scholarshipId && enrollment.scholarship?.disbursedAmount > 0) {
    await applicationService.processClawback(enrollment._id.toString())
  }
}

const emitEnrollmentNotifications = async (eventType, payload = {}) => {
  const notification = notificationService.buildNotification(eventType, payload)
  return await notificationService.queueNotification(notification)
}

const enrollCourse = async (userId, courseId, data) => {
  try {
    const { motivation, source, scheduleId, scholarshipId } = data

    const user = await userModel.findOneById(userId)
    if (!user || user.role !== USER_ROLES.WORKER) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Chỉ người lao động mới được đăng ký khóa học!')
    }

    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    if (course.status !== COURSE_STATUS.APPROVED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Khóa học chưa được phê duyệt!')
    }

    const existingEnrollment = await enrollmentModel.findOneByUserAndCourse(userId, courseId)
    if (existingEnrollment) {
      if (existingEnrollment.status === ENROLLMENT_STATUS_V2.DROPPED ||
          existingEnrollment.status === ENROLLMENT_STATUS_V2.DROPPED) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đã hủy đăng ký khóa học này. Vui lòng liên hệ hỗ trợ.')
      }
      throw new ApiError(StatusCodes.CONFLICT, 'Bạn đã đăng ký khóa học này rồi!')
    }

    if (course.funding_model === 'learner_paid' && source !== 'enterprise_linked' && source !== 'ngo_sponsored') {
      if (!data.paymentId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn phải hoàn tất thanh toán để ghi danh khóa học này!')
      }
      try {
        const db = GET_DB()
        const { ObjectId } = await import('mongodb')
        const payment = await db.collection('payments').findOne({ _id: new ObjectId(data.paymentId) })
        if (!payment || payment.status !== 'completed') {
          throw new ApiError(StatusCodes.BAD_REQUEST, 'Thanh toán chưa được xác nhận hoàn tất. Vui lòng kiểm tra lại!')
        }
      } catch (error) {
        if (error instanceof ApiError) throw error
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã giao dịch không hợp lệ!')
      }
    }

    const profile = await workerProfileModel.findOneByUserId(userId)
    if (!profile) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng hoàn thành hồ sơ trước khi đăng ký!')
    }

    if (!profile.isCompleted) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng hoàn thành hồ sơ trước khi đăng ký!')
    }

    const eligibility = await checkEligibility(profile, course)
    if (!eligibility.eligible) {
      throw new ApiError(StatusCodes.BAD_REQUEST, eligibility.reason)
    }

    if (eligibility.warning) {
      console.warn(`Enrollment warning for user ${userId}: ${eligibility.warning}`)
    }

    const prereqResult = await checkPrerequisites(userId, course)

    const capacityResult = await checkCapacity(course)

    let finalStatus = ENROLLMENT_STATUS_V2.ACTIVE
    let waitlistPosition = null

    if (source === 'ngo_sponsored') {
      finalStatus = ENROLLMENT_STATUS_V2.PENDING_REVIEW
    } else if (!capacityResult.available) {
      finalStatus = ENROLLMENT_STATUS_V2.ACTIVE
      const waitlistCount = await enrollmentModel.findByCourse(courseId, 0, 100, {
        status: ENROLLMENT_STATUS_V2.ACTIVE
      })
      waitlistPosition = waitlistCount.totalEnrollments + 1
    }

    const sponsorshipMatches = await resolveEnrollmentSponsorships(profile, course, source)
    const fundingMetadata = await syncEnrollmentFundingMetadata(course, sponsorshipMatches)

    const enrollmentData = {
      userId: userId,
      courseId: courseId,
      scheduleId: scheduleId || null,
      status: finalStatus,
      payment_status: ENROLLMENT_PAYMENT_STATUS.PENDING,
      motivation: motivation || null,
      source: fundingMetadata.source || source || 'direct',
      partnershipId: fundingMetadata.partnershipId,
      enterpriseId: fundingMetadata.enterpriseId,
      sponsorships: fundingMetadata.sponsorships,
      scholarship: {
        scholarshipId: scholarshipId || null,
        applicationId: null,
        coverage: scholarshipId ? SCHOLARSHIP_COVERAGE.PARTIAL : SCHOLARSHIP_COVERAGE.NONE,
        fundedAmount: 0,
        disbursedAmount: 0,
        clawbackAmount: 0,
        disbursements: []
      },
      fee: {
        total: course.isFree ? 0 : course.fee,
        paid: 0,
        pending: course.isFree ? 0 : course.fee
      },
      waitlistPosition,
      enrolledAt: Date.now(),
      startDate: (finalStatus === ENROLLMENT_STATUS_V2.ACTIVE) ? Date.now() : null,
      prerequisiteWarnings: prereqResult.passed ? [] : prereqResult.missing
    }

    const result = await enrollmentModel.createNew(enrollmentData)

    if (finalStatus === ENROLLMENT_STATUS_V2.ACTIVE) {
      await courseModel.incrementEnrollmentCount(courseId)
    }

    const enrollment = await enrollmentModel.findOneById(result.insertedId)

    if (data.paymentId) {
      const db = GET_DB()
      const { ObjectId } = await import('mongodb')
      await db.collection('payments').updateOne(
        { _id: new ObjectId(data.paymentId) },
        { $set: { enrollmentId: enrollment._id.toString() } }
      )
      const payment = await db.collection('payments').findOne({ _id: new ObjectId(data.paymentId) })
      if (payment && payment.status === 'completed') {
        const totalFee = enrollment.fee?.total || course.fee || 0
        if (payment.amount >= totalFee) {
          await enrollmentModel.updatePaymentStatus(enrollment._id.toString(), ENROLLMENT_PAYMENT_STATUS.PAID)
          enrollment.payment_status = ENROLLMENT_PAYMENT_STATUS.PAID
        } else {
          await enrollmentModel.updatePaymentStatus(enrollment._id.toString(), ENROLLMENT_PAYMENT_STATUS.INSTALLMENT_ACTIVE)
          enrollment.payment_status = ENROLLMENT_PAYMENT_STATUS.INSTALLMENT_ACTIVE
        }
      }
    }

    if (fundingMetadata.sponsorships.length > 0) {
      await emitEnrollmentNotifications(
        notificationService.NOTIFICATION_EVENT_TYPES.SPONSORSHIP_ELIGIBLE_MATCH_FOUND,
        {
          enrollmentId: enrollment._id.toString(),
          courseId,
          matches: fundingMetadata.sponsorships,
          recipients: fundingMetadata.sponsorships.map(item => item.sponsorshipId)
        }
      )
    }

    // Auto-create ISA record nếu khóa học có funding_model = ISA
    if (course.funding_model === FUNDING_LEARNER_PAY_MODE.ISA && enrollment) {
      try {
        const fundingConfig = await fundingConfigModel.findByCourse(courseId)
        if (fundingConfig) {
          await isaRepaymentService.createIsaRepayment(enrollment._id.toString(), fundingConfig.configs)
          await enrollmentModel.updatePaymentStatus(enrollment._id.toString(), ENROLLMENT_PAYMENT_STATUS.ISA_PENDING)
        }
      } catch (isaError) {
        console.error(`Failed to auto-create ISA for enrollment ${enrollment._id}:`, isaError.message)
      }
    }

    return {
      enrollment,
      result: {
        status: finalStatus,
        waitlistPosition,
        eligibility,
        capacity: capacityResult,
        prerequisiteWarnings: prereqResult.passed ? [] : prereqResult.missing
      }
    }
  } catch (error) { throw error }
}

// ============ GET MY ENROLLMENTS ============
const getMyEnrollments = async (userId, queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      status,
      source,
      courseId
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (status) filters.status = status
    if (source) filters.source = source
    if (courseId) filters.courseId = courseId

    const { enrollments, totalEnrollments } = await enrollmentModel.findByUser(
      userId,
      skip,
      recordLimit,
      filters
    )

    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        // #region agent debug log
        fetch('http://127.0.0.1:7657/ingest/50723660-d880-4eec-a288-d8347939a202',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1e17d2'},body:JSON.stringify({sessionId:'1e17d2',location:'enrollmentService.js:getMyEnrollments',message:'raw enrollment.courseId',data:{userId,enrollmentId:String(enrollment._id),courseId:enrollment.courseId,typeof:typeof enrollment.courseId},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const course = await courseModel.findOneById(enrollment.courseId)
        const installments = await getInstallmentsForEnrollment(enrollment._id, course, enrollment)
        return {
          ...enrollment,
          course: course ? {
            _id: course._id,
            title: course.title,
            slug: course.slug,
            thumbnail: course.thumbnail,
            duration: course.duration,
            schedule: course.schedule,
            location: course.location,
            providerId: course.providerId
          } : null,
          installments
        }
      })
    )

    return {
      enrollments: enrichedEnrollments,
      pagination: {
        totalRecords: totalEnrollments,
        totalPages: Math.ceil(totalEnrollments / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// ============ GET ENROLLMENTS BY COURSE ============
const getEnrollmentsByCourse = async (courseId, queryParams, trainerId = null) => {
  try {
    const course = await courseModel.findOneById(courseId)
    if (!course) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
    }

    if (trainerId && course.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem danh sách học viên!')
      }
    }

    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      status,
      source
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (status) filters.status = status
    if (source) filters.source = source

    const { enrollments, totalEnrollments } = await enrollmentModel.findByCourse(
      courseId,
      skip,
      recordLimit,
      filters
    )

    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const userInfo = await userModel.findOneById(enrollment.userId)
        const profile = await workerProfileModel.findOneByUserId(enrollment.userId)
        return {
          ...enrollment,
          user: userInfo ? {
            _id: userInfo._id,
            displayName: userInfo.displayName,
            email: userInfo.email,
            avatar: userInfo.avatar,
            phone: userInfo.phone
          } : null,
          profile: profile ? {
            basicInfo: profile.basicInfo
          } : null
        }
      })
    )

    return {
      enrollments: enrichedEnrollments,
      pagination: {
        totalRecords: totalEnrollments,
        totalPages: Math.ceil(totalEnrollments / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

const getInstallmentsForEnrollment = async (enrollmentId, course, enrollment) => {
  if (!course || course.funding_model !== 'learner_paid') {
    return []
  }

  const db = GET_DB()
  const payments = await db.collection('payments').find({
    enrollmentId: enrollmentId.toString(),
    _destroy: { $ne: true }
  }).toArray()

  const totalFee = enrollment.fee?.total || course.fee || 0
  const installmentCount = 4
  const installmentAmount = Math.round(totalFee / installmentCount)

  return Array.from({ length: installmentCount }).map((_, idx) => {
    const instNum = idx + 1
    const amount = installmentAmount

    const payment = payments[idx]
    const dueDate = new Date(enrollment.enrolledAt)
    dueDate.setDate(dueDate.getDate() + (idx * 30))

    return {
      installmentNumber: instNum,
      amount,
      dueDate: dueDate.getTime(),
      paidAt: payment && payment.status === 'completed' ? payment.completedAt || payment.updatedAt : null,
      status: payment ? (payment.status === 'completed' ? 'paid' : payment.status) : 'upcoming',
      paymentId: payment ? payment._id.toString() : null,
      qrUrl: payment ? payment.qrUrl : null
    }
  })
}

// ============ GET ENROLLMENT BY ID ============
const getEnrollmentById = async (enrollmentId, userId = null, userRole = null) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (userId) {
      const course = await courseModel.findOneById(enrollment.courseId)
      const isOwner = enrollment.userId.toString() === userId
      const isTrainer = course && course.providerId.toString() === userId
      const isAdmin = userRole === USER_ROLES.ADMIN

      if (!isOwner && !isTrainer && !isAdmin) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem thông tin này!')
      }
    }

    const course = await courseModel.findOneById(enrollment.courseId)
    const userInfo = await userModel.findOneById(enrollment.userId)
    const profile = await workerProfileModel.findOneByUserId(enrollment.userId)

    const installments = await getInstallmentsForEnrollment(enrollmentId, course, enrollment)

    return {
      ...enrollment,
      course: course ? {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        thumbnail: course.thumbnail,
        duration: course.duration,
        schedule: course.schedule,
        location: course.location,
        level: course.level,
        skills: course.skills,
        syllabus: course.syllabus,
        providerId: course.providerId
      } : null,
      user: userInfo ? {
        _id: userInfo._id,
        displayName: userInfo.displayName,
        email: userInfo.email,
        avatar: userInfo.avatar,
        phone: userInfo.phone
      } : null,
      profile: profile || null,
      installments
    }
  } catch (error) { throw error }
}

// ============ UPDATE PROGRESS ============
const updateProgress = async (enrollmentId, progressData, trainerId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const course = await courseModel.findOneById(enrollment.courseId)
    if (course.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật tiến độ!')
      }
    }

    if (![ENROLLMENT_STATUS_V2.ACTIVE, ENROLLMENT_STATUS_V2.IN_PROGRESS].includes(enrollment.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể cập nhật tiến độ ở trạng thái này!')
    }

    const updateData = {
      percentage: progressData.percentage,
      currentLesson: progressData.currentLesson,
      totalLessons: progressData.totalLessons,
      assessments: progressData.assessments,
      notes: progressData.notes
    }

    const updatedEnrollment = await enrollmentModel.updateProgress(enrollmentId, updateData)

    // Xử lý khi hoàn thành 100%
    if (progressData.percentage >= 100 && enrollment.status !== ENROLLMENT_STATUS_V2.COMPLETED) {
      const completedEnrollment = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.COMPLETED, {
        completedAt: Date.now()
      })
      await courseModel.decrementEnrollmentCount(enrollment.courseId)
      await processEnrollmentCompletionTriggers(completedEnrollment)
    } else if (progressData.percentage > 0 && progressData.percentage < 100) {
      if (enrollment.status === ENROLLMENT_STATUS_V2.ACTIVE) {
        await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.IN_PROGRESS)
      }
    }

    return await enrollmentModel.findOneById(enrollmentId)
  } catch (error) { throw error }
}

// ============ UPDATE STATUS ============
const updateStatus = async (enrollmentId, status, additionalData, trainerId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const course = await courseModel.findOneById(enrollment.courseId)
    if (course.providerId.toString() !== trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật trạng thái!')
      }
    }

    const validTransitions = {
      [ENROLLMENT_STATUS_V2.ACTIVE]: [ENROLLMENT_STATUS_V2.IN_PROGRESS, ENROLLMENT_STATUS_V2.DROPPED, ENROLLMENT_STATUS_V2.SUSPENDED],
      [ENROLLMENT_STATUS_V2.IN_PROGRESS]: [ENROLLMENT_STATUS_V2.COMPLETED, ENROLLMENT_STATUS_V2.DROPPED, ENROLLMENT_STATUS_V2.SUSPENDED],
      [ENROLLMENT_STATUS_V2.SUSPENDED]: [ENROLLMENT_STATUS_V2.ACTIVE, ENROLLMENT_STATUS_V2.IN_PROGRESS, ENROLLMENT_STATUS_V2.DROPPED]
    }

    const allowedTransitions = validTransitions[enrollment.status] || []
    if (!allowedTransitions.includes(status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể chuyển từ "${enrollment.status}" sang "${status}"`
      )
    }

    const updateData = {
      status,
      updatedBy: trainerId
    }

    if (additionalData.dropReason) {
      updateData.dropReason = additionalData.dropReason
    }
    if (additionalData.notes) {
      updateData.notes = additionalData.notes
    }
    if (additionalData.startDate) {
      updateData.startDate = additionalData.startDate
    }
    if (additionalData.endDate) {
      updateData.endDate = additionalData.endDate
    }

    const updatedEnrollment = await enrollmentModel.updateStatus(enrollmentId, status, updateData)

    if (status === ENROLLMENT_STATUS_V2.COMPLETED) {
      await courseModel.decrementEnrollmentCount(enrollment.courseId)
      await processEnrollmentCompletionTriggers(updatedEnrollment)
    }

    if (status === ENROLLMENT_STATUS_V2.ACTIVE && enrollment.status === ENROLLMENT_STATUS_V2.ACTIVE) {
      await courseModel.incrementEnrollmentCount(enrollment.courseId)

      const nextInWaitlist = await enrollmentModel.promoteFromWaitlist(enrollment.courseId)
      if (nextInWaitlist) {
        await courseModel.incrementEnrollmentCount(enrollment.courseId)
      }
    }

    if (status === ENROLLMENT_STATUS_V2.DROPPED || status === ENROLLMENT_STATUS_V2.FAILED) {
      await courseModel.decrementEnrollmentCount(enrollment.courseId)
      await processEnrollmentDropTriggers(updatedEnrollment, updateData.dropReason || updateData.reason || null)
    }

    return updatedEnrollment
  } catch (error) { throw error }
}

// ============ COMPLETE ITEM ============
const completeItem = async (enrollmentId, itemId, userId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.userId.toString() !== userId.toString()) {
      const course = await courseModel.findOneById(enrollment.courseId)
      const user = await userModel.findOneById(userId)
      if (course?.providerId.toString() !== userId.toString() && user?.role !== USER_ROLES.ADMIN) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thao tác với đăng ký này!')
      }
    }

    // Get total items from existing progress or default to 1
    const totalItems = enrollment.progress?.totalLessons || 1;

    const updatedEnrollmentResult = await enrollmentModel.markItemCompleted(enrollmentId, itemId, totalItems)
    const updatedEnrollment = updatedEnrollmentResult?.value || updatedEnrollmentResult

    if (updatedEnrollment?.progress?.completionStatus === COMPLETION_STATUS.COMPLETED && enrollment.status !== ENROLLMENT_STATUS_V2.COMPLETED) {
      await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.COMPLETED, {
        completedAt: Date.now()
      })
      await courseModel.decrementEnrollmentCount(enrollment.courseId)
      await processEnrollmentCompletionTriggers(updatedEnrollment)
    }

    return updatedEnrollment
  } catch (error) { throw error }
}

// ============ CANCEL ENROLLMENT ============
const cancelEnrollment = async (enrollmentId, userId, reason) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.userId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền hủy đăng ký này!')
    }

    const cancellableStatuses = [
      ENROLLMENT_STATUS_V2.ACTIVE,
      ENROLLMENT_STATUS_V2.IN_PROGRESS,
      ENROLLMENT_STATUS_V2.SUSPENDED
    ]

    if (!cancellableStatuses.includes(enrollment.status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể hủy đăng ký ở trạng thái này!'
      )
    }

    const updatedEnrollment = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.DROPPED, {
      dropReason: reason,
      cancelledAt: Date.now()
    })

    if (enrollment.status === ENROLLMENT_STATUS_V2.ACTIVE ||
        enrollment.status === ENROLLMENT_STATUS_V2.IN_PROGRESS) {
      await courseModel.decrementEnrollmentCount(enrollment.courseId)
    }

    if (enrollment.status === ENROLLMENT_STATUS_V2.ACTIVE) {
      const nextInWaitlist = await enrollmentModel.promoteFromWaitlist(enrollment.courseId)
      if (nextInWaitlist) {
        console.log(`Promoted user ${nextInWaitlist.userId} from waitlist for course ${enrollment.courseId}`)
      }
    }

    // Xử lý refund nếu có scholarship đã giải ngân
    if (enrollment.scholarship?.scholarshipId && enrollment.scholarship?.disbursedAmount > 0) {
      await applicationService.processRefund(enrollmentId)
    }

    await processEnrollmentDropTriggers(updatedEnrollment, reason)

    return updatedEnrollment
  } catch (error) { throw error }
}

// ============ GET ALL ENROLLMENTS (Admin) ============
const getAllEnrollments = async (queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      status,
      courseId,
      startDate,
      endDate
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (status) filters.status = status
    if (courseId) filters.courseId = courseId
    if (startDate) filters.enrolledAt = { $gte: new Date(startDate) }
    if (endDate) filters.enrolledAt = { ...filters.enrolledAt, $lte: new Date(endDate) }

    const { enrollments, totalEnrollments } = await enrollmentModel.findAll(skip, recordLimit, filters)

    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await courseModel.findOneById(enrollment.courseId)
        const userInfo = await userModel.findOneById(enrollment.userId)
        const installments = await getInstallmentsForEnrollment(enrollment._id, course, enrollment)
        return {
          ...enrollment,
          course: course ? {
            _id: course._id,
            title: course.title,
            slug: course.slug
          } : null,
          user: userInfo ? {
            _id: userInfo._id,
            displayName: userInfo.displayName,
            email: userInfo.email
          } : null,
          installments
        }
      })
    )

    return {
      enrollments: enrichedEnrollments,
      pagination: {
        totalRecords: totalEnrollments,
        totalPages: Math.ceil(totalEnrollments / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// ============ GET ENROLLMENT STATS ============
const getEnrollmentStats = async (courseId = null, trainerId = null) => {
  try {
    if (courseId) {
      const course = await courseModel.findOneById(courseId)
      if (!course) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Khóa học không tồn tại!')
      }

      if (trainerId && course.providerId.toString() !== trainerId) {
        const user = await userModel.findOneById(trainerId)
        if (user.role !== USER_ROLES.ADMIN) {
          throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem thống kê!')
        }
      }

      return await enrollmentModel.getStatsByCourse(courseId)
    }

    if (trainerId) {
      const user = await userModel.findOneById(trainerId)
      if (user && user.role === USER_ROLES.ADMIN) {
        return await enrollmentModel.getOverallStats()
      }
      return await enrollmentModel.getOverallStats(trainerId)
    }

    return await enrollmentModel.getOverallStats()
  } catch (error) { throw error }
}

// ============ HELPER FUNCTIONS ============
const checkEligibility = async (profile, course) => {
  const age = profile.basicInfo?.age
  if (age < 35 || age > 65) {
    return {
      eligible: false,
      reason: 'Độ tuổi không phù hợp với khóa học này (yêu cầu 35-65 tuổi)'
    }
  }

  if (profile.barriers?.location && course.location?.type === 'offline') {
    return {
      eligible: true,
      warning: 'Bạn có rào cản về địa điểm. Khóa học này học trực tiếp.',
      suggestion: 'Cân nhắc khóa học online tương đương'
    }
  }

  if (profile.barriers?.health) {
    return {
      eligible: true,
      warning: 'Bạn có rào cản về sức khỏe. Vui lòng cân nhắc trước khi đăng ký.'
    }
  }

  return { eligible: true }
}

const checkPrerequisites = async (userId, course) => {
  if (!course.prerequisites || course.prerequisites.length === 0) {
    return { passed: true }
  }

  const completedEnrollments = await enrollmentModel.findCompletedByUser(userId)

  if (completedEnrollments.length === 0) {
    return {
      passed: false,
      missing: course.prerequisites
    }
  }

  const completedCourseIds = completedEnrollments.map(e => e.courseId.toString())

  const missing = []
  for (const prereq of course.prerequisites) {
    const prereqLower = prereq.toLowerCase()
    const hasCompleted = completedEnrollments.some(e => {
      const title = e.courseId?.title?.toLowerCase() || ''
      return title.includes(prereqLower) || completedCourseIds.includes(prereq)
    })

    if (!hasCompleted) {
      missing.push(prereq)
    }
  }

  return {
    passed: missing.length === 0,
    missing
  }
}

const checkCapacity = async (course) => {
  if (course.currentStudents >= course.maxStudents) {
    return {
      available: false,
      reason: 'Khóa học đã đầy',
      currentStudents: course.currentStudents,
      maxStudents: course.maxStudents
    }
  }

  return {
    available: true,
    currentStudents: course.currentStudents,
    maxStudents: course.maxStudents,
    slotsAvailable: course.maxStudents - course.currentStudents
  }
}

// ============ GET ADMIN STATS ============
const getAdminStats = async () => {
  const stats = await enrollmentModel.getAdminStats()
  const monthlyTrend = await enrollmentModel.getMonthlyTrend(6)
  return {
    ...stats,
    monthlyTrend
  }
}

const getMonthlyTrend = async (months = 6) => {
  return await enrollmentModel.getMonthlyTrend(months)
}

const getEnrollmentsForExport = async (filters = {}) => {
  return await enrollmentModel.getEnrollmentsForExport(filters)
}

// ============ DROP ENROLLMENT (Worker tự bỏ) ============
const dropEnrollment = async (enrollmentId, userId, dropReason) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền hủy đăng ký này!')
    }

    if (enrollment.status === ENROLLMENT_STATUS_V2.DROPPED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đăng ký này đã bị hủy trước đó!')
    }

    if (enrollment.status === ENROLLMENT_STATUS_V2.COMPLETED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể hủy đăng ký đã hoàn thành!')
    }

    const updated = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.DROPPED, {
      dropReason: dropReason || null
    })

    if (enrollment.status !== ENROLLMENT_STATUS_V2.ACTIVE) {
      await courseModel.decrementEnrollmentCount(enrollment.courseId.toString())
    }

    await processEnrollmentDropTriggers(updated, dropReason)

    return updated
  } catch (error) { throw error }
}

// ============ SUSPEND ENROLLMENT (Trainer/Admin tạm ngưng) ============
const suspendEnrollment = async (enrollmentId, trainerId, reason) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.status !== ENROLLMENT_STATUS_V2.ACTIVE && enrollment.status !== ENROLLMENT_STATUS_V2.IN_PROGRESS) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể tạm ngưng đăng ký đang hoạt động!')
    }

    const updated = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.SUSPENDED, {
      notes: reason || null
    })

    return updated
  } catch (error) { throw error }
}

// ============ COMPLETE ENROLLMENT (Trainer/Admin hoàn thành) ============
const completeEnrollment = async (enrollmentId, trainerId, options = {}) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.status === ENROLLMENT_STATUS_V2.COMPLETED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đăng ký này đã hoàn thành trước đó!')
    }

    if (enrollment.status !== ENROLLMENT_STATUS_V2.ACTIVE &&
        enrollment.status !== ENROLLMENT_STATUS_V2.IN_PROGRESS &&
        enrollment.status !== ENROLLMENT_STATUS_V2.SUSPENDED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể hoàn thành đăng ký ở trạng thái hiện tại!')
    }

    const updateData = {}
    if (options.score !== undefined && options.score !== null) {
      updateData.assessments = [
        ...(enrollment.assessments || []),
        { name: 'Kết thúc khóa học', score: options.score, passed: options.score >= 60, date: Date.now() }
      ]
    }

    const updated = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.COMPLETED, updateData)
    await processEnrollmentCompletionTriggers(updated)

    // Auto-create certificate when enrollment is completed
    try {
      const { certificateService } = await import('./certificateService')
      await certificateService.createCertificateForEnrollment(enrollmentId, trainerId)
    } catch (certError) {
      console.error(`Failed to auto-create certificate for enrollment ${enrollmentId}:`, certError.message)
    }

    return updated
  } catch (error) { throw error }
}

// ============ FAIL ENROLLMENT (Trainer/Admin fail) ============
const failEnrollment = async (enrollmentId, trainerId, reason) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    if (enrollment.status === ENROLLMENT_STATUS_V2.COMPLETED || enrollment.status === ENROLLMENT_STATUS_V2.DROPPED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể đánh fail đăng ký đã kết thúc!')
    }

    const updated = await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.FAILED, {
      dropReason: reason || 'Không đạt yêu cầu khóa học'
    })

    if (enrollment.status !== ENROLLMENT_STATUS_V2.ACTIVE) {
      await courseModel.decrementEnrollmentCount(enrollment.courseId.toString())
    }

    await processEnrollmentDropTriggers(updated, reason)

    return updated
  } catch (error) { throw error }
}

// ============ GET RISK LIST ============
const getRiskList = async (queryParams) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      level
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const filters = {}
    if (level) {
      filters['dropout_risk.level'] = level
    } else {
      filters['dropout_risk.level'] = { $in: ['medium', 'high'] }
    }

    const { enrollments, totalEnrollments } = await enrollmentModel.findAll(skip, recordLimit, filters)

    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await courseModel.findOneById(enrollment.courseId)
        const userInfo = await userModel.findOneById(enrollment.userId)
        return {
          ...enrollment,
          course: course ? {
            _id: course._id,
            title: course.title,
            slug: course.slug
          } : null,
          user: userInfo ? {
            _id: userInfo._id,
            displayName: userInfo.displayName,
            email: userInfo.email,
            phone: userInfo.phone
          } : null
        }
      })
    )

    return {
      enrollments: enrichedEnrollments,
      pagination: {
        totalRecords: totalEnrollments,
        totalPages: Math.ceil(totalEnrollments / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) { throw error }
}

// ============ GET RISK DETAIL ============
const getEnrollmentRiskDetail = async (enrollmentId, userId, userRole) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const course = await courseModel.findOneById(enrollment.courseId)
    const isOwner = enrollment.userId.toString() === userId
    const isTrainer = course && course.providerId.toString() === userId
    const isAdmin = userRole === USER_ROLES.ADMIN

    if (!isOwner && !isTrainer && !isAdmin) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem thông tin này!')
    }

    return enrollment.dropout_risk || { score: 0, level: 'low', reasons: [], last_calculated_at: null, interventions_sent: [] }
  } catch (error) { throw error }
}

// ============ TRIGGER INTERVENTION ============
const triggerManualIntervention = async (enrollmentId, type, trainerId) => {
  try {
    const enrollment = await enrollmentModel.findOneById(enrollmentId)
    if (!enrollment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Đăng ký không tồn tại!')
    }

    const course = await courseModel.findOneById(enrollment.courseId)
    const isTrainer = course && course.providerId.toString() === trainerId
    const user = await userModel.findOneById(trainerId)
    const isAdmin = user.role === USER_ROLES.ADMIN

    if (!isTrainer && !isAdmin) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thực hiện can thiệp cho học viên này!')
    }

    const userId = enrollment.userId.toString()
    let success = false

    if (type === 'zalo_reminder') {
      const { interventionService } = await import('./interventionService')
      success = await interventionService.sendZaloReminder(userId)
      if (success) {
        await interventionService.logIntervention(enrollmentId, 'zalo_reminder')
      }
    } else if (type === 'email_alert') {
      const { interventionService } = await import('./interventionService')
      success = await interventionService.sendEmailAlert(userId)
      if (success) {
        await interventionService.logIntervention(enrollmentId, 'email_alert')
      }
    } else if (type === 'trainer_notified') {
      const { interventionService } = await import('./interventionService')
      success = await interventionService.notifyTrainer(enrollment.courseId.toString(), userId)
      if (success) {
        await interventionService.logIntervention(enrollmentId, 'trainer_notified')
      }
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Loại can thiệp không hợp lệ!')
    }

    return { success }
  } catch (error) { throw error }
}

// ============ GET TRAINER ENROLLMENTS ============
const getTrainerEnrollments = async (queryParams, trainerId) => {
  try {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_ITEM_PER_PAGE,
      status,
      courseId,
      riskLevel,
      search
    } = queryParams

    const currentPage = parseInt(page, 10) || DEFAULT_PAGE
    const recordLimit = parseInt(limit, 10) || DEFAULT_ITEM_PER_PAGE
    const skip = (currentPage - 1) * recordLimit

    const db = GET_DB()

    // 1. Get all courses owned by the trainer
    const { courses } = await courseModel.findByProvider(trainerId, 0, 10000)
    const ownedCourseIds = courses.map(c => c._id.toString())

    // If no courses, return empty
    if (ownedCourseIds.length === 0) {
      return {
        enrollments: [],
        pagination: {
          totalRecords: 0,
          totalPages: 0,
          currentPage,
          limit: recordLimit
        }
      }
    }

    const filters = {
      _destroy: { $ne: true }
    }

    // 2. Filter by courseId
    if (courseId) {
      if (!ownedCourseIds.includes(courseId)) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem thông tin khóa học này!')
      }
      filters.courseId = courseId
    } else {
      filters.courseId = { $in: ownedCourseIds }
    }

    // 3. Filter by status
    if (status) {
      filters.status = status
    }

    // 4. Filter by risk level (dropout_risk.level)
    if (riskLevel) {
      filters['dropout_risk.level'] = riskLevel
    }

    // 5. Filter by search (name or email)
    if (search) {
      const users = await db.collection(userModel.USER_COLLECTION_NAME).find({
        role: USER_ROLES.WORKER,
        _destroy: { $ne: true },
        $or: [
          { displayName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).toArray()
      
      const userIds = users.map(u => u._id.toString())
      if (userIds.length === 0) {
        return {
          enrollments: [],
          pagination: {
            totalRecords: 0,
            totalPages: 0,
            currentPage,
            limit: recordLimit
          }
        }
      }
      filters.userId = { $in: userIds }
    }

    // 6. Query enrollments using enrollmentModel.findAll
    const { enrollments, totalEnrollments } = await enrollmentModel.findAll(skip, recordLimit, filters)

    // 7. Enrich enrollments with course details, user details, and profiles
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await courseModel.findOneById(enrollment.courseId)
        const userInfo = await userModel.findOneById(enrollment.userId)
        const profile = await workerProfileModel.findOneByUserId(enrollment.userId)
        return {
          ...enrollment,
          course: course ? {
            _id: course._id,
            title: course.title,
            slug: course.slug,
            thumbnail: course.thumbnail,
            duration: course.duration,
            schedule: course.schedule,
            location: course.location,
            providerId: course.providerId
          } : null,
          user: userInfo ? {
            _id: userInfo._id,
            displayName: userInfo.displayName,
            email: userInfo.email,
            avatar: userInfo.avatar,
            phone: userInfo.phone
          } : null,
          profile: profile || null
        }
      })
    )

    return {
      enrollments: enrichedEnrollments,
      pagination: {
        totalRecords: totalEnrollments,
        totalPages: Math.ceil(totalEnrollments / recordLimit),
        currentPage,
        limit: recordLimit
      }
    }
  } catch (error) {
    throw error
  }
}

export const enrollmentService = {
  // Core
  enrollCourse,
  getMyEnrollments,
  getEnrollmentsByCourse,
  getEnrollmentById,
  getAllEnrollments,
  getTrainerEnrollments,

  // Update
  updateProgress,
  completeItem,
  updateStatus,
  cancelEnrollment,
  dropEnrollment,
  suspendEnrollment,
  completeEnrollment,
  failEnrollment,

  // Stats
  getEnrollmentStats,

  // Admin
  getAdminStats,
  getMonthlyTrend,
  getEnrollmentsForExport,
  getRiskList,
  getEnrollmentRiskDetail,
  triggerManualIntervention,

  // Helpers
  checkEligibility,
  checkPrerequisites,
  checkCapacity
}
