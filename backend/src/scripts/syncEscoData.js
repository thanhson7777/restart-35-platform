/**
 * ESCO Data Sync Script
 *
 * Syncs occupation and skill data from ESCO API to local MongoDB
 *
 * Usage:
 *   node src/scripts/syncEscoData.js           # Full sync
 *   node src/scripts/syncEscoData.js --dry    # Preview only
 *   node src/scripts/syncEscoData.js --reset  # Clear and re-sync
 */

import 'dotenv/config'
import axios from 'axios'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { escoOccupationModel } from '~/models/escoOccupationModel'
import { escoSkillModel } from '~/models/escoSkillModel'

const ESCO_API_BASE = 'https://ec.europa.eu/esco/api'
const BATCH_SIZE = 100

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry')
const isReset = args.includes('--reset')

const apiClient = axios.create({
  baseURL: ESCO_API_BASE,
  timeout: 30000,
  headers: {
    'Accept': 'application/json'
  }
})

async function fetchOccupations(page = 0, limit = BATCH_SIZE) {
  try {
    const response = await apiClient.get('/search', {
      params: {
        type: 'occupation',
        language: 'en',
        limit,
        page
      }
    })
    return response.data
  } catch (error) {
    console.error(`[ESCO API] Error fetching occupations at page ${page}:`, error.message)
    if (error.response) {
      console.error('[ESCO API] Status:', error.response.status)
      console.error('[ESCO API] Data:', JSON.stringify(error.response.data).substring(0, 500))
    }
    throw error
  }
}

async function fetchSkillDetails(uri) {
  try {
    const response = await apiClient.get('/resource/skill', {
      params: { uri, language: 'en' }
    })
    return response.data
  } catch (error) {
    console.error(`Error fetching skill ${uri}:`, error.message)
    return null
  }
}

function parseOccupation(data) {
  const title = data.title || data.preferredLabel || ''
  const description = data.description || ''

  const essentialSkills = []
  const optionalSkills = []

  if (data.essentialSkills) {
    data.essentialSkills.forEach(skill => {
      if (skill.uri || skill.skillUri) {
        essentialSkills.push(skill.uri || skill.skillUri)
      }
    })
  }

  if (data.optionalSkills) {
    data.optionalSkills.forEach(skill => {
      if (skill.uri || skill.skillUri) {
        optionalSkills.push(skill.uri || skill.skillUri)
      }
    })
  }

  // Handle broaderUri - can be string, array, or object
  let broaderUri = ''
  if (data.broaderOccupation) {
    if (typeof data.broaderOccupation === 'string') {
      broaderUri = data.broaderOccupation
    } else if (Array.isArray(data.broaderOccupation)) {
      broaderUri = data.broaderOccupation[0]?.uri || data.broaderOccupation[0] || ''
    } else if (data.broaderOccupation.uri) {
      broaderUri = data.broaderOccupation.uri
    }
  }

  return {
    escoUri: data.uri,
    code: data.code || data.iscoCode || '',
    iscoGroup: data.iscoGroup || '',
    broaderUri: String(broaderUri || ''),
    titleEn: title,
    descriptionEn: description,
    alternativeLabelsEn: data.alternativeLabels || [],
    essentialSkills,
    optionalSkills,
    essentialSkillsCount: essentialSkills.length,
    optionalSkillsCount: optionalSkills.length
  }
}

function parseSkill(data) {
  return {
    escoUri: data.uri,
    type: data.type === 'knowledge' ? 'knowledge' : 'skill',
    titleEn: data.title || data.preferredLabel || '',
    descriptionEn: data.description || '',
    isEssentialFor: data.isEssentialFor || [],
    isOptionalFor: data.isOptionalFor || []
  }
}

async function clearCollections() {
  console.log('Clearing existing collections...')
  const db = await import('~/config/mongodb').then(m => m.GET_DB())
  await db.collection('esco_occupations').deleteMany({})
  await db.collection('esco_skills').deleteMany({})
  console.log('Collections cleared.')
}

async function syncOccupations() {
  let offset = 0
  let totalSynced = 0
  let page = 0

  console.log('Starting occupation sync...')

  while (offset < 3000) { // ESCO has ~2942 occupations
    const results = await fetchOccupations(page, BATCH_SIZE)
    const items = results._embedded?.results || []

    if (items.length === 0) {
      break
    }

    // Parse occupations
    const occupations = items.map(parseOccupation)

    if (isDryRun) {
      console.log(`[DRY RUN] Would sync ${occupations.length} occupations (page ${page})`)
    } else {
      // Store occupations
      for (const occ of occupations) {
        await escoOccupationModel.upsertByUri(occ)
      }
    }

    totalSynced += items.length
    page++
    offset += BATCH_SIZE

    console.log(`Synced ${totalSynced} occupations...`)

    if (items.length < BATCH_SIZE) {
      break
    }
  }

  console.log(`Total occupations synced: ${totalSynced}`)
  return totalSynced
}

async function syncSkills() {
  console.log('\nStarting skills sync...')

  // Get all occupations with skills
  const db = await import('~/config/mongodb').then(m => m.GET_DB())
  const occupations = await db.collection('esco_occupations')
    .find({
      $or: [
        { essentialSkills: { $exists: true, $ne: [] } },
        { optionalSkills: { $exists: true, $ne: [] } }
      ]
    })
    .project({ essentialSkills: 1, optionalSkills: 1 })
    .toArray()

  // Collect unique skill URIs
  const skillUris = new Set()
  occupations.forEach(occ => {
    if (occ.essentialSkills) occ.essentialSkills.forEach(uri => skillUris.add(uri))
    if (occ.optionalSkills) occ.optionalSkills.forEach(uri => skillUris.add(uri))
  })

  console.log(`Found ${skillUris.size} unique skills to sync`)

  let synced = 0
  const uriArray = [...skillUris]

  // Fetch skills in batches
  for (let i = 0; i < uriArray.length; i += 20) {
    const batch = uriArray.slice(i, i + 20)

    await Promise.all(batch.map(async (uri) => {
      const skillData = await fetchSkillDetails(uri)
      if (skillData) {
        const skill = parseSkill(skillData)
        if (!isDryRun) {
          await escoSkillModel.upsertByUri(skill)
        }
      }
    }))

    synced += batch.length
    console.log(`Synced ${synced}/${uriArray.length} skills...`)
  }

  console.log(`Total skills synced: ${synced}`)
  return synced
}

async function createIndexes() {
  console.log('\nCreating indexes...')
  await escoOccupationModel.createIndexes()
  await escoSkillModel.createIndexes()
  console.log('Indexes created.')
}

async function main() {
  console.log('='.repeat(50))
  console.log('ESCO Data Sync Script')
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : isReset ? 'RESET' : 'INCREMENTAL'}`)
  console.log('='.repeat(50))

  try {
    await CONNECT_DB()
    console.log('Connected to MongoDB')

    if (isReset) {
      await clearCollections()
    }

    // Create indexes first
    await createIndexes()

    // Sync data
    const occCount = await syncOccupations()
    const skillCount = await syncSkills()

    console.log('\n' + '='.repeat(50))
    console.log('Sync Summary:')
    console.log(`  Occupations: ${occCount}`)
    console.log(`  Skills: ${skillCount}`)
    console.log('='.repeat(50))

  } catch (error) {
    console.error('Sync failed:', error)
    process.exit(1)
  } finally {
    await CLOSE_DB()
    console.log('Disconnected from MongoDB')
  }
}

main()
