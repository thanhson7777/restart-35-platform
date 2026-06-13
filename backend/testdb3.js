const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('restart-35-platform');

    const job = await db.collection('recruitment_jobs').findOne();
    console.log('Single Job:', JSON.stringify(job, null, 2));

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
