/**
 * Dropout Risk Calculation Cron Job Script
 *
 * Chạy hàng ngày lúc 08:00 (hoặc chạy thủ công khi cần)
 * 1. Lấy tất cả enrollment đang hoạt động ('active', 'in_progress')
 * 2. Tính toán chỉ số:
 *    - daysInactive: Số ngày từ lần học cuối (hoặc từ ngày đăng ký nếu chưa học)
 *    - avgDailyProgress: % tiến độ trung bình/ngày kể từ ngày bắt đầu
 *    - paymentStatus: Trạng thái đóng học phí
 * 3. Tính điểm nguy cơ (score từ 0 - 100), xác định level ('low', 'medium', 'high')
 * 4. Kích hoạt can thiệp (intervention): gửi Zalo / Email nhắc nhở học viên và trainer
 *
 * Usage:
 *   npx babel-node src/scripts/dropoutRiskCron.js         # Dry run
 *   npx babel-node src/scripts/dropoutRiskCron.js --run   # Thực thi lưu DB
 */

import 'dotenv/config'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { interventionService } from '~/services/interventionService'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry') || !args.includes('--run')

const ENROLLMENT_COLLECTION = 'enrollments'
const LESSON_PROGRESS_COLLECTION = 'lesson_progress'

async function getTargetEnrollments() {
  const db = GET_DB()
  return await db.collection(ENROLLMENT_COLLECTION)
    .find({
      status: { $in: ['active', 'in_progress'] },
      _destroy: { $ne: true }
    })
    .toArray()
}

async function getLatestLessonProgress(enrollmentId) {
  const db = GET_DB()
  const records = await db.collection(LESSON_PROGRESS_COLLECTION)
    .find({ enrollmentId: String(enrollmentId), _destroy: { $ne: true } })
    .sort({ lastWatchedAt: -1 })
    .limit(1)
    .toArray()

  return records[0] || null
}

