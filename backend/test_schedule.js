const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'd:/LUAN_VAN/restart-35-platform/backend/.env' });
async function test() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('restart-35-platform');
  const user = await db.collection('users').findOne({ email: 'thanhson11052003@gmail.com' });
  if (!user) return console.log('User not found');
  const enrollments = await db.collection('enrollments').find({ userId: user._id.toString() }).toArray();
  const enrolledCourseIds = enrollments.map(e => e.courseId);
  console.log('User enrolled courseIds:', enrolledCourseIds);
  const schedules = await db.collection('schedules').find({ courseId: { $in: enrolledCourseIds } }).toArray();
  console.log('Schedules found for these courses:', schedules.map(s => s._id));
  client.close();
}
test().catch(console.error);
