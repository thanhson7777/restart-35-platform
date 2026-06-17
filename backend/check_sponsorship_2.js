const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    
    // get enrollment
    const enrollment = await db.collection('enrollments').findOne({ partnershipId: '6a331158cee5ae936d0160c7' });
    console.log('Enrollment courseId:', enrollment.courseId, 'typeof:', typeof enrollment.courseId);

    // Get all sponsorships for this enterprise
    const sponsorships = await db.collection('course_sponsorships').find({
      sponsorId: enrollment.enterpriseId
    }).toArray();
    console.log('Sponsorships for enterprise found:', sponsorships.length);
    
    sponsorships.forEach(sp => {
      console.log('SP ID:', sp._id, 'linkedCourses:', JSON.stringify(sp.linkedCourses));
      
      const match = sp.linkedCourses?.find(c => String(c.courseId) === String(enrollment.courseId));
      console.log('Match string:', !!match);
    });

  } finally {
    await client.close();
  }
}
run();
