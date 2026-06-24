import 'dotenv/config'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db(process.env.DATABASE_NAME)

async function main() {
  await client.connect()

  const categories = await db.collection('categories').find({}).limit(5).toArray()
  console.log('Categories:', categories.map(c => ({ id: c._id, name: c.name, slug: c.slug })))

  const enterprises = await db.collection('users').find({ role: 'enterprise' }).limit(3).toArray()
  console.log('Enterprises:', enterprises.map(e => ({ id: e._id, email: e.email, name: e.displayName })))

  const partners = await db.collection('users').find({ role: 'partner' }).limit(3).toArray()
  console.log('Partners:', partners.map(p => ({ id: p._id, email: p.email, name: p.displayName })))

  const ngos = await db.collection('users').find({ role: 'ngo' }).limit(3).toArray()
  console.log('NGOs:', ngos.map(n => ({ id: n._id, email: n.email, name: n.displayName })))

  await client.close()
}

main().catch(console.error)