async function processDropoutRisk() {
  const db = GET_DB()
  const now = new Date()

  console.log('='.repeat(60))
  console.log(`Dropout Risk Analysis — Running at ${now.toLocaleString()}`)
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'LIVE EXECUTION'}`)
  console.log('='.repeat(60))

  const enrollments = await getTargetEnrollments()
  console.log(`Found ${enrollments.length} active/in-progress enrollments to analyze.\n`)

  let highRiskCount = 0
  let mediumRiskCount = 0
  let lowRiskCount = 0

  for (const enrollment of enrollments) {
    const enrollmentId = enrollment._id.toString()
    const userId = enrollment.userId
    const courseId = enrollment.courseId

    // 1. Calculate daysInactive
    const latestProgress = await getLatestLessonProgress(enrollmentId)
    let daysInactive = 0
    let lastActivityDate = null

    if (latestProgress && latestProgress.lastWatchedAt) {
      lastActivityDate = new Date(latestProgress.lastWatchedAt)
    } else if (enrollment.startDate) {
      lastActivityDate = new Date(enrollment.startDate)
    } else {
      lastActivityDate = new Date(enrollment.enrolledAt)
    }

    const msDiff = now.getTime() - lastActivityDate.getTime()
    daysInactive = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)))

    // 2. Calculate average daily progress
    const startDate = enrollment.startDate ? new Date(enrollment.startDate) : new Date(enrollment.enrolledAt)
    const msEnrolled = now.getTime() - startDate.getTime()
    const daysEnrolled = Math.max(1, Math.floor(msEnrolled / (1000 * 60 * 60 * 24)))

    const currentPercent = enrollment.progress?.percentage || 0
    const avgDailyProgress = currentPercent / daysEnrolled

    // 3. Expected progress pace (e.g. 1.5% per day)
    const expectedPace = 1.5

    // 4. Payment status check
    const isPaymentOverdue = enrollment.payment_status === 'overdue' ||
      (enrollment.payment_status === 'pending' && daysEnrolled > 7 && !enrollment.fee?.total === 0)

    // 5. Calculate Score & Reasons
    let score = 0
    const reasons = []

    if (daysInactive >= 14) {
      score += 50
      reasons.push('no_activity_14d')
    } else if (daysInactive >= 7) {
      score += 30
      reasons.push('no_activity_7d')
    }

    if (currentPercent < 100 && avgDailyProgress < expectedPace * 0.5) {
      score += 30
      reasons.push('slow_progress')
    }

    if (isPaymentOverdue) {
      score += 20
      reasons.push('payment_overdue')
    }

    score = Math.min(score, 100)
    const level = score >= 70 ? 'high' : score >= 30 ? 'medium' : 'low'

    console.log(`Enrollment [${enrollmentId}] (User: ${userId} | Course: ${courseId}):`)
    console.log(`  - Days Inactive: ${daysInactive} days`)
    console.log(`  - Avg Daily Progress: ${avgDailyProgress.toFixed(2)}% (Current: ${currentPercent}%)`)
    console.log(`  - Payment Status: ${enrollment.payment_status}`)
    console.log(`  - Risk Score: ${score} | Level: ${level.toUpperCase()}`)
    if (reasons.length > 0) {
      console.log(`  - Reasons: ${reasons.join(', ')}`)
    }

    if (level === 'high') highRiskCount++
    else if (level === 'medium') mediumRiskCount++
    else lowRiskCount++

    // Save risk updates to database & trigger interventions
    if (!isDryRun) {
      const riskData = {
        score,
        level,
        reasons,
        last_calculated_at: now,
        interventions_sent: enrollment.dropout_risk?.interventions_sent || []
      }

      await db.collection(ENROLLMENT_COLLECTION).updateOne(
        { _id: enrollment._id },
        { $set: { dropout_risk: riskData, updatedAt: now } }
      )

      // Trigger intervention logic if not already sent for this level in the last 7 days
      const sentInterventions = enrollment.dropout_risk?.interventions_sent || []
      const hasSentRecently = (type) => {
        const lastSent = sentInterventions.filter(i => i.type === type).sort((a, b) => b.sent_at - a.sent_at)[0]
        if (!lastSent) return false
        const ageInMs = now.getTime() - new Date(lastSent.sent_at).getTime()
        return ageInMs < 7 * 24 * 60 * 60 * 1000 // less than 7 days
      }

      if (level === 'medium' && !hasSentRecently('zalo_reminder')) {
        await interventionService.sendZaloReminder(userId)
        await interventionService.logIntervention(enrollmentId, 'zalo_reminder')
      } else if (level === 'high') {
        if (!hasSentRecently('email_alert')) {
          await interventionService.sendEmailAlert(userId)
          await interventionService.logIntervention(enrollmentId, 'email_alert')
        }
        if (!hasSentRecently('trainer_notified')) {
          await interventionService.notifyTrainer(courseId, userId)
          await interventionService.logIntervention(enrollmentId, 'trainer_notified')
        }
      }
    }
    console.log('-'.repeat(40))
  }

  console.log('\n' + '='.repeat(60))
  console.log('RISK ANALYSIS SUMMARY:')
  console.log(`  Low Risk: ${lowRiskCount}`)
  console.log(`  Medium Risk: ${mediumRiskCount}`)
  console.log(`  High Risk: ${highRiskCount}`)
  console.log(`  Total Analyzed: ${enrollments.length}`)
  console.log('='.repeat(60))

  if (isDryRun) {
    console.log('\n>>> DRY RUN COMPLETED. Run with --run to update DB and send alerts. <<<')
  } else {
    console.log('\n>>> Live risk evaluation and interventions completed successfully! <<<')
  }
}

async function main() {
  try {
    await CONNECT_DB()
    console.log('Connected to MongoDB successfully.\n')
    await processDropoutRisk()
  } catch (error) {
    console.error('Error running dropout risk calculation script:', error)
    process.exit(1)
  } finally {
    await CLOSE_DB()
    console.log('\nDisconnected from MongoDB.')
  }
}

main()
