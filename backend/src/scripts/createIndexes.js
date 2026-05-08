/**
 * Script to create indexes for career_recommendations collection
 * Run standalone: node src/scripts/createIndexes.js
 * Requires .env file in backend root
 */

import 'dotenv/config'
import { MongoClient, ServerApiVersion } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI
const DATABASE_NAME = process.env.DATABASE_NAME

const createIndexes = async () => {
  let client = null

  try {
    console.log('Connecting to database...')

    client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      }
    })

    await client.connect()
    const db = client.db(DATABASE_NAME)
    const collection = db.collection('career_recommendations')

    console.log('Creating indexes...')

    // Unique index on userId
    await collection.createIndex(
      { userId: 1 },
      { unique: true, background: true }
    )
    console.log('Created index: userId (unique)')

    // TTL index for automatic expiration
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, background: true }
    )
    console.log('Created index: expiresAt (TTL)')

    // Index for status filtering
    await collection.createIndex(
      { status: 1, userId: 1 },
      { background: true }
    )
    console.log('Created index: status + userId')

    // Index for cleanup queries
    await collection.createIndex(
      { _destroy: 1, expiresAt: 1 },
      { background: true }
    )
    console.log('Created index: _destroy + expiresAt')

    // Index for generatedAt (for analytics)
    await collection.createIndex(
      { generatedAt: -1 },
      { background: true }
    )
    console.log('Created index: generatedAt (descending)')

    console.log('\nAll indexes created successfully!')

    // List all indexes
    console.log('\nListing all indexes on career_recommendations:')
    const indexes = await collection.indexes()
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}:`, idx.key)
    })

  } catch (error) {
    console.error('Error creating indexes:', error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('\nDatabase connection closed')
    }
    process.exit(0)
  }
}

createIndexes()
