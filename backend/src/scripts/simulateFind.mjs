import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()

  const eid = '6a1fcc4303800bac70fc911a'

  // Simulate exactly what findOneById does
  try {
    const objectId = new ObjectId(eid)
    const result = await db.collection('enrollments').findOne({
      _id: objectId,
      _destroy: false
    })
    console.log('findOneById simulation:', result ? 'FOUND' : 'NOT FOUND')
    if (result) {
      console.log('  status:', result.status)
      console.log('  userId:', result.userId)
      console.log('  courseId:', result.courseId)
    }
  } catch (e) {
    console.log('Error:', e.message)
  }

  await client.close()
}

main().catch(console.error)
