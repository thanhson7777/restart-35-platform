const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('restart-35-platform');

    const jobsCount = await db.collection('recruitment_jobs').countDocuments({
        status: 'published',
        'location.coordinates.lat': { $ne: null },
        'location.coordinates.lng': { $ne: null },
        _destroy: { $ne: true }
    });
    console.log('Published Jobs with coordinates:', jobsCount);

    const allJobsCount = await db.collection('recruitment_jobs').countDocuments();
    console.log('Total Jobs:', allJobsCount);

    const coursesCount = await db.collection('courses').countDocuments({
        status: 'approved',
        'location.coordinates.lat': { $ne: null },
        'location.coordinates.lng': { $ne: null },
        _destroy: { $ne: true }
    });
    console.log('Approved Courses with coordinates:', coursesCount);
    
    const allCoursesCount = await db.collection('courses').countDocuments();
    console.log('Total Courses:', allCoursesCount);

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
