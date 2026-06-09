/**
 * Bulk approve scraper courses that are in pending/draft status.
 * Standalone script - reads backend/.env for MongoDB Atlas connection.
 *
 * Usage:
 *   node backend/scripts/bulkApproveScrapedCourses.js
 */

const { MongoClient } = require('mongodb')
const fs = require('fs')
const path = require('path')

// Load backend/.env
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env')
  if (!fs.existsSync(envPath)) {
    throw new Error(`Env file not found at ${envPath}`)
  }
  const content = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const rawValue = trimmed.slice(eqIndex + 1).trim()
    const value = rawValue.replace(/^['"]|['"]$/g, '')
    env[key] = value
  }
  return env
}

async function bulkApproveScrapedCourses() {
  let client

  try {
    const env = loadEnv()
    const MONGODB_URI = env.MONGODB_URI
    const DATABASE_NAME = env.DATABASE_NAME || 'restart-35-platform'

    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in backend/.env')
    }

    console.log(`Database: ${DATABASE_NAME}`)
    console.log('Connecting to MongoDB...')
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    })

    await client.connect()
    console.log('Connected to MongoDB')

    const db = client.db(DATABASE_NAME)
    const coursesCollection = db.collection('courses')

    const PENDING = 'pending'
    const DRAFT = 'draft'
    const APPROVED = 'approved'

    // Count before
    const pendingCount = await coursesCollection.countDocuments({
      status: PENDING
    })
    const draftCount = await coursesCollection.countDocuments({
      status: DRAFT
    })
    const approvedCount = await coursesCollection.countDocuments({
      status: APPROVED
    })

    console.log('\n=== Before Migration ===')
    console.log(`Pending courses: ${pendingCount}`)
    console.log(`Draft courses: ${draftCount}`)
    console.log(`Approved courses: ${approvedCount}`)

    // Bulk update pending -> approved (scraper courses)
    const pendingResult = await coursesCollection.updateMany(
      { status: PENDING },
      {
        $set: {
          status: APPROVED,
          updatedAt: new Date()
        }
      }
    )

    // Bulk update draft -> approved (scraper courses)
    const draftResult = await coursesCollection.updateMany(
      { status: DRAFT },
      {
        $set: {
          status: APPROVED,
          updatedAt: new Date()
        }
      }
    )

    // Count after
    const newPendingCount = await coursesCollection.countDocuments({
      status: PENDING
    })
    const newDraftCount = await coursesCollection.countDocuments({
      status: DRAFT
    })
    const newApprovedCount = await coursesCollection.countDocuments({
      status: APPROVED
    })

    console.log('\n=== Migration Results ===')
    console.log(`Updated ${pendingResult.modifiedCount} pending courses -> approved`)
    console.log(`Updated ${draftResult.modifiedCount} draft courses -> approved`)
    console.log('\n=== After Migration ===')
    console.log(`Pending courses: ${newPendingCount}`)
    console.log(`Draft courses: ${newDraftCount}`)
    console.log(`Approved courses: ${newApprovedCount}`)
    console.log(`\nTotal approved courses: ${newApprovedCount}`)

    // Show sample approved courses
    console.log('\n=== Sample Approved Courses ===')
    const sampleCourses = await coursesCollection
      .find({ status: APPROVED })
      .limit(10)
      .toArray()

    sampleCourses.forEach((course, i) => {
      console.log(`\n${i + 1}. ${course.title || '(no title)'}`)
      console.log(`   Platform: ${course.platform || 'N/A'}`)
      console.log(`   Skills: ${Array.isArray(course.skills) ? course.skills.slice(0, 5).join(', ') : 'N/A'}`)
      console.log(`   Level: ${course.level || 'N/A'}`)
      console.log(`   Fee: ${course.fee ?? 'N/A'}`)
      console.log(`   Duration: ${JSON.stringify(course.duration || {})}`)
      console.log(`   Rating: ${JSON.stringify(course.rating || {})}`)
      console.log(`   Thumbnail: ${course.thumbnail || 'N/A'}`)
    })

    console.log('\n✅ Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Run course recommendation API test to verify results')
    console.log('2. Check if courses appear in recommendations')

    process.exitCode = 0
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exitCode = 1
  } finally {
    if (client) {
      await client.close()
      console.log('\nMongoDB connection closed')
    }
  }
}

bulkApproveScrapedCourses()
