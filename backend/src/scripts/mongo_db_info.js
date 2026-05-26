// Script để kết nối MongoDB Atlas và lấy thông tin database
// Chạy: node scripts/mongo_db_info.js

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './src/config/enviroment.js' });

// Lấy thông tin từ .env
const MONGODB_URI = 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0';
const DATABASE_NAME = 'restart-35-platform';

async function getMongoDBInfo() {
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log('✅ Kết nối MongoDB Atlas thành công!\n');

    const db = client.db(DATABASE_NAME);
    
    // Lấy danh sách collections
    const collections = await db.listCollections().toArray();
    
    console.log('📊 THÔNG TIN DATABASE:', DATABASE_NAME);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Thông tin từng collection
    for (const coll of collections) {
      const collection = db.collection(coll.name);
      const stats = await collection.stats();
      
      console.log(`📦 Collection: ${coll.name}`);
      console.log(`   ├─ Số documents: ${stats.count}`);
      console.log(`   ├─ Kích thước (bytes): ${stats.size}`);
      console.log(`   └─ Indexes: ${stats.nIndexes}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📈 TỔNG KẾT:');
    console.log(`   ├─ Tổng số collections: ${collections.length}`);
    
    const totalDocs = collections.reduce(async (acc, coll) => {
      const collection = db.collection(coll.name);
      const stats = await collection.stats();
      return (await acc) + stats.count;
    }, Promise.resolve(0));
    
    console.log(`   ├─ Tổng số documents: ${await totalDocs}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Thông tin cluster
    const adminDb = client.db('admin');
    const serverStatus = await adminDb.command({ serverStatus: 1 });
    
    console.log('🖥️  CLUSTER INFO:');
    console.log(`   ├─ MongoDB Version: ${serverStatus.version}`);
    console.log(`   ├─ Uptime: ${Math.floor(serverStatus.uptime / 86400)} days`);
    console.log(`   ├─ Storage Engine: ${serverStatus.storageEngine.name}`);
    console.log(`   └─ Cluster: cluster0.axntlfn.mongodb.net`);

  } catch (error) {
    console.error('❌ Lỗi kết nối:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Đã đóng kết nối MongoDB');
  }
}

getMongoDBInfo();
