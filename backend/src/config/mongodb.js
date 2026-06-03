import { MongoClient, ServerApiVersion } from 'mongodb'
import { env } from '~/config/enviroment'

let buildMaterialDatabaseInstance = null

const mongoClientInstance = new MongoClient(env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})

export const CONNECT_DB = async () => {
  await mongoClientInstance.connect()
  buildMaterialDatabaseInstance = mongoClientInstance.db(env.DATABASE_NAME)
}

export const CLOSE_DB = async () => {
  await mongoClientInstance.close()
}

export const GET_DB = () => {
  if (globalThis.__TEST_DB__) return globalThis.__TEST_DB__
  if (!buildMaterialDatabaseInstance) throw new Error('Bạn cần kết nối với database trước')
  return buildMaterialDatabaseInstance
}

export const SET_DB = (db) => {
  globalThis.__TEST_DB__ = db
}
