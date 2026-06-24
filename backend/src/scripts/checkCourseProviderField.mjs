import 'dotenv/config'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()
  const courseWithProvider = await db.collection('courses').findOne({ provider: { $exists: true } })
  console.log('Course with provider:', JSON.stringify(courseWithProvider, null, 2))
  await client.close()
}

main().catch(console.error)
