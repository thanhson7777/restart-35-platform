const { MongoClient } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGODB_URI;

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('restart-35-platform');
  const app = await db.collection('recruitment_applications').findOne({});
  
  if (app) {
    const agg = await db.collection('recruitment_applications').aggregate([
      { $match: { _id: app._id } },
      { $addFields: { jobObjId: { $toObjectId: "$jobId" } } },
      { $lookup: { from: 'recruitment_jobs', localField: 'jobObjId', foreignField: '_id', as: 'job' } },
      { $addFields: { job: { $arrayElemAt: ['$job', 0] } } }
    ]).toArray();
    console.log('Job from agg:', agg[0].job);
  }
  
  await client.close();
})();
