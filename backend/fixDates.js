require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DATABASE_NAME || 'test');
  
  const courses = await db.collection('courses').find().toArray();
  for (const course of courses) {
    const update = {};
    if (course.createdAt instanceof Date) {
      update.createdAt = course.createdAt.getTime();
    }
    if (course.updatedAt instanceof Date) {
      update.updatedAt = course.updatedAt.getTime();
    }
    if (course.enrollmentStartDate instanceof Date) {
      update.enrollmentStartDate = course.enrollmentStartDate.getTime();
    }
    if (course.approvedAt instanceof Date) {
      update.approvedAt = course.approvedAt.getTime();
    }
    
    if (Object.keys(update).length > 0) {
      await db.collection('courses').updateOne({ _id: course._id }, { $set: update });
    }
  }
  
  console.log('Fixed dates for ' + courses.length + ' courses');
  await client.close();
}

run().catch(console.error);
