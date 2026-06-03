import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()

  // Check enrollments
  const enrollments = await db.collection('enrollments').find({}).limit(5).toArray()
  console.log('Enrollments count:', enrollments.length)
  if (enrollments.length > 0) {
    console.log('Sample enrollment _id type:', typeof enrollments[0]._id, enrollments[0]._id.constructor.name)
    console.log('Sample enrollment:', JSON.stringify(enrollments[0]).substring(0, 200))
  }

  // Check what the specific ID looks like
  const eid = '6a1fcc4303800bac70fc911a'
  const found = await db.collection('enrollments').findOne({ _id: new ObjectId(eid) })
  console.log('Direct lookup by ObjectId:', found ? 'FOUND' : 'NOT FOUND')

  const found2 = await db.collection('enrollments').findOne({ _id: eid })
  console.log('Direct lookup by string:', found2 ? 'FOUND' : 'NOT FOUND')

  await client.close()
}

main().catch(console.error)
