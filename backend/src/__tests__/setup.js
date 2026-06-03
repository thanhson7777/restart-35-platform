import { beforeAll, afterAll, beforeEach } from '@jest/globals'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'

console.log('[SETUP] Starting test environment setup')

let mongoServer
let client
let testDb

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()
  client = new MongoClient(mongoUri)
  await client.connect()
  testDb = client.db()
  globalThis.__TEST_DB__ = testDb
  globalThis.__TEST_CLIENT__ = client
  console.log('[SETUP] MongoDB Memory Server connected at:', mongoUri)
})

afterAll(async () => {
  console.log('[SETUP] Cleaning up test environment')
  if (client) await client.close()
  if (mongoServer) await mongoServer.stop()
})

beforeEach(async () => {
  const collections = await testDb.listCollections().toArray()
  for (const col of collections) {
    if (!col.name.startsWith('system')) {
      await testDb.collection(col.name).deleteMany({})
    }
  }
})
