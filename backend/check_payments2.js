import { MongoClient } from 'mongodb'

async function check() {
  try {
    const client = await MongoClient.connect('mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0')
    const db = client.db('restart-35-platform')
    const payments = await db.collection('payments').find({}).toArray()
    console.log('Total payments:', payments.length)
    if(payments.length > 0) {
      console.log('First payment:', payments[0])
    }
    process.exit(0)
  } catch(e) {
    console.error(e)
    process.exit(1)
  }
}
check()
