import { MongoClient, ObjectId } from 'mongodb';

const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
const client = new MongoClient(uri);

async function mockCourses() {
  try {
    await client.connect();
    const db = client.db('restart-35-platform');

    // 1. Get trainer and category
    const trainer = await db.collection('users').findOne({ role: 'trainer' });
    const category = await db.collection('categories').findOne({});

    if (!trainer || !category) {
      console.log('No trainer or category found!');
      return;
    }

    const trainerId = trainer._id.toString();
    const categoryId = category._id.toString();

    // 2. Define course 1
    const course1Id = new ObjectId();
    const course1 = {
      _id: course1Id,
      title: "Khóa học Bán hàng Thực chiến cho Nữ giới",
      description: "Đào tạo các kỹ năng bán hàng, chốt sale thực chiến dành cho nữ giới trên 35 tuổi.",
      shortDescription: "Bán hàng thực chiến",
      categoryId: categoryId,
      duration: { value: 4, unit: "weeks" },
      fee: 0,
      isFree: true,
      maxStudents: 30,
      level: "beginner",
      delivery_type: "live",
      funding_model: "free",
      status: "approved",
      providerId: trainerId,
      thumbnail: "https://res.cloudinary.com/dvzjtzxjz/image/upload/v1726058988/luanvan/courses/placeholder1_y8u5qz.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
      location: {
        type: 'online',
        address: 'Google Meet',
        link: 'https://meet.google.com/abc-xyz'
      },
      scheduleConfig: {
        totalSessions: 12,
        sessionsPerWeek: 3,
        sessionDurationMinutes: 120,
        preferredDays: ["Monday", "Wednesday", "Friday"],
        preferredTime: "Evening",
        expectedStartDate: new Date().getTime()
      }
    };

    // Define schedule for course 1
    const schedule1Id = new ObjectId();
    const sessions1 = [];
    let d1 = new Date();
    d1.setHours(18, 0, 0, 0); // Evening
    for(let i=1; i<=12; i++) {
      sessions1.push({
        sessionNumber: i,
        title: `Buổi ${i}`,
        date: new Date(d1),
        startTime: '18:00',
        endTime: '20:00',
        duration: 120,
        instructorId: trainerId,
        location: course1.location,
        status: 'scheduled',
        attendance: []
      });
      d1.setDate(d1.getDate() + 2); // Roughly add days
    }

    const schedule1 = {
      _id: schedule1Id,
      courseId: course1Id.toString(),
      providerId: trainerId,
      title: `Lịch học - ${course1.title}`,
      description: 'Lịch học được tạo tự động',
      status: 'published',
      startDate: sessions1[0].date,
      endDate: sessions1[11].date,
      totalSessions: 12,
      completedSessions: 0,
      location: course1.location,
      sessions: sessions1,
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      _destroy: false
    };

    // 3. Define course 2
    const course2Id = new ObjectId();
    const course2 = {
      _id: course2Id,
      title: "Chuyên viên Tư vấn Chăm sóc Sức khỏe",
      description: "Khóa học đào tạo kỹ năng tư vấn chăm sóc sức khỏe, phù hợp với người muốn chuyển đổi nghề nghiệp.",
      shortDescription: "Tư vấn chăm sóc sức khỏe",
      categoryId: categoryId,
      duration: { value: 2, unit: "months" },
      fee: 500000,
      isFree: false,
      maxStudents: 20,
      level: "intermediate",
      delivery_type: "offline",
      funding_model: "learner_paid",
      status: "approved",
      providerId: trainerId,
      thumbnail: "https://res.cloudinary.com/dvzjtzxjz/image/upload/v1726058988/luanvan/courses/placeholder2_v2x5pa.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
      location: {
        type: 'offline',
        address: 'Trung tâm VHTT Quận 1, TPHCM'
      },
      scheduleConfig: {
        totalSessions: 8,
        sessionsPerWeek: 2,
        sessionDurationMinutes: 180,
        preferredDays: ["Saturday", "Sunday"],
        preferredTime: "Morning",
        expectedStartDate: new Date().getTime() + 7 * 24 * 60 * 60 * 1000 // Next week
      }
    };

    // Define schedule for course 2
    const schedule2Id = new ObjectId();
    const sessions2 = [];
    let d2 = new Date();
    d2.setDate(d2.getDate() + 7);
    d2.setHours(8, 0, 0, 0); // Morning
    for(let i=1; i<=8; i++) {
      sessions2.push({
        sessionNumber: i,
        title: `Buổi ${i}`,
        date: new Date(d2),
        startTime: '08:00',
        endTime: '11:00',
        duration: 180,
        instructorId: trainerId,
        location: course2.location,
        status: 'scheduled',
        attendance: []
      });
      d2.setDate(d2.getDate() + (i%2 === 0 ? 6 : 1)); // Sat/Sun
    }

    const schedule2 = {
      _id: schedule2Id,
      courseId: course2Id.toString(),
      providerId: trainerId,
      title: `Lịch học - ${course2.title}`,
      description: 'Lịch học được tạo tự động',
      status: 'published',
      startDate: sessions2[0].date,
      endDate: sessions2[7].date,
      totalSessions: 8,
      completedSessions: 0,
      location: course2.location,
      sessions: sessions2,
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      _destroy: false
    };

    // 4. Insert courses and schedules
    await db.collection('courses').insertMany([course1, course2]);
    await db.collection('schedules').insertMany([schedule1, schedule2]);

    console.log("Mocked courses and schedules successfully!");
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

mockCourses();
