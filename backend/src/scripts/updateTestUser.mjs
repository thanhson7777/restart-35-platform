import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()

  // Find our test user
  const user = await db.collection('users').findOne({ email: 'test_admin_phase4@test.com' })
  if (!user) {
    console.log('User not found')
    process.exit(1)
  }

  console.log('Found user:', user.email, 'role:', user.role, 'isActive:', user.isActive)

  // Update to admin + active
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { role: 'admin', isActive: true, emailVerified: true } }
  )

  const updated = await db.collection('users').findOne({ _id: user._id })
  console.log('Updated user:', updated.email, 'role:', updated.role, 'isActive:', updated.isActive)

  await client.close()
  console.log('Done!')
}

main().catch(console.error)
