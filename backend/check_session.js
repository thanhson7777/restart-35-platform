const { MongoClient } = require('mongodb');
require('dotenv').config({path: '.env'});
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DATABASE_NAME);
  const schedule = await db.collection('schedules').findOne();
  console.log(JSON.stringify(schedule.sessions[0], null, 2));
  process.exit(0);
}
run();
