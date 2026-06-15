import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    const categories = await db.collection('categories').find({}).toArray();
    console.log('Categories:', categories.map(c => c._id.toString()));
  } finally {
    await client.close();
  }
}
run();
