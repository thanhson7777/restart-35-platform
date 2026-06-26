
require('dotenv').config();
const { MongoClient } = require('mongodb');
async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('restart-35-platform');
  const collection = db.collection('recruitment_jobs');
  
  const jobs = await collection.find({}).toArray();
  for (const job of jobs) {
    if (typeof job.createdAt === 'object' && job.createdAt instanceof Date) {
      await collection.updateOne({ _id: job._id }, { $set: { createdAt: job.createdAt.getTime() } });
    }
    if (typeof job.updatedAt === 'object' && job.updatedAt instanceof Date) {
      await collection.updateOne({ _id: job._id }, { $set: { updatedAt: job.updatedAt.getTime() } });
    }
  }
  console.log('Done converting dates to timestamps');
  client.close();
}
run();

