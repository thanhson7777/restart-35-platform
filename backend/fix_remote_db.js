const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('restart-35-platform');
  const sponsorships = await db.collection('course_sponsorships').find({ 'sponsorType': 'enterprise' }).toArray();
  for (const sp of sponsorships) {
     if (sp.title && sp.title.includes('Hoàng Gia')) {
        const newTitle = 'Tài trợ từ TẬP ĐOÀN VINGROUP - CÔNG TY CP';
        await db.collection('course_sponsorships').updateOne({ _id: sp._id }, { $set: { title: newTitle } });
        console.log(`Updated sponsorship ${sp._id} title to: ${newTitle}`);
     }
  }

  const courses = await db.collection('courses').find({ description: { $regex: 'Hoàng Gia' } }).toArray();
  for (const c of courses) {
      const newDesc = c.description.replace(/Công ty TNHH Giải pháp An ninh Vệ sĩ Hoàng Gia/g, 'TẬP ĐOÀN VINGROUP - CÔNG TY CP');
      await db.collection('courses').updateOne({ _id: c._id }, { $set: { description: newDesc } });
      console.log(`Updated course ${c._id} description`);
  }
  
  // also check the specific course
  const course = await db.collection('courses').findOne({ title: { $regex: /nhân viên bảo vệ/i } });
  if (course) {
     console.log('Course ID:', course._id);
     const sps = await db.collection('course_sponsorships').find({ 'linkedCourses.courseId': String(course._id) }).toArray();
     console.log('Sponsorships for this course:', JSON.stringify(sps, null, 2));
  }
  
  await client.close();
}

run();
