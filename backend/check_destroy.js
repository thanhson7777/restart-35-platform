import { MongoClient, ObjectId } from 'mongodb';

const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    const category = await db.collection('categories').findOne({ _id: new ObjectId('6a20a7d7c87110befab26011') });
    console.log('Category:', category);
  } finally {
    await client.close();
  }
}
run();
