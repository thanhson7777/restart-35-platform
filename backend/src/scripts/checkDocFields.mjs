import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()

  const eid = '6a1fcc4303800bac70fc911a'

  // Check exact document
  const doc = await db.collection('enrollments').findOne({ _id: new ObjectId(eid) })
  console.log('Full doc keys:', Object.keys(doc))
  console.log('_destroy value:', doc._destroy, 'type:', typeof doc._destroy)

  // Try queries
  const r1 = await db.collection('enrollments').findOne({ _id: new ObjectId(eid), _destroy: false })
  console.log('With _destroy:false:', r1 ? 'FOUND' : 'NOT FOUND')

  const r2 = await db.collection('enrollments').findOne({ _id: new ObjectId(eid), _destroy: { $ne: true } })
  console.log('With _destroy:$ne:true:', r2 ? 'FOUND' : 'NOT FOUND')

  await client.close()
}

main().catch(console.error)
