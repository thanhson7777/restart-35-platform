import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()
  const events = await db.collection('events').find({ organizerId: new ObjectId('6a350090fe6682162bf335a4') }).toArray()
  console.log('Events organized by ngo@gmail.com:', events.length)
  if (events.length > 0) {
    console.log('Sample event:', JSON.stringify(events[0], null, 2))
  }
  const allEvents = await db.collection('events').find({}).limit(5).toArray()
  console.log('All events count/sample:', allEvents.length)
  if (allEvents.length > 0) {
    console.log('Sample any event:', JSON.stringify(allEvents[0], null, 2))
  }
  await client.close()
}

main().catch(console.error)
