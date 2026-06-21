const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
async function test() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    
    // find a draft course
    const course = await db.collection('courses').findOne({ status: 'draft' });
    if (!course) {
      console.log('No draft course found');
      return;
    }
    
    console.log(`Found draft course: ${course._id} - ${course.title}`);
    
    // Simulate updating it to approved
    const res = await db.collection('courses').findOneAndUpdate(
      { _id: course._id },
      { $set: { status: 'approved' } },
      { returnDocument: 'after' }
    );
    
    console.log('Update result status:', res ? (res.value ? res.value.status : res.status) : null);
    
    // Check if it appears in the admin list
    const adminCourses = await db.collection('courses').find({ status: { $ne: 'draft' }, _destroy: { $ne: true } }).toArray();
    const found = adminCourses.find(c => c._id.toString() === course._id.toString());
    
    console.log('Found in admin query?', !!found);
    console.log('Found status:', found?.status);
  } finally {
    await client.close();
  }
}
test().catch(console.dir);
