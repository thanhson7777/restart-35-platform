const { MongoClient } = require('mongodb');

async function fixDB() {
  const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    
    // Fetch all courses
    const courses = await db.collection('courses').find({}).toArray();
    
    let updated = 0;
    for (const c of courses) {
      let isFree = c.isFree;
      let fee = c.fee;
      
      // If fundingConfig exists, sync isFree and fee to it
      if (c.fundingConfig) {
        isFree = c.fundingConfig.type === 'FREE';
        fee = c.fundingConfig.price || 0;
      } else {
        // If fundingConfig is missing, create it from isFree/fee
        const type = c.isFree ? 'FREE' : (c.fee > 0 ? 'PAID' : 'FREE');
        c.fundingConfig = {
          type,
          price: c.fee || 0,
          sponsorIds: [],
          hasJobGuarantee: false,
          acceptsSponsorship: true
        };
        isFree = type === 'FREE';
        fee = c.fee || 0;
      }
      
      await db.collection('courses').updateOne(
        { _id: c._id },
        { 
          $set: { 
            fundingConfig: c.fundingConfig,
            isFree: isFree,
            fee: fee
          } 
        }
      );
      updated++;
    }
    
    console.log(`Successfully synced fundingConfig, isFree, and fee for ${updated} courses.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixDB();
