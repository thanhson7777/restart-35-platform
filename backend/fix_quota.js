const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({path: '.env'});

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DATABASE_NAME);

  await db.collection('organizations').updateOne(
    { _id: new ObjectId('6a34fd5437a6a9796d781a1e') },
    { $set: { monthlyJobQuota: 53, currentMonthUsedJobQuota: 0 } }
  );

  console.log('Fixed DB quota');
  process.exit(0);
}
run();
