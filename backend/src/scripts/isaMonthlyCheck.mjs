/**
 * ISA Monthly Income Check — Cron Job Script
 *
 * Chạy ngày 1 mỗi tháng (hoặc bất kỳ lúc nào cần)
 * 1. Lấy tất cả ISA đang ở trạng thái 'active'
 * 2. Với mỗi ISA pending record trong tháng:
 *    a. Tính paymentAmount: income >= threshold → paid; income < threshold → skipped
 *    b. Cập nhật monthlyRecord.status
 *    c. Cập nhật totalPaidAmount
 *    d. Kiểm tra nếu totalPaid >= maxCap → CAPPED
 *
 * Usage:
 *   node src/scripts/isaMonthlyCheck.mjs         # Dry run (preview)
 *   node src/scripts/isaMonthlyCheck.mjs --run  # Execute
 */

import 'dotenv/config'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry') || !args.includes('--run')

const ISA_COLLECTION = 'isa_repayments'
const ENROLLMENT_COLLECTION = 'enrollments'

async function getActiveISAs() {
  const db = GET_DB()
  return await db.collection(ISA_COLLECTION)
    .find({ status: 'active', _destroy: false })
    .toArray()
}

async function getCurrentMonthRecord(isa) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  return isa.monthlyRecords?.find(
    r => r.month === currentMonth && r.year === currentYear
  ) || null
}

async function processISAMonthly() {
  const db = GET_DB()
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  console.log('='.repeat(60))
  console.log(`ISA Monthly Check — ${currentMonth}/${currentYear}`)
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'LIVE MIGRATION'}`)
  console.log('='.repeat(60))

  const activeISAs = await getActiveISAs()
  console.log(`\nFound ${activeISAs.length} active ISA records`)

  let processed = 0
  let capped = 0
  let skipped = 0
  let paid = 0
  let skippedNoRecord = 0

  for (const isa of activeISAs) {
    const currentRecord = await getCurrentMonthRecord(isa)

    if (!currentRecord) {
      console.log(`\n[${isa._id}] No income record for ${currentMonth}/${currentYear} — skipped (waiting for worker submission)`)
      skippedNoRecord++
      continue
    }

    if (currentRecord.status !== 'pending') {
      console.log(`\n[${isa._id}] Record ${currentMonth}/${currentYear} already processed (status: ${currentRecord.status})`)
      continue
    }

    const { income, paymentAmount: claimedAmount } = currentRecord
    const { percentage, incomeThreshold, maxCap, totalPaidAmount } = isa

    let newStatus = 'skipped'
    let actualPayment = 0

    if (income >= incomeThreshold) {
      const excess = income - incomeThreshold
      actualPayment = Math.round((excess * percentage) / 100)
      const remaining = maxCap - totalPaidAmount

      if (remaining <= 0) {
        newStatus = 'capped'
        actualPayment = 0
      } else {
        actualPayment = Math.min(actualPayment, remaining)
        newStatus = 'paid'
      }
    } else {
      newStatus = 'skipped'
      actualPayment = 0
    }

    console.log(`\n[${isa._id}] enrollmentId: ${isa.enrollmentId}`)
    console.log(`  Income: ${income.toLocaleString()} VND | Threshold: ${incomeThreshold.toLocaleString()} VND`)
    console.log(`  ISA %: ${percentage}% | MaxCap: ${maxCap.toLocaleString()} | TotalPaid: ${totalPaidAmount.toLocaleString()}`)
    console.log(`  Claimed amount: ${claimedAmount?.toLocaleString() || 0} | Actual: ${actualPayment.toLocaleString()} VND`)
    console.log(`  Status change: pending → ${newStatus}`)

    if (!isDryRun) {
      // Update monthly record
      await db.collection(ISA_COLLECTION).updateOne(
        {
          _id: isa._id,
          'monthlyRecords.month': currentMonth,
          'monthlyRecords.year': currentYear
        },
        {
          $set: {
            'monthlyRecords.$.status': newStatus,
            'monthlyRecords.$.paymentAmount': actualPayment,
            ...(newStatus === 'paid' ? { 'monthlyRecords.$.paidDate': now } : {})
          }
        }
      )

      // Update totalPaidAmount if paid
      if (actualPayment > 0) {
        await db.collection(ISA_COLLECTION).updateOne(
          { _id: isa._id },
          { $inc: { totalPaidAmount: actualPayment } }
        )
      }

      // Check capped
      const updatedISA = await db.collection(ISA_COLLECTION).findOne({ _id: isa._id })
      if (updatedISA.totalPaidAmount >= updatedISA.maxCap) {
        await db.collection(ISA_COLLECTION).updateOne(
          { _id: isa._id },
          {
            $set: { status: 'capped' },
            $inc: { totalPaidAmount: updatedISA.maxCap - updatedISA.totalPaidAmount }
          }
        )
        capped++
        console.log('  → ISA CAPPED (maxCap reached)')

        // Update enrollment payment status
        await db.collection(ENROLLMENT_COLLECTION).updateOne(
          { _id: isa.enrollmentId },
          { $set: { payment_status: 'paid' } }
        )
      }
    }

    if (newStatus === 'paid') paid++
    if (newStatus === 'skipped') skipped++
    processed++
  }

  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY:')
  console.log(`  Processed: ${processed}`)
  console.log(`  Paid: ${paid}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Capped: ${capped}`)
  console.log(`  No record (waiting): ${skippedNoRecord}`)
  console.log('='.repeat(60))

  if (isDryRun) {
    console.log('\n>>> This was a DRY RUN. Run with --run to execute. <<<')
  } else {
    console.log('\n>>> Monthly ISA check completed! <<<')
  }
}

async function main() {
  try {
    await CONNECT_DB()
    console.log('Connected to MongoDB\n')
    await processISAMonthly()
  } catch (error) {
    console.error('ISA Monthly Check failed:', error)
    process.exit(1)
  } finally {
    await CLOSE_DB()
    console.log('\nDisconnected from MongoDB')
  }
}

main()
