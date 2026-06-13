const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('restart-35-platform');

    // Update the single job
    await db.collection('recruitment_jobs').updateOne(
      { _id: new ObjectId('6a2a59ba3205742cde8fb1bb') },
      { $set: { 
          'location.coordinates.lat': 10.028, 
          'location.coordinates.lng': 105.768 
        } 
      }
    );
    console.log('Updated the Job with coordinates.');

    // Update one course
    const course = await db.collection('courses').findOne({ status: 'approved' });
    if (course) {
        await db.collection('courses').updateOne(
            { _id: course._id },
            { $set: { 
                'location.coordinates.lat': 10.030, 
                'location.coordinates.lng': 105.770,
                'location.address': 'Đại học Cần Thơ'
              } 
            }
        );
        console.log(`Updated Course ${course._id} with coordinates.`);
    }

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
