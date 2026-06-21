import { MongoClient, ObjectId } from 'mongodb';

const uri = "mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0";
const dbName = "restart-35-platform";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    const courseId = "6a3544168e5452fa1a0ed33f";
    const course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) });
    console.log("Course:", JSON.stringify(course, null, 2));

    const schedule = await db.collection('schedules').findOne({ courseId: courseId });
    console.log("Schedule:", JSON.stringify(schedule, null, 2));
    
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

run();
