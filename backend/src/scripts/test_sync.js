/**
 * Simple ESCO Sync Test Script
 * Test xem data có được lưu vào MongoDB không
 * 
 * Usage: node test_sync.js
 */

import 'dotenv/config'
import axios from 'axios'
import { MongoClient } from 'mongodb'

const ESCO_API_BASE = 'https://ec.europa.eu/esco/api'
const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.DATABASE_NAME || 'restart-35-platform'

async function testSync() {
  console.log('=== ESCO Sync Test ===\n')

  // 1. Test MongoDB connection
  console.log('1. Testing MongoDB connection...')
  const mongoClient = new MongoClient(MONGODB_URI)
  try {
    await mongoClient.connect()
    const db = mongoClient.db(DB_NAME)
    console.log('   ✓ MongoDB connected')

    // Check current count
    const occCount = await db.collection('esco_occupations').countDocuments()
    console.log(`   Current occupations in DB: ${occCount}`)
  } catch (err) {
    console.error('   ✗ MongoDB error:', err.message)
    return
  }

  // 2. Test ESCO API
  console.log('\n2. Testing ESCO API...')
  try {
    const response = await axios.get(`${ESCO_API_BASE}/search`, {
      params: {
        type: 'occupation',
        language: 'en',
        limit: 5
      },
      timeout: 10000
    })

    if (response.data._embedded?.results) {
      console.log(`   ✓ ESCO API working, found ${response.data._embedded.results.length} items`)
      console.log('   Sample:', response.data._embedded.results[0]?.title)
    } else {
      console.log('   ✗ Unexpected response format')
      console.log(JSON.stringify(response.data, null, 2))
    }
  } catch (err) {
    console.error('   ✗ ESCO API error:', err.message)
    return
  }

  // 3. Test fetching one occupation detail
  console.log('\n3. Testing occupation detail fetch...')
  try {
    // Get first occupation URI from list
    const listResponse = await axios.get(`${ESCO_API_BASE}/search`, {
      params: { type: 'occupation', language: 'en', limit: 1 }
    })

    const occUri = listResponse.data._embedded?.results?.[0]?.uri
    if (!occUri) {
      console.log('   ✗ No occupation URI found')
      return
    }

    console.log(`   Fetching: ${occUri}`)

    const detailResponse = await axios.get(`${ESCO_API_BASE}/resource/occupation`, {
      params: { uri: occUri, language: 'en' },
      timeout: 10000
    })

    if (detailResponse.data.title) {
      console.log(`   ✓ Got occupation: ${detailResponse.data.title}`)
      console.log('   Skills:', detailResponse.data._links?.hasEssentialSkill?.length || 0, 'essential,',
        detailResponse.data._links?.hasOptionalSkill?.length || 0, 'optional')
    }
  } catch (err) {
    console.error('   ✗ Error:', err.message)
  }

  // 4. Test save to MongoDB
  console.log('\n4. Testing save to MongoDB...')
  const testDoc = {
    escoUri: 'http://data.europa.eu/esco/occupation/test-123',
    titleEn: 'Test Occupation',
    titleVi: '',
    essentialSkills: [],
    optionalSkills: [],
    translationStatus: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  try {
    await db.collection('esco_occupations').deleteMany({ escoUri: 'http://data.europa.eu/esco/occupation/test-123' })
    const result = await db.collection('esco_occupations').insertOne(testDoc)
    console.log('   ✓ Inserted test document:', result.insertedId)

    // Verify it exists
    const found = await db.collection('esco_occupations').findOne({ escoUri: 'http://data.europa.eu/esco/occupation/test-123' })
    if (found) {
      console.log('   ✓ Verified: Document exists in DB')
    } else {
      console.log('   ✗ Document not found after insert!')
    }

    // Cleanup
    await db.collection('esco_occupations').deleteOne({ escoUri: 'http://data.europa.eu/esco/occupation/test-123' })
    console.log('   ✓ Cleaned up test document')
  } catch (err) {
    console.error('   ✗ Save error:', err.message)
  }

  // 5. Summary
  console.log('\n=== Test Complete ===')

  await mongoClient.close()
  console.log('MongoDB disconnected')
}

testSync().catch(console.error)
