import { GET_DB } from './src/config/mongodb.js'
import { paymentModel } from './src/models/paymentModel.js'

async function check() {
  try {
    const db = await GET_DB()
    const payments = await db.collection('payments').find({}).toArray()
    console.log('Total payments:', payments.length)
    console.log(JSON.stringify(payments, null, 2))
    process.exit(0)
  } catch(e) {
    console.error(e)
    process.exit(1)
  }
}
check()
