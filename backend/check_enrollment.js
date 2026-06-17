const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    
    const enrollments = await db.collection('enrollments').find({ partnershipId: '6a331158cee5ae936d0160c7' }).toArray();
    console.log(`Found ${enrollments.length} enrollments`);
    
    enrollments.forEach(e => {
      console.log('ID:', e._id);
      console.log('Sponsorships:', JSON.stringify(e.sponsorships, null, 2));
    });

  } finally {
    await client.close();
  }
}
run();
