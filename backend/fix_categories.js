import { MongoClient, ObjectId } from 'mongodb';

const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    
    // Get a valid category
    const category = await db.collection('categories').findOne({});
    if (!category) {
      console.log('No categories found!');
      return;
    }
    
    // Update all courses with invalid categories
    const courses = await db.collection('courses').find({}).toArray();
    let count = 0;
    
    for (const course of courses) {
      let validCategory = null;
      try {
        if (ObjectId.isValid(course.categoryId)) {
          validCategory = await db.collection('categories').findOne({ _id: new ObjectId(course.categoryId) });
        }
      } catch (e) {}

      if (!validCategory) {
        await db.collection('courses').updateOne(
          { _id: course._id },
          { $set: { categoryId: category._id.toString() } }
        );
        count++;
      }
    }
    
    console.log(`Updated ${count} courses to use valid category: ${category.name}`);
  } finally {
    await client.close();
  }
}

run();
