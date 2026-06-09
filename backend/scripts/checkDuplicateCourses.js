/**
 * Check for duplicate courses by title in MongoDB
 */

const { MongoClient } = require('mongodb')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env')
  const content = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const rawValue = trimmed.slice(eqIndex + 1).trim()
    const value = rawValue.replace(/^['"]|['"]$/g, '')
    env[key] = value
  }
  return env
}

async function checkDuplicates() {
  const env = loadEnv()
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  
  try {
    await client.connect()
    const db = client.db(env.DATABASE_NAME)
    const courses = db.collection('courses')
    
    // Get all courses grouped by title
    const allCourses = await courses.find({}).toArray()
    console.log(`Total courses: ${allCourses.length}\n`)
    
    // Group by normalized title
    const groups = {}
    for (const course of allCourses) {
      const title = (course.title || '').toLowerCase().trim()
      if (!groups[title]) {
        groups[title] = []
      }
      groups[title].push({
        id: course._id.toString(),
        platform: course.platform,
        skills: course.skills?.slice(0, 3).join(', ') || 'N/A'
      })
    }
    
    // Find duplicates
    const duplicates = Object.entries(groups).filter(([_, items]) => items.length > 1)
    console.log(`Duplicate titles: ${duplicates.length}\n`)
    
    if (duplicates.length > 0) {
      console.log('=== Duplicate Courses ===')
      duplicates.forEach(([title, items], idx) => {
        console.log(`\n${idx + 1}. "${title}" (${items.length} copies)`)
        items.forEach(item => {
          console.log(`   - ID: ${item.id}`)
          console.log(`     Platform: ${item.platform}`)
          console.log(`     Skills: ${item.skills}`)
        })
      })
    } else {
      console.log('No exact duplicates found by title')
    }
    
    // Also check for similar titles (fuzzy match)
    console.log('\n=== Checking for similar titles ===')
    const titles = Object.keys(groups).sort()
    const similarPairs = []
    
    for (let i = 0; i < titles.length; i++) {
      for (let j = i + 1; j < titles.length; j++) {
        const t1 = titles[i]
        const t2 = titles[j]
        // Simple similarity: check if one contains the other or they share 80%+ words
        const words1 = new Set(t1.split(/\s+/))
        const words2 = new Set(t2.split(/\s+/))
        const intersection = [...words1].filter(w => words2.has(w)).length
        const union = new Set([...words1, ...words2]).size
        const similarity = intersection / union
        
        if (similarity > 0.7) {
          similarPairs.push({ t1, t2, similarity, count1: groups[t1].length, count2: groups[t2].length })
        }
      }
    }
    
    if (similarPairs.length > 0) {
      console.log(`Found ${similarPairs.length} similar title pairs:`)
      similarPairs.slice(0, 10).forEach((pair, idx) => {
        console.log(`\n${idx + 1}. "${pair.t1}" vs "${pair.t2}"`)
        console.log(`   Similarity: ${(pair.similarity * 100).toFixed(1)}%`)
        console.log(`   Counts: ${pair.count1} vs ${pair.count2}`)
      })
    } else {
      console.log('No similar titles found')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await client.close()
  }
}

checkDuplicates()
