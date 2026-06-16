import { MongoClient, ObjectId } from 'mongodb';

async function test() {
  const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('restart-35-platform');
  const jobs = await db.collection('recruitment_jobs').find({}).toArray();
  console.log("Total jobs:", jobs.length);
  if(jobs.length > 0) {
     console.log("First job enterpriseId type:", typeof jobs[0].enterpriseId, jobs[0].enterpriseId);
     console.log("First job status:", jobs[0].status);
  }
  
  process.exit(0);
}
test();
