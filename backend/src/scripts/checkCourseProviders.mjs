import 'dotenv/config'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()
  const sampleCourse = await db.collection('courses').findOne({})
  console.log('Sample Course:', JSON.stringify(sampleCourse, null, 2))
  await client.close()
}

main().catch(console.error)
