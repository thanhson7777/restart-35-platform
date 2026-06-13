const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('restart-35-platform');

    const jobs = await db.collection('recruitment_jobs').find({}, { projection: { status: 1, 'location.coordinates': 1, _destroy: 1 } }).toArray();
    console.log('Jobs:', jobs);

    const courses = await db.collection('courses').find({}, { projection: { status: 1, 'location.coordinates': 1, _destroy: 1 } }).toArray();
    console.log('Courses:', courses);

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
