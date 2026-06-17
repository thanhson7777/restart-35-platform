const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    
    const p = await db.collection('partnerships').findOne({ _id: new ObjectId('6a331158cee5ae936d0160c7') });
    
    // Create course_sponsorship
    const sponsorship = {
      sponsorType: 'enterprise',
      sponsorId: p.enterpriseId,
      title: 'Tài trợ từ Doanh nghiệp',
      linkedCourses: [
        {
          courseId: '6a331354bda21bb740d6ef09',
          coverage: 'partial',
          maxAmount: 1000000
        }
      ],
      budget: 5000000,
      targetLearners: 5,
      coverageType: 'partial',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      remaining: 5000000,
      spent: 0,
      stats: {
        totalApplications: 0,
        approvedLearners: 0,
        activeLearners: 0,
        completedLearners: 0
      }
    };
    
    const res = await db.collection('course_sponsorships').insertOne(sponsorship);
    const spId = res.insertedId;
    console.log('Created sponsorship:', spId);
    
    // Update enrollment
    const updateRes = await db.collection('enrollments').updateOne(
      { partnershipId: '6a331158cee5ae936d0160c7' },
      {
        $set: {
          sponsorships: [
            {
              sponsorshipId: spId.toString(),
              sponsorType: 'enterprise',
              fundedAmount: 1000000,
              disbursedAmount: 0,
              clawbackAmount: 0,
              coverage: 'partial',
              status: 'matched',
              disbursements: [],
              matchedAt: Date.now()
            }
          ]
        }
      }
    );
    console.log('Updated enrollment:', updateRes.modifiedCount);

  } finally {
    await client.close();
  }
}
run();
