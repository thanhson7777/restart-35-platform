const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0');
  await client.connect();
  const db = client.db('restart-35-platform');
  const doc = await db.collection('courses').findOne({});
  console.log(JSON.stringify(doc.fundingConfig, null, 2));
  process.exit(0);
}
run();
