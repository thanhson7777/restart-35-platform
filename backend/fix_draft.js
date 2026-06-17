const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    const result = await db.collection('courses').updateMany(
      { status: 'draft', linkedPartnershipId: { $ne: null } },
      { $set: { status: 'pending' } }
    );
    console.log('Updated courses:', result.modifiedCount);
  } finally {
    await client.close();
  }
}
run();
