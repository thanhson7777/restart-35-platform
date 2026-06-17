const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    
    // get enrollment
    const enrollment = await db.collection('enrollments').findOne({ partnershipId: '6a331158cee5ae936d0160c7' });
    console.log('Enrollment userId:', enrollment.userId, 'courseId:', enrollment.courseId);

    // Get course
    const course = await db.collection('courses').findOne({ _id: new ObjectId(enrollment.courseId) });
    console.log('Course ID:', course._id);

    // find active sponsorships
    const sponsorships = await db.collection('course_sponsorships').find({
      'linkedCourses.courseId': enrollment.courseId.toString(),
      status: 'active',
      _destroy: { $ne: true }
    }).toArray();
    console.log('Active sponsorships found:', sponsorships.length);
    
    if (sponsorships.length > 0) {
      const sp = sponsorships[0];
      console.log('Sponsorship:', sp._id, 'targetLearners:', sp.targetLearners, 'stats:', sp.stats);
      
      const profile = await db.collection('worker_profiles').findOne({ userId: enrollment.userId });
      console.log('Worker profile found:', !!profile);
      
      const criteria = sp.eligibilityCriteria || {};
      const basicInfo = profile?.basicInfo || {};
      console.log('Eligibility criteria:', criteria);
      console.log('Worker basicInfo:', basicInfo);
    }

  } finally {
    await client.close();
  }
}
run();
