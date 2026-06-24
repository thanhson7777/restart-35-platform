const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: 'd:/LUAN_VAN/restart-35-platform/backend/.env' });

async function seed() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(process.env.DATABASE_NAME);

    // 1. Get or create a trainer
    let trainer = await db.collection('users').findOne({ role: 'trainer' });
    if (!trainer) {
      // Find any user or create one
      const anyUser = await db.collection('users').findOne({});
      if (anyUser) {
        trainer = anyUser;
        console.log('Using fallback user as trainer:', trainer.email);
      } else {
        console.log('No users found in database to assign as course provider. Please register a trainer first.');
        process.exit(1);
      }
    }
    const trainerId = trainer._id.toString();

    // 2. Get or create categories
    let categories = await db.collection('categories').find({}).toArray();
    if (categories.length === 0) {
      // Seed a few basic categories
      const mockCategories = [
        { name: 'Kỹ thuật & Công nghiệp', slug: 'ky-thuat-cong-nghiep', createdAt: new Date(), updatedAt: new Date() },
        { name: 'Thương mại & Dịch vụ', slug: 'thuong-mai-dich-vu', createdAt: new Date(), updatedAt: new Date() },
        { name: 'Công nghệ & Tin học', slug: 'cong-nghe-tin-hoc', createdAt: new Date(), updatedAt: new Date() },
        { name: 'Y tế & Chăm sóc', slug: 'y-te-cham-soc', createdAt: new Date(), updatedAt: new Date() }
      ];
      const result = await db.collection('categories').insertMany(mockCategories);
      categories = await db.collection('categories').find({}).toArray();
      console.log('Seeded course categories:', result.insertedCount);
    }

    const catId1 = categories[0]._id.toString();
    const catId2 = (categories[1] || categories[0])._id.toString();
    const catId3 = (categories[2] || categories[0])._id.toString();
    const catId4 = (categories[3] || categories[0])._id.toString();

    // 3. Clear only the 12 professional courses and their schedules to avoid duplicates
    const titles = [
      "Kỹ thuật Hàn điện & Hàn công nghệ cao",
      "Kỹ năng Nấu ăn & Bếp trưởng Nhà hàng",
      "Quản lý Kho bãi & Giao nhận Logistics",
      "Bán hàng Thực chiến trên Sàn Thương mại Điện tử",
      "Tin học Văn phòng & Số hóa dữ liệu cơ bản",
      "Nghiệp vụ Chăm sóc người già & Hỗ trợ Y tế tại nhà",
      "Kỹ thuật May đo & Thiết kế thời trang ứng dụng",
      "Lái xe nâng & Vận hành xe công trình an toàn",
      "Lắp đặt & Sửa chữa hệ thống Điện dân dụng",
      "Quản lý và Vận hành cửa hàng bán lẻ",
      "Bảo trì & Sửa chữa Điện lạnh dân dụng",
      "Giao tiếp & Tư vấn chăm sóc Khách hàng chuyên nghiệp"
    ];
    const existingCourses = await db.collection('courses').find({ title: { $in: titles } }).toArray();
    const existingCourseIds = existingCourses.map(c => c._id.toString());
    if (existingCourseIds.length > 0) {
      await db.collection('courses').deleteMany({ _id: { $in: existingCourses.map(c => c._id) } });
      await db.collection('schedules').deleteMany({ courseId: { $in: existingCourseIds } });
      console.log(`Cleared ${existingCourseIds.length} existing target courses and their schedules.`);
    }

    // 4. Define 12 courses
    const courseTemplates = [
      {
        title: "Kỹ thuật Hàn điện & Hàn công nghệ cao",
        description: "Khóa học đào tạo kỹ năng hàn xì dân dụng, hàn công nghệ cao cho người lao động cơ khí, giúp nâng cao tay nghề và cơ hội làm việc tại nhà máy.",
        shortDescription: "Kỹ năng hàn điện cơ bản và nâng cao",
        categoryId: catId1,
        fee: 0,
        isFree: true,
        maxStudents: 35,
        level: "beginner",
        delivery_type: "offline",
        funding_model: "free",
        thumbnail: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop",
        address: "Xưởng cơ khí thực hành Restart, Quận 9, TPHCM"
      },
      {
        title: "Kỹ năng Nấu ăn & Bếp trưởng Nhà hàng",
        description: "Học kỹ năng sơ chế, chế biến món ăn và quản lý khu bếp nhà hàng chuyên nghiệp. Thích hợp cho người muốn tự mở quán ăn hoặc xin việc làm bếp.",
        shortDescription: "Bếp nấu ăn thương mại thực chiến",
        categoryId: catId2,
        fee: 650000,
        isFree: false,
        maxStudents: 25,
        level: "intermediate",
        delivery_type: "offline",
        funding_model: "learner_paid",
        thumbnail: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=400&fit=crop",
        address: "Trung tâm Đào tạo Ẩm thực Việt, Quận 3, TPHCM"
      },
      {
        title: "Quản lý Kho bãi & Giao nhận Logistics",
        description: "Đào tạo nghiệp vụ quản lý xuất nhập tồn kho, quản lý hàng hóa bằng phần mềm và quy trình đóng gói, giao nhận vận tải hàng hóa chuyên nghiệp.",
        shortDescription: "Nghiệp vụ kho vận Logistics",
        categoryId: catId2,
        fee: 0,
        isFree: true,
        maxStudents: 40,
        level: "beginner",
        delivery_type: "live",
        funding_model: "free",
        thumbnail: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop",
        address: "Học trực tuyến qua Google Meet"
      },
      {
        title: "Bán hàng Thực chiến trên Sàn Thương mại Điện tử",
        description: "Cách tạo gian hàng, tối ưu hóa sản phẩm và chạy quảng cáo bán hàng trên Shopee, Lazada, TikTok Shop cho người mới bắt đầu.",
        shortDescription: "Kinh doanh online hiệu quả",
        categoryId: catId3,
        fee: 450000,
        isFree: false,
        maxStudents: 30,
        level: "beginner",
        delivery_type: "live",
        funding_model: "learner_paid",
        thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
        address: "Học trực tuyến qua Zoom"
      },
      {
        title: "Tin học Văn phòng & Số hóa dữ liệu cơ bản",
        description: "Làm chủ Excel, Word, Google Sheets và kỹ năng số hóa văn phòng giúp người lao động trung niên tự tin hòa nhập môi trường số.",
        shortDescription: "Kỹ năng máy tính văn phòng thực tế",
        categoryId: catId3,
        fee: 0,
        isFree: true,
        maxStudents: 50,
        level: "beginner",
        delivery_type: "live",
        funding_model: "free",
        thumbnail: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&h=400&fit=crop",
        address: "Học trực tuyến qua Google Meet"
      },
      {
        title: "Nghiệp vụ Chăm sóc người già & Hỗ trợ Y tế tại nhà",
        description: "Khóa học đào tạo kỹ năng sơ cấp cứu, chăm sóc dinh dưỡng và hỗ trợ sinh hoạt cho người cao tuổi chuyên nghiệp.",
        shortDescription: "Điều dưỡng viên & Chăm sóc gia đình",
        categoryId: catId4,
        fee: 0,
        isFree: true,
        maxStudents: 30,
        level: "intermediate",
        delivery_type: "offline",
        funding_model: "free",
        thumbnail: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&h=400&fit=crop",
        address: "Bệnh viện Thực hành Hòa Bình, Bình Thạnh, TPHCM"
      },
      {
        title: "Kỹ thuật May đo & Thiết kế thời trang ứng dụng",
        description: "Học cắt may các trang phục cơ bản, sử dụng máy may công nghiệp và thiết kế đầm, áo sơ mi dân dụng.",
        shortDescription: "Học nghề may mặc công nghiệp và tự doanh",
        categoryId: catId1,
        fee: 500000,
        isFree: false,
        maxStudents: 20,
        level: "beginner",
        delivery_type: "offline",
        funding_model: "learner_paid",
        thumbnail: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&h=400&fit=crop",
        address: "Nhà văn hóa Phụ nữ TPHCM, Quận 7, TPHCM"
      },
      {
        title: "Lái xe nâng & Vận hành xe công trình an toàn",
        description: "Huấn luyện an toàn, thực hành điều khiển các dòng xe nâng hàng, xe nâng điện phục vụ tại bến bãi, cảng biển và kho hàng.",
        shortDescription: "Chứng chỉ vận hành xe nâng chuyên nghiệp",
        categoryId: catId1,
        fee: 0,
        isFree: true,
        maxStudents: 25,
        level: "intermediate",
        delivery_type: "offline",
        funding_model: "free",
        thumbnail: "https://images.unsplash.com/photo-1605787020600-b9ebd5df1d07?w=600&h=400&fit=crop",
        address: "Cảng Cát Lái, Xưởng thực nghiệm xe nâng, Quận 2, TPHCM"
      },
      {
        title: "Lắp đặt & Sửa chữa hệ thống Điện dân dụng",
        description: "Cách thiết kế đi dây điện âm tường, xử lý sự cố chập điện, lắp đặt các thiết bị điện và smarthome cơ bản.",
        shortDescription: "Nghề điện dân dụng thực tế",
        categoryId: catId1,
        fee: 300000,
        isFree: false,
        maxStudents: 30,
        level: "beginner",
        delivery_type: "offline",
        funding_model: "learner_paid",
        thumbnail: "https://images.unsplash.com/photo-1621905252507-b354bc25edac?w=600&h=400&fit=crop",
        address: "Trường Cao đẳng Nghề Kỹ thuật TPHCM, Quận 5, TPHCM"
      },
      {
        title: "Quản lý và Vận hành cửa hàng bán lẻ",
        description: "Học cách quản lý trưng bày, lên kế hoạch nhập hàng, đối soát doanh thu và kỹ năng quản lý nhân viên bán hàng chuỗi.",
        shortDescription: "Nghiệp vụ quản lý cửa hàng bán lẻ",
        categoryId: catId2,
        fee: 0,
        isFree: true,
        maxStudents: 45,
        level: "advanced",
        delivery_type: "live",
        funding_model: "free",
        thumbnail: "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=600&h=400&fit=crop",
        address: "Học trực tuyến qua Google Meet"
      },
      {
        title: "Bảo trì & Sửa chữa Điện lạnh dân dụng",
        description: "Quy trình vệ sinh máy lạnh, nạp gas, sửa bo mạch điều hòa, tủ lạnh, máy giặt từ cơ bản đến chuyên nghiệp.",
        shortDescription: "Điện lạnh & Thiết bị gia dụng",
        categoryId: catId1,
        fee: 800000,
        isFree: false,
        maxStudents: 20,
        level: "intermediate",
        delivery_type: "offline",
        funding_model: "learner_paid",
        thumbnail: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=600&h=400&fit=crop",
        address: "Trung tâm Đào tạo Kỹ thuật Việt, Tân Bình, TPHCM"
      },
      {
        title: "Giao tiếp & Tư vấn chăm sóc Khách hàng chuyên nghiệp",
        description: "Giải quyết khiếu nại, kỹ năng nắm bắt tâm lý khách hàng qua điện thoại, xử lý tình huống khẩn cấp cho tổng đài viên.",
        shortDescription: "Nghiệp vụ Telesales & Customer Service",
        categoryId: catId2,
        fee: 0,
        isFree: true,
        maxStudents: 40,
        level: "beginner",
        delivery_type: "live",
        funding_model: "free",
        thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop",
        address: "Học trực tuyến qua Zoom"
      }
    ];

    const coursesToInsert = courseTemplates.map((c) => {
      const courseId = new ObjectId();
      
      // Schedule config
      const expectedStartDate = new Date().getTime() + 15 * 24 * 60 * 60 * 1000;
      
      const courseObj = {
        _id: courseId,
        title: c.title,
        description: c.description,
        shortDescription: c.shortDescription,
        categoryId: c.categoryId,
        duration: { value: 6, unit: "weeks" },
        fee: c.fee,
        isFree: c.isFree,
        maxStudents: c.maxStudents,
        level: c.level,
        delivery_type: c.delivery_type,
        funding_model: c.funding_model,
        status: "approved",
        providerId: trainerId,
        thumbnail: c.thumbnail,
        createdAt: new Date(),
        updatedAt: new Date(),
        location: {
          type: c.delivery_type === 'live' ? 'online' : 'offline',
          address: c.address,
          link: c.delivery_type === 'live' ? 'https://meet.google.com/abc-xyz-123' : undefined
        },
        scheduleConfig: {
          totalSessions: 12,
          sessionsPerWeek: 2,
          sessionDurationMinutes: 120,
          preferredDays: ["Tuesday", "Thursday"],
          preferredTime: "Evening",
          expectedStartDate: expectedStartDate
        }
      };

      // Create a schedule for this course
      const scheduleId = new ObjectId();
      const sessions = [];
      let d = new Date(expectedStartDate);
      d.setHours(18, 0, 0, 0);

      for (let i = 1; i <= 12; i++) {
        sessions.push({
          sessionNumber: i,
          title: `Buổi học ${i}: Nội dung chuyên đề ${i}`,
          date: new Date(d),
          startTime: '18:00',
          endTime: '20:00',
          duration: 120,
          instructorId: trainerId,
          location: courseObj.location,
          status: 'scheduled',
          attendance: []
        });
        d.setDate(d.getDate() + (i % 2 === 0 ? 5 : 2)); // Alternate Tuesday/Thursday gap
      }

      const scheduleObj = {
        _id: scheduleId,
        courseId: courseId.toString(),
        providerId: trainerId,
        title: `Lịch trình học - ${c.title}`,
        description: `Bảng lịch trình học chính thức cho khóa học ${c.title}`,
        status: 'published',
        startDate: sessions[0].date,
        endDate: sessions[11].date,
        totalSessions: 12,
        completedSessions: 0,
        location: courseObj.location,
        sessions: sessions,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        _destroy: false
      };

      return { courseObj, scheduleObj };
    });

    const coursesList = coursesToInsert.map(x => x.courseObj);
    const schedulesList = coursesToInsert.map(x => x.scheduleObj);

    await db.collection('courses').insertMany(coursesList);
    await db.collection('schedules').insertMany(schedulesList);

    console.log('--- Database Seeding Complete ---');
    console.log('Seeded courses:', coursesList.length);
    console.log('Seeded schedules:', schedulesList.length);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding courses:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}
seed().catch(console.dir);
