require('dotenv').config()
const { MongoClient } = require('mongodb')

async function run() {
  const uri = process.env.MONGODB_URI
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(process.env.DATABASE_NAME)
    const apps = await db.collection('scholarship_applications').countDocuments()
    console.log('Scholarship Apps Count:', apps)
  } catch (err) {
    console.error(err)
  } finally {
    await client.close()
  }
}

run()
