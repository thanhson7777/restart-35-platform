import 'dotenv/config'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()
  const user = await db.collection('users').findOne({ email: 'ngo@gmail.com' })
  console.log('USER:', JSON.stringify(user, null, 2))
  await client.close()
}

main().catch(console.error)
