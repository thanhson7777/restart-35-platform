const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    
    // get partnership
    const p = await db.collection('partnerships').findOne({ _id: new ObjectId('6a331158cee5ae936d0160c7') });
    console.log('Partnership courseIds:', p.linkedCourseIds, 'agreed:', p.agreedTerms?.linkedCourseIds);

  } finally {
    await client.close();
  }
}
run();
