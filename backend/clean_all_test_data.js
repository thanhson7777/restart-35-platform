const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';

// Các collection thuộc Nhóm 3 (Cân nhắc xóa)
const group3Collections = [
  'courses',
  'courseVideoLessons',
  'scholarships',
  'organizations',
  'partnerships',
  'communityCategories'
];

// Các collection thuộc Nhóm 4 (Dữ liệu người dùng, rác/test cần xóa)
const group4Collections = [
  'workerProfiles',
  'contacts',
  'recruitmentJobs',
  'applications',
  'interviews',
  'offers',
  'schedules',
  'enrollments',
  'learningRecords',
  'lessonProgresses',
  'isaRepayments',
  'videoNotes',
  'certificates',
  'jobOutcomes',
  'placements',
  'recommendationFeedbacks',
  'payments',
  'transactions',
  'wallets',
  'forumPosts',
  'comments',
  'interactions',
  'events',
  'eventRegistrations',
  'reviews',
  'mentors',
  'mentorSessions',
  'careerRecommendations',
  'courseSponsorships',
  'scholarshipApplications'
];

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('restart-35-platform');

    console.log('Bắt đầu quá trình dọn dẹp dữ liệu (HARD DELETE)...');

    // 1. Xóa toàn bộ dữ liệu trong các collection thuộc Nhóm 3 và 4
    const allCollectionsToDelete = [...group3Collections, ...group4Collections];
    
    for (const collectionName of allCollectionsToDelete) {
      try {
        const result = await db.collection(collectionName).deleteMany({});
        console.log(`Đã xóa ${result.deletedCount} bản ghi từ collection: ${collectionName}`);
      } catch (err) {
        console.log(`Bỏ qua collection (có thể không tồn tại): ${collectionName}`);
      }
    }

    // 2. Xóa Users (Nhóm 4) nhưng CHỪA LẠI ADMIN
    try {
      const userResult = await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
      console.log(`Đã xóa ${userResult.deletedCount} Users (Chừa lại admin).`);
    } catch (err) {
      console.error('Lỗi khi xóa users:', err);
    }

    console.log('\n✅ Dọn dẹp hoàn tất! Hệ thống đã sạch sẽ để test lại từ đầu.');
    console.log('Các dữ liệu quan trọng như Master Data, Job cào và ESCO đã được giữ nguyên.');

  } catch (error) {
    console.error('Lỗi kết nối DB:', error);
  } finally {
    await client.close();
  }
}

run();
