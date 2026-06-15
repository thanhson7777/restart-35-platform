import { getAdminCourses } from './src/services/courseService.js';
import { GET_DB } from './src/config/mongodb.js';
import { env } from './src/config/environment.js';
import { MongoClient } from 'mongodb';

async function run() {
  const client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  global.DB_INSTANCE = client.db(env.DATABASE_NAME);

  try {
    const res = await getAdminCourses('', {}, 1, 5);
    console.log(JSON.stringify(res.courses.map(c => ({
      title: c.title,
      categoryId: c.categoryId,
      category: c.category
    })).slice(0, 3), null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
