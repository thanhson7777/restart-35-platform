import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const APPLICATION_STATUSES = [
  'new', 'reviewing', 'shortlisted', 'interview_scheduled', 
  'interviewed', 'offered', 'hired', 'rejected', 'withdrawn'
];

async function run() {
  try {
    await client.connect();
    const database = client.db(process.env.DATABASE_NAME);
    const usersCollection = database.collection('users');
    const jobsCollection = database.collection('recruitment_jobs');
    const appsCollection = database.collection('recruitment_applications');

    // 1. Tìm enterprise
    const enterprise = await usersCollection.findOne({ email: 'enterprise@gmail.com' });
    if (!enterprise) {
      console.log('Không tìm thấy tài khoản enterprise@gmail.com.');
      return;
    }
    const enterpriseId = enterprise._id.toString();

    // 2. Lấy danh sách jobs đã publish của enterprise này
    const jobs = await jobsCollection.find({ enterpriseId, status: 'published' }).toArray();
    if (jobs.length === 0) {
      console.log('Enterprise chưa có job nào ở trạng thái published.');
      return;
    }

    console.log('Tiến hành tạo 10 tài khoản worker và các đơn ứng tuyển...');

    // 3. Tạo 10 tài khoản worker
    const workersToInsert = [];
    for (let i = 1; i <= 10; i++) {
      workersToInsert.push({
        email: `worker_mock_${i}@gmail.com`,
        username: `worker_mock_${i}`,
        password: 'hashed_password_placeholder',
        displayName: `Worker Mock ${i}`,
        phone: `090000000${i % 10}`,
        role: 'worker',
        isActive: true,
        adminApprovalStatus: 'approved',
        createdAt: Date.now(),
        updatedAt: null,
        _destroy: false
      });
    }

    const workerInsertResult = await usersCollection.insertMany(workersToInsert);
    console.log(`Đã tạo ${workerInsertResult.insertedCount} tài khoản worker.`);
    
    // Lấy danh sách ID của worker vừa tạo
    const workerIds = Object.values(workerInsertResult.insertedIds).map(id => id.toString());

    // 4. Tạo 10 đơn ứng tuyển vào các job ngẫu nhiên của enterprise
    const appsToInsert = [];
    for (let i = 0; i < 10; i++) {
      const workerId = workerIds[i];
      const job = jobs[i % jobs.length]; // Lấy xoay vòng các job
      const status = APPLICATION_STATUSES[i % APPLICATION_STATUSES.length]; // Lấy xoay vòng status

      appsToInsert.push({
        jobId: job._id.toString(),
        workerId: workerId,
        enterpriseId: enterpriseId,
        status: status,
        source: 'direct',
        coverLetter: `Xin chào, tôi là Worker Mock ${i + 1}. Tôi viết đơn này để ứng tuyển vào vị trí ${job.job.title}. Tôi có kinh nghiệm phù hợp với yêu cầu công việc.`,
        notes: '',
        internalNotes: '',
        shortlistReason: status === 'shortlisted' ? 'Phù hợp yêu cầu' : '',
        interviewId: null,
        offerId: null,
        statusHistory: [{
          status: status,
          changedAt: Date.now(),
          changedBy: workerId,
          note: 'Hệ thống tạo đơn mock'
        }],
        appliedAt: Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000), // Random apply time
        updatedAt: Date.now(),
        _destroy: false
      });
    }

    const appInsertResult = await appsCollection.insertMany(appsToInsert);
    console.log(`Đã tạo ${appInsertResult.insertedCount} đơn ứng tuyển với các trạng thái khác nhau!`);

    // (Tùy chọn) Cập nhật số lượng ứng viên (stats.applications) trong collection job
    for (const app of appsToInsert) {
      await jobsCollection.updateOne(
        { _id: new ObjectId(app.jobId) },
        { $inc: { 'stats.applications': 1 } }
      );
    }
    console.log('Đã cập nhật thống kê (stats) cho các job.');

  } catch (error) {
    console.error('Lỗi trong quá trình tạo applications:', error);
  } finally {
    await client.close();
  }
}

run();
