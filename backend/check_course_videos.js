const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';

async function check() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');
    const courseId = '6a3402fb163cdb9c67a0eef1';
    
    console.log(`Checking course: ${courseId}`);
    
    const course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) });
    if (!course) {
      console.log('Course not found');
      return;
    }
    
    console.log(`Course Title: ${course.title}`);
    
    const videoLessons = await db.collection('course_video_lessons').find({ courseId }).toArray();
    console.log(`Found ${videoLessons.length} records in course_video_lessons collection.`);
    
    if (videoLessons.length > 0) {
      videoLessons.forEach((v, i) => {
        console.log(`- Lesson ${i+1}: ${v.title} | URL: ${v.videoUrl || 'N/A'}`);
      });
    } else {
      console.log('No records in course_video_lessons. Falling back to syllabus...');
      const syllabus = course.syllabus || [];
      console.log(`Found ${syllabus.length} items in syllabus.`);
      syllabus.forEach((s, i) => {
        console.log(`- Week ${s.week}: ${s.title} | URL: ${s.videoUrl || 'N/A'}`);
      });
    }
    
  } finally {
    await client.close();
  }
}

check().catch(console.dir);
