import { MongoClient, ObjectId } from 'mongodb';

const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
const client = new MongoClient(uri);

async function mockEnrollments() {
  try {
    await client.connect();
    const db = client.db('restart-35-platform');

    // 1. Find the mocked courses we created earlier
    const courses = await db.collection('courses').find({ 
      title: { $in: ["Khóa học Bán hàng Thực chiến cho Nữ giới", "Chuyên viên Tư vấn Chăm sóc Sức khỏe"] }
    }).toArray();

    if (courses.length === 0) {
      console.log('No mocked courses found!');
      return;
    }

    // 2. Mock 5 learners
    const learners = [];
    for (let i = 1; i <= 5; i++) {
      learners.push({
        _id: new ObjectId(),
        email: `mocklearner${i}@test.com`,
        displayName: `Học viên Mẫu ${i}`,
        phone: `090123456${i}`,
        role: 'learner',
        status: 'active',
        avatar: `https://ui-avatars.com/api/?name=HV${i}&background=random`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await db.collection('users').insertMany(learners);
    console.log(`Inserted 5 mock learners.`);

    // 3. Create enrollments for these learners into the mocked courses
    const enrollments = [];
    
    for (const course of courses) {
      // Find the schedule for this course
      const schedule = await db.collection('schedules').findOne({ courseId: course._id.toString() });
      
      for (const learner of learners) {
        enrollments.push({
          userId: learner._id.toString(),
          courseId: course._id.toString(),
          scheduleId: schedule ? schedule._id.toString() : null,
          status: 'active',
          payment_status: 'completed',
          progress: {
            percentage: 0,
            completionStatus: 'not_started',
            completedItems: []
          },
          attendance: {
            present: 0,
            absent: 0,
            late: 0,
            totalSessions: schedule ? schedule.totalSessions : 0
          },
          fee: {
            total: course.fee || 0,
            paid: course.fee || 0,
            pending: 0
          },
          enrolledAt: new Date(),
          source: 'direct',
          _destroy: false
        });
      }
    }

    await db.collection('enrollments').insertMany(enrollments);
    console.log(`Inserted ${enrollments.length} mock enrollments.`);
    
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

mockEnrollments();
