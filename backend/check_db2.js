const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    
    // find a recent active enrollment that has sponsorships
    const enr = await db.collection('enrollments').findOne(
      { status: 'active', sponsorships: { $exists: true, $ne: [] } },
      { sort: { enrolledAt: -1 } }
    );
    if (!enr) {
      console.log('No such enrollment');
      return;
    }
    console.log('Enrollment:', enr._id, 'Course:', enr.courseId);
    
    let courseId = enr.courseId;
    if (typeof courseId === 'string') courseId = new ObjectId(courseId);
    const course = await db.collection('courses').findOne({ _id: courseId });
    console.log('Course fee:', course?.fee, 'fundingConfig:', course?.fundingConfig);
    
    let spId = enr.sponsorships[0].sponsorshipId;
    if (typeof spId === 'string') spId = new ObjectId(spId);
    const sp = await db.collection('course_sponsorships').findOne({ _id: spId });
    if (!sp) {
      console.log('SP NOT FOUND');
    } else {
      console.log('SP coverage:', sp.coverageType, 'maxAmount:', sp.maxAmountPerLearner, 'linked:', JSON.stringify(sp.linkedCourses));
    }
  } finally {
    await client.close();
  }
}

check().catch(console.error);
