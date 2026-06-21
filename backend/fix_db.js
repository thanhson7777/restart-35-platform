const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('restart35-platform');
  const sponsorships = await db.collection('course_sponsorships').find({ coverageType: 'PARTIAL' }).toArray();
  
  for (const sp of sponsorships) {
     if (!sp.maxAmountPerLearner && sp.budget > 0 && sp.targetLearners > 0) {
        const amount = Math.floor(sp.budget / sp.targetLearners);
        await db.collection('course_sponsorships').updateOne({ _id: sp._id }, { $set: { maxAmountPerLearner: amount } });
        console.log('Fixed sponsorship', sp._id, 'with amount', amount);
     }
  }
  console.log('Done fixing existing course sponsorships');
  await client.close();
}

run();
