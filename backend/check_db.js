const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    const courses = await db.collection('courses').find().sort({createdAt: -1}).limit(5).toArray();
    console.log("LATEST 5 COURSES:");
    courses.forEach(c => console.log(`ID: ${c._id}, Title: ${c.title}, Status: ${c.status}, ApprovedAt: ${c.approvedAt}, Destroy: ${c._destroy}`));
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
