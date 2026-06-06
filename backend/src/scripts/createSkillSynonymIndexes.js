/**
 * Script to create indexes for skill_synonyms collection.
 * Run from project root (restart-35-platform/):
 *   node backend/src/scripts/createSkillSynonymIndexes.js
 * Requires .env file in backend/ directory.
 */

import { config as loadEnv } from 'dotenv'
import { MongoClient, ServerApiVersion } from 'mongodb'

// Load .env from backend/ directory
loadEnv({ path: 'backend/.env' })

const MONGODB_URI = process.env.MONGODB_URI
const DATABASE_NAME = process.env.DATABASE_NAME

const createIndexes = async () => {
  let client = null

  try {
    if (!MONGODB_URI) {
      console.error('ERROR: MONGODB_URI not found. Is .env present in backend/ directory?')
      process.exit(1)
    }

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
    const collection = db.collection('skill_synonyms')

    console.log('Creating indexes on skill_synonyms collection...')

    await collection.createIndex({ primary_skill: 1 }, { background: true })
    console.log('  Created index: primary_skill')

    await collection.createIndex({ normalized_key: 1 }, { unique: true, background: true })
    console.log('  Created index: normalized_key (unique)')

    await collection.createIndex({ aliases: 1 }, { background: true })
    console.log('  Created index: aliases')

    await collection.createIndex({ category: 1 }, { background: true })
    console.log('  Created index: category')

    console.log('\nAll indexes created successfully!')

    console.log('\nListing all indexes on skill_synonyms:')
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
