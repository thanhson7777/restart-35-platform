const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    
    // Fix approved
    const resApproved = await db.collection('enrollments').updateMany(
      { status: 'active', 'sponsorships.status': 'matched' },
      { $set: { 'sponsorships.$[elem].status': 'approved' } },
      { arrayFilters: [{ 'elem.status': 'matched' }] }
    );
    console.log('Fixed approved:', resApproved.modifiedCount);

    // Fix rejected
    const resRejected = await db.collection('enrollments').updateMany(
      { status: 'dropped', dropReason: 'Bị từ chối bởi tổ chức tài trợ', 'sponsorships.status': 'matched' },
      { $set: { 'sponsorships.$[elem].status': 'rejected' } },
      { arrayFilters: [{ 'elem.status': 'matched' }] }
    );
    console.log('Fixed rejected:', resRejected.modifiedCount);

  } finally {
    await client.close();
  }
}
run();
