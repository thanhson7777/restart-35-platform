const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DATABASE_NAME);

  await db.collection('users').updateOne(
    { email: 'enterprise@gmail.com' },
    { $set: { organizationId: '6a34fd5437a6a9796d781a1e' } }
  );

  const badOrg = await db.collection('organizations').findOne({ _id: new ObjectId('6a37812f0eab389c6d5282f7') });
  
  if (badOrg) {
    await db.collection('organizations').updateOne(
      { _id: new ObjectId('6a34fd5437a6a9796d781a1e') },
      {
        $set: {
          currentPackageId: badOrg.currentPackageId,
          subscriptionStartDate: badOrg.subscriptionStartDate,
          subscriptionEndDate: badOrg.subscriptionEndDate,
          monthlyJobQuota: badOrg.monthlyJobQuota
        }
      }
    );
    await db.collection('organizations').deleteOne({ _id: new ObjectId('6a37812f0eab389c6d5282f7') });
  }

  console.log('Database restored successfully');
  process.exit(0);
}
run();
