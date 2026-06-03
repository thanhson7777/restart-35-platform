/**
 * Enrollment Status & Payment Status Migration Script
 *
 * Migrates existing enrollment data from Phase 1:
 * 1. Chuẩn hóa enrollment status: 8 → 5 trạng thái
 * 2. Thêm payment_status mặc định cho các enrollment cũ
 *
 * Status mapping:
 * - pending      → dropped (worker chưa được duyệt → hủy)
 * - waitlist     → dropped (gộp vào course.maxStudents)
 * - enrolled     → active
 * - in_progress  → active
 * - cancelled    → dropped
 * - on_hold      → suspended
 * - completed    → completed (giữ nguyên)
 * - dropped      → dropped (giữ nguyên)
 *
 * Usage:
 *   node src/scripts/migrateEnrollmentStatus.js        # Dry run (preview)
 *   node src/scripts/migrateEnrollmentStatus.js --run  # Execute migration
 */

import 'dotenv/config'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry') || !args.includes('--run')

const STATUS_MAP = {
  pending: 'dropped',
  waitlist: 'dropped',
  enrolled: 'active',
  in_progress: 'active',
  cancelled: 'dropped',
  on_hold: 'suspended',
  completed: 'completed',
  dropped: 'dropped'
}

const STATUS_LABELS = {
  pending: 'Chưa duyệt',
  waitlist: 'Danh sách chờ',
  enrolled: 'Đã ghi danh',
  in_progress: 'Đang học',
  cancelled: 'Đã hủy',
  on_hold: 'Tạm ngưng',
  completed: 'Hoàn thành',
  dropped: 'Đã bỏ'
}

async function migrateEnrollmentStatus() {
  const db = GET_DB()
  const collection = db.collection('enrollments')

  console.log('='.repeat(60))
  console.log('Enrollment Status Migration — Phase 1')
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'LIVE MIGRATION'}`)
  console.log('='.repeat(60))

  let stats = {}

  for (const [oldStatus, newStatus] of Object.entries(STATUS_MAP)) {
    if (oldStatus === newStatus) continue

    const count = await collection.countDocuments({ status: oldStatus, _destroy: false })
    if (count === 0) continue

    console.log(`\n[${oldStatus} → ${newStatus}] Found ${count} enrollments`)

    if (!isDryRun) {
      const result = await collection.updateMany(
        { status: oldStatus, _destroy: false },
        {
          $set: {
            status: newStatus,
            updatedAt: new Date()
          }
        }
      )
      console.log(`  → Updated ${result.modifiedCount} documents`)
    } else {
      const samples = await collection.find(
        { status: oldStatus, _destroy: false },
        { projection: { _id: 1, userId: 1, courseId: 1 } }
      ).limit(3).toArray()
      console.log(`  → Would update ${count} documents`)
      samples.forEach(s => console.log(`     Sample: enrollment ${s._id}`))
    }

    stats[oldStatus] = { count, newStatus }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Status Migration Summary:')
  for (const [old, data] of Object.entries(stats)) {
    console.log(`  ${STATUS_LABELS[old]} (${old}) → ${data.newStatus}: ${data.count} records`)
  }
  console.log('='.repeat(60))

  return stats
}

async function addPaymentStatus() {
  const db = GET_DB()
  const collection = db.collection('enrollments')

  console.log('\n' + '='.repeat(60))
  console.log('Adding payment_status field to existing enrollments')
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'LIVE MIGRATION'}`)
  console.log('='.repeat(60))

  const countMissing = await collection.countDocuments({
    payment_status: { $exists: false },
    _destroy: false
  })

  console.log(`\nFound ${countMissing} enrollments without payment_status`)

  if (countMissing === 0) {
    console.log('All enrollments already have payment_status field.')
    return { count: 0 }
  }

  if (!isDryRun) {
    const result = await collection.updateMany(
      { payment_status: { $exists: false }, _destroy: false },
      {
        $set: {
          payment_status: 'pending',
          updatedAt: new Date()
        }
      }
    )
    console.log(`  → Added payment_status='pending' to ${result.modifiedCount} documents`)
    return { count: result.modifiedCount }
  } else {
    const samples = await collection.find(
      { payment_status: { $exists: false }, _destroy: false },
      { projection: { _id: 1 } }
    ).limit(3).toArray()
    console.log(`  → Would add payment_status='pending' to ${countMissing} documents`)
    samples.forEach(s => console.log(`     Sample: enrollment ${s._id}`))
    return { count: countMissing }
  }
}

async function createIndexes() {
  const db = GET_DB()
  const collection = db.collection('enrollments')

  console.log('\n' + '='.repeat(60))
  console.log('Creating indexes for new fields')
  console.log('='.repeat(60))

  const indexes = [
    { key: { payment_status: 1 }, name: 'payment_status_1' },
    { key: { status: 1, payment_status: 1 }, name: 'status_payment_status_1' }
  ]

  for (const idx of indexes) {
    try {
      if (!isDryRun) {
        await collection.createIndex(idx.key, {
          name: idx.name,
          background: true
        })
        console.log(`  ✓ Created index: ${idx.name}`)
      } else {
        console.log(`  → Would create index: ${idx.name} on ${JSON.stringify(idx.key)}`)
      }
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        console.log(`  ○ Index ${idx.name} already exists (background rebuild)`)
      } else {
        console.error(`  ✗ Error creating ${idx.name}: ${error.message}`)
      }
    }
  }
}

async function verifySchema() {
  const db = GET_DB()
  const collection = db.collection('enrollments')

  console.log('\n' + '='.repeat(60))
  console.log('Verifying enrollment schema')
  console.log('='.repeat(60))

  const sample = await collection.findOne(
    { _destroy: false },
    { projection: { payment_status: 1, status: 1 } }
  )

  if (sample) {
    const hasPaymentStatus = 'payment_status' in sample
    const validStatuses = ['active', 'completed', 'dropped', 'failed', 'suspended',
                           'pending', 'waitlist', 'enrolled', 'in_progress', 'cancelled', 'on_hold']
    const statusOk = validStatuses.includes(sample.status)

    console.log(`  payment_status field exists: ${hasPaymentStatus}`)
    console.log(`  Sample status: "${sample.status}" ${statusOk ? '✓' : '?'}`)

    if (!hasPaymentStatus) {
      console.log('\n  ⚠ WARNING: payment_status field not found in existing documents.')
      console.log('  Run migration with --run to add it.')
    }
  } else {
    console.log('  No active enrollments found.')
  }
}

async function main() {
  try {
    await CONNECT_DB()
    console.log('Connected to MongoDB\n')

    await verifySchema()
    const statusResult = await migrateEnrollmentStatus()
    const paymentResult = await addPaymentStatus()
    await createIndexes()

    const totalUpdated = Object.values(statusResult).reduce((sum, r) => sum + r.count, 0)

    console.log('\n' + '='.repeat(60))
    console.log('OVERALL MIGRATION COMPLETE')
    console.log('='.repeat(60))
    console.log(`Status migrations: ${totalUpdated} records`)
    console.log(`Payment status additions: ${paymentResult.count} records`)
    console.log('Indexes: created/verified')

    if (isDryRun) {
      console.log('\n>>> This was a DRY RUN. Run with --run to execute migration. <<<')
      console.log('>>> Backup your database before running migration! <<<')
    } else {
      console.log('\n>>> Migration completed successfully! <<<')
    }

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await CLOSE_DB()
    console.log('\nDisconnected from MongoDB')
  }
}

main()
