const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    const c = await db.collection('courses').findOne({ 'linkedPartnershipId': { $ne: null } });
    console.log(JSON.stringify(c, null, 2));
  } finally {
    await client.close();
  }
}
run();
