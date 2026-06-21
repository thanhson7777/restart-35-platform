const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
const DATABASE_NAME = 'restart-35-platform';

async function inspectCourse() {
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB!');

    const db = client.db(DATABASE_NAME);

    // 1. Find Course by ID or Title
    console.log('\n--- Searching Course by ID: 6a354bc3e54d8a6696dee0b3 ---');
    const courseId = '6a354bc3e54d8a6696dee0b3';
    let course = await db.collection('courses').findOne({ _id: new ObjectId(courseId) });

    if (!course) {
      console.log('Course not found by ID. Searching by title keyword...');
      course = await db.collection('courses').findOne({ title: /Bán hàng online/i });
    }

    if (course) {
      console.log(`Course Found: "${course.title}" (ID: ${course._id})`);
      console.log('Syllabus preview:');
      if (course.syllabus) {
        course.syllabus.forEach((item, idx) => {
          console.log(`[Syllabus item ${idx + 1}]`, JSON.stringify(item, null, 2));
        });
      } else {
        console.log('No syllabus array in course document!');
      }
    } else {
      console.log('Course not found at all!');
    }

    // 2. Find in course_video_lessons
    console.log('\n--- Searching course_video_lessons for courseId ---');
    const dbCourseId = course ? course._id.toString() : courseId;
    const lessons = await db.collection('course_video_lessons').find({ courseId: dbCourseId }).toArray();
    console.log(`Found ${lessons.length} video lessons in collection course_video_lessons.`);
    lessons.forEach((lesson, idx) => {
      console.log(`[VideoLesson item ${idx + 1}]`);
      console.log(`  - _id: ${lesson._id}`);
      console.log(`  - title: ${lesson.title}`);
      console.log(`  - videoUrl: ${lesson.videoUrl}`);
      console.log(`  - status: ${lesson.status}`);
      console.log(`  - courseId: ${lesson.courseId}`);
    });

    // 3. Find Enrollment
    console.log('\n--- Searching Enrollment by ID: 6a355be11f5013e01689627a ---');
    const enrollId = '6a355be11f5013e01689627a';
    try {
      const enrollment = await db.collection('enrollments').findOne({ _id: new ObjectId(enrollId) });
      console.log('Enrollment found:', JSON.stringify(enrollment, null, 2));

      if (enrollment && enrollment.userId) {
        console.log('\n--- Searching User by ID:', enrollment.userId, '---');
        const user = await db.collection('users').findOne({ _id: new ObjectId(enrollment.userId) });
        console.log('User found:', JSON.stringify(user, null, 2));
      }
    } catch (e) {
      console.log('Enrollment/User fetch error:', e.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Closed MongoDB connection');
  }
}

inspectCourse();
