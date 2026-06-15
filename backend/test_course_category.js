import { MongoClient, ObjectId } from 'mongodb';

const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    const courses = await db.collection('courses').find({}).limit(3).toArray();
    
    for (const course of courses) {
      console.log(`Course: ${course.title}`);
      console.log(`  categoryId (raw):`, course.categoryId, `(type: ${typeof course.categoryId}, isObjectId: ${course.categoryId instanceof ObjectId})`);
      
      let categoryInfo = null;
      if (course.categoryId) {
         try {
           categoryInfo = await db.collection('categories').findOne({ _id: new ObjectId(course.categoryId) });
         } catch (e) {
           console.log(`  Error querying category:`, e.message);
         }
      }
      
      console.log(`  categoryInfo found:`, !!categoryInfo);
      if (categoryInfo) {
        console.log(`  category name:`, categoryInfo.name);
      }
    }
  } finally {
    await client.close();
  }
}
run();
