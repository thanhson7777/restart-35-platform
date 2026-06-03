import 'dotenv/config'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()

  // Update worker to active
  const worker = await db.collection('users').findOne({ email: 'test_worker_phase4@test.com' })
  if (worker) {
    await db.collection('users').updateOne(
      { _id: worker._id },
      { $set: { isActive: true, emailVerified: true } }
    )
    console.log('Worker updated to active')
  }

  // Create a test course
  const course = await db.collection('courses').insertOne({
    title: 'Test Course Phase 4',
    description: 'Test course for phase 4',
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  })
  console.log('Course created:', course.insertedId)

  // Create enrollment for worker
  const enrollment = await db.collection('enrollments').insertOne({
    userId: worker._id.toString(),
    courseId: course.insertedId.toString(),
    status: 'completed',
    progress: { percentage: 100 },
    createdAt: new Date(),
    updatedAt: new Date()
  })
  console.log('Enrollment created:', enrollment.insertedId)

  await client.close()
  console.log('Done!')
}

main().catch(console.error)
