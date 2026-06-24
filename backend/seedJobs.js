import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const database = client.db(process.env.DATABASE_NAME);
    const usersCollection = database.collection('users');
    const jobsCollection = database.collection('recruitment_jobs');

    // 1. Lấy thông tin enterprise@gmail.com
    let user = await usersCollection.findOne({ email: 'enterprise@gmail.com' });
    if (!user) {
      console.log('Không tìm thấy tài khoản enterprise@gmail.com. Hãy đảm bảo tài khoản đã được tạo.');
      return;
    }
    const enterpriseId = user._id.toString();
    const enterpriseName = user.displayName || 'Tech Innovators JSC';
    console.log('Tiến hành tạo thêm 10 job với nhiều trạng thái cho ID:', enterpriseId);

    // 2. Tạo 10 job giả với các status khác nhau
    const jobTitles = [
      'C++ Software Engineer',
      'IOS Developer (Swift)',
      'IT Helpdesk',
      'Database Administrator',
      'Golang Developer',
      'Frontend Developer (Svelte)',
      'Technical Writer',
      'ERP Consultant',
      'Network Engineer',
      'Cloud Security Engineer'
    ];

    const statuses = [
      'draft', 'draft', 
      'pending_approval', 'pending_approval', 
      'published', 'published', 
      'closed', 'closed', 
      'expired', 'expired'
    ];

    const locations = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng'];
    const locationTypes = ['onsite', 'remote', 'hybrid'];
    const jobTypes = ['full-time', 'part-time', 'freelance', 'temporary'];
    const allSkills = ['C++', 'Swift', 'Linux', 'MySQL', 'Go', 'Svelte', 'Writing', 'SAP', 'Cisco', 'Security'];

    const mockJobs = jobTitles.map((title, index) => {
      const locationType = locationTypes[index % 3];
      const province = locationType === 'remote' ? 'Remote' : locations[index % 3];
      const jType = jobTypes[index % 4];
      const minSalary = 8000000 + (index * 1500000);
      const maxSalary = minSalary + 4000000;
      
      const status = statuses[index];
      
      return {
        enterpriseId,
        enterpriseInfo: {
          name: enterpriseName,
          logo: 'https://via.placeholder.com/150',
          industry: 'Information Technology',
          size: '100-500',
          verified: true
        },
        job: {
          title,
          description: `Mô tả công việc cho vị trí ${title} (Status: ${status}).`,
          requirements: [
            'Có tinh thần trách nhiệm',
            'Sẵn sàng học hỏi'
          ],
          benefits: [
            'Lương thưởng hấp dẫn',
            'Bảo hiểm y tế'
          ],
          salary: {
            min: minSalary,
            max: maxSalary,
            negotiable: index % 2 === 0,
            currency: 'VND'
          },
          type: jType,
          quantity: 1,
          gender: 'any',
          ageRange: { min: 22, max: 35 },
          workingHours: 'Thứ 2 - Thứ 6, 9:00 - 18:00',
          category: 'IT/Software'
        },
        requirements: {
          education: 'university',
          experience: index % 4,
          skills: [allSkills[index]],
          certifications: [],
          languages: ['English']
        },
        location: {
          address: 'Tòa nhà văn phòng XYZ',
          province,
          district: '',
          ward: '',
          type: locationType,
          coordinates: { lat: 10.762622, lng: 106.660172 }
        },
        interviewConfig: {
          meetingType: 'google_meet',
          duration: 60,
          allowReschedule: true,
          maxReschedules: 2,
          reminderMinutes: 60,
          suggestedSlots: []
        },
        targetCourses: [],
        hiringBonus: {
          enabled: false,
          amount: null,
          payoutCondition: null
        },
        stats: {
          views: Math.floor(Math.random() * 200),
          applications: Math.floor(Math.random() * 10),
          shortlisted: Math.floor(Math.random() * 5),
          interviews: 0,
          hires: 0
        },
        status,
        deadline: status === 'expired' ? Date.now() - (10 * 24 * 60 * 60 * 1000) : Date.now() + (30 * 24 * 60 * 60 * 1000), // expired job có deadline ở quá khứ
        rejectionReason: status === 'closed' ? (index % 2 === 0 ? 'Đã tuyển đủ người' : null) : null,
        publishedAt: (status === 'published' || status === 'closed' || status === 'expired') ? Date.now() - (15 * 24 * 60 * 60 * 1000) : null,
        createdAt: Date.now() - (20 * 24 * 60 * 60 * 1000),
        updatedAt: Date.now(),
        _destroy: false
      };
    });

    const insertResult = await jobsCollection.insertMany(mockJobs);
    console.log(`Đã chèn thành công ${insertResult.insertedCount} job mới với các trạng thái khác nhau!`);

  } catch (error) {
    console.error('Lỗi trong quá trình tạo job:', error);
  } finally {
    await client.close();
  }
}

run();
