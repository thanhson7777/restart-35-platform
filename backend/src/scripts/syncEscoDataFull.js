/**
 * ESCO Data Sync Script v2 - Syncs Occupations WITH Skills
 *
 * Fetches detailed occupation data including skills from ESCO API
 *
 * Usage:
 *   npm run sync:esco:full           # Full sync with skills
 *   npm run sync:esco:full -- --dry  # Preview only
 *   npm run sync:esco:full -- --reset  # Clear and re-sync
 */

import 'dotenv/config'
import axios from 'axios'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { escoOccupationModel } from '~/models/escoOccupationModel'
import { escoSkillModel } from '~/models/escoSkillModel'

const ESCO_API_BASE = 'https://ec.europa.eu/esco/api'
const BATCH_SIZE = 100
const SKILL_BATCH_SIZE = 20
const OCC_DETAIL_DELAY = 100  // ms between occupation detail requests

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry')
const isReset = args.includes('--reset')
const limitOccupations = args.includes('--limit')
  ? parseInt(args[args.indexOf('--limit') + 1]) || 100
  : null

const apiClient = axios.create({
  baseURL: ESCO_API_BASE,
  timeout: 30000,
  headers: {
    'Accept': 'application/json'
  }
})

// Rate limiter
let lastRequestTime = 0
const rateLimit = async (ms) => {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < ms) {
    await new Promise(resolve => setTimeout(resolve, ms - elapsed))
  }
  lastRequestTime = Date.now()
}

async function fetchOccupationList(page = 0, limit = BATCH_SIZE) {
  try {
    await rateLimit(50)
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
    console.error(`[ESCO API] Error fetching occupation list at page ${page}:`, error.message)
    throw error
  }
}

async function fetchOccupationDetails(uri) {
  const maxRetries = 3
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rateLimit(OCC_DETAIL_DELAY)
      const response = await apiClient.get('/resource/occupation', {
        params: { uri, language: 'en' }
      })
      return response.data
    } catch (error) {
      lastError = error
      console.error(`[Attempt ${attempt}/${maxRetries}] Error fetching occupation ${uri}:`, error.message)

      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.response?.status === 429) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      } else {
        break
      }
    }
  }

  console.error(`Failed to fetch occupation ${uri} after ${maxRetries} attempts`)
  return null
}

async function fetchSkillDetails(uri) {
  const maxRetries = 3
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rateLimit(50)
      const response = await apiClient.get('/resource/skill', {
        params: { uri, language: 'en' }
      })
      return response.data
    } catch (error) {
      lastError = error
      console.error(`[Attempt ${attempt}/${maxRetries}] Error fetching skill ${uri}:`, error.message)

      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      } else {
        break
      }
    }
  }

  return null
}

function parseOccupation(data) {
  const title = data.title || data.preferredLabel || ''
  // Ensure description is always a string
  let description = data.description || ''
  if (typeof description !== 'string') {
    description = JSON.stringify(description) || ''
  }

  // Extract skills from _links (the actual location in ESCO API response)
  const essentialSkills = []
  const optionalSkills = []

  // Skills are in _links.hasEssentialSkill and _links.hasOptionalSkill
  const links = data._links || {}

  if (links.hasEssentialSkill) {
    links.hasEssentialSkill.forEach(skill => {
      if (skill.uri) {
        essentialSkills.push(skill.uri)
      }
    })
  }

  if (links.hasOptionalSkill) {
    links.hasOptionalSkill.forEach(skill => {
      if (skill.uri) {
        optionalSkills.push(skill.uri)
      }
    })
  }

  // Also check for direct essentialSkills/optionalSkills (fallback)
  if (data.essentialSkills && essentialSkills.length === 0) {
    data.essentialSkills.forEach(skill => {
      if (skill.uri || skill.skillUri) {
        essentialSkills.push(skill.uri || skill.skillUri)
      }
    })
  }

  if (data.optionalSkills && optionalSkills.length === 0) {
    data.optionalSkills.forEach(skill => {
      if (skill.uri || skill.skillUri) {
        optionalSkills.push(skill.uri || skill.skillUri)
      }
    })
  }

  // Handle broaderUri - can be in _links.broaderOccupation or data.broaderOccupation
  let broaderUri = ''
  if (links.broaderOccupation) {
    const broader = Array.isArray(links.broaderOccupation)
      ? links.broaderOccupation[0]
      : links.broaderOccupation
    if (broader && broader.uri) {
      broaderUri = broader.uri
    }
  } else if (data.broaderOccupation) {
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
    titleEn: String(title || ''),
    descriptionEn: description,
    alternativeLabelsEn: Array.isArray(data.alternativeLabels) ? data.alternativeLabels : [],
    essentialSkills,
    optionalSkills,
    essentialSkillsCount: essentialSkills.length,
    optionalSkillsCount: optionalSkills.length
  }
}

function parseSkill(data) {
  // Ensure fields are strings
  let description = data.description || ''
  if (typeof description !== 'string') {
    description = JSON.stringify(description) || ''
  }

  // Extract occupation URIs from _links
  const links = data._links || {}
  
  let isEssentialFor = []
  let isOptionalFor = []

  if (links.isEssentialForOccupation) {
    isEssentialFor = links.isEssentialForOccupation.map(o => o.uri || o)
  }

  if (links.isOptionalForOccupation) {
    isOptionalFor = links.isOptionalForOccupation.map(o => o.uri || o)
  }

  return {
    escoUri: data.uri,
    type: data.type === 'knowledge' ? 'knowledge' : 'skill',
    titleEn: String(data.title || data.preferredLabel || ''),
    descriptionEn: description,
    isEssentialFor,
    isOptionalFor
  }
}

async function clearCollections() {
  console.log('Clearing existing collections...')
  const db = await import('~/config/mongodb').then(m => m.GET_DB())
  await db.collection('esco_occupations').deleteMany({})
  await db.collection('esco_skills').deleteMany({})
  console.log('Collections cleared.')
}

async function syncOccupationsWithSkills() {
  console.log('\n=== Step 1: Fetching occupation list ===')

  // First, get list of all occupations
  const occupationList = []
  let page = 0
  let totalFetched = 0
  const MAX_OCCUPATIONS = 3000  // ESCO has approximately 2942 occupations

  for (;;) {
    const results = await fetchOccupationList(page, BATCH_SIZE)
    const items = results._embedded?.results || []

    if (items.length === 0) {
      break
    }

    // Filter only actual occupations (not ISCO groups or other types)
    const occupations = items.filter(item => item.className === 'Occupation')

    // Store basic occupation info (uri, title)
    occupations.forEach(item => {
      occupationList.push({
        uri: item.uri,
        title: item.title || item.preferredLabel || ''
      })
    })

    totalFetched += items.length
    page++

    console.log(`Fetched page ${page} (${items.length} items, ${occupations.length} occupations) | Total: ${occupationList.length}`)

    // Stop if we have enough occupations or API returns fewer items
    if (occupationList.length >= MAX_OCCUPATIONS) {
      console.log(`Reached max occupations limit: ${MAX_OCCUPATIONS}`)
      break
    }

    if (items.length < BATCH_SIZE) {
      break
    }
  }

  console.log(`Total occupation summaries fetched: ${occupationList.length}`)

  // Apply limit if specified
  const occupationsToProcess = limitOccupations
    ? occupationList.slice(0, limitOccupations)
    : occupationList

  console.log(`\n=== Step 2: Fetching detailed occupation data (${occupationsToProcess.length} occupations) ===`)

  const allSkillUris = new Set()
  let processed = 0
  let successCount = 0
  let failCount = 0

  for (const occ of occupationsToProcess) {
    const details = await fetchOccupationDetails(occ.uri)

    if (details) {
      const parsedOcc = parseOccupation(details)

      if (!isDryRun) {
        try {
          await escoOccupationModel.upsertByUri(parsedOcc)
        } catch (dbError) {
          console.error(`DB Error saving occupation ${occ.uri}:`, dbError.message)
        }
      }

      // Collect skill URIs
      parsedOcc.essentialSkills.forEach(uri => allSkillUris.add(uri))
      parsedOcc.optionalSkills.forEach(uri => allSkillUris.add(uri))

      successCount++
    } else {
      failCount++
    }

    processed++

    if (processed % 50 === 0) {
      console.log(`Processed ${processed}/${occupationsToProcess.length} occupations | Skills found: ${allSkillUris.size}`)
    }
  }

  console.log(`\nOccupations with details: ${successCount} success, ${failCount} failed`)
  console.log(`Total unique skill URIs found: ${allSkillUris.size}`)

  return {
    occupationCount: successCount,
    skillUriCount: allSkillUris.size,
    skillUris: [...allSkillUris]
  }
}

async function syncSkills(skillUris) {
  console.log(`\n=== Step 3: Syncing ${skillUris.length} skills ===`)

  let synced = 0
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < skillUris.length; i += SKILL_BATCH_SIZE) {
    const batch = skillUris.slice(i, i + SKILL_BATCH_SIZE)

      const results = await Promise.all(
      batch.map(async (uri) => {
        const skillData = await fetchSkillDetails(uri)
        if (skillData) {
          const skill = parseSkill(skillData)
          if (!isDryRun) {
            try {
              await escoSkillModel.upsertByUri(skill)
              return { success: true, skill }
            } catch (dbError) {
              console.error(`DB Error saving skill ${uri}:`, dbError.message)
              return { success: false, uri }
            }
          }
          return { success: true, skill }
        }
        return { success: false, uri }
      })
    )

    results.forEach(result => {
      if (result.success) {
        successCount++
      } else {
        failCount++
      }
    })

    synced += batch.length
    console.log(`Synced ${synced}/${skillUris.length} skills...`)
  }

  console.log(`Skills synced: ${successCount} success, ${failCount} failed`)
  return { successCount, failCount }
}

async function createIndexes() {
  console.log('\nCreating indexes...')
  await escoOccupationModel.createIndexes()
  await escoSkillModel.createIndexes()
  console.log('Indexes created.')
}

async function main() {
  console.log('='.repeat(60))
  console.log('ESCO Data Sync Script v2 - Full with Skills')
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : isReset ? 'RESET' : 'INCREMENTAL'}`)
  if (limitOccupations) {
    console.log(`Limit: ${limitOccupations} occupations`)
  }
  console.log('='.repeat(60))

  const startTime = Date.now()

  try {
    await CONNECT_DB()
    console.log('Connected to MongoDB')

    if (isReset) {
      await clearCollections()
    }

    await createIndexes()

    // Sync occupations with skills
    const result = await syncOccupationsWithSkills()

    // Sync skills
    if (result.skillUris.length > 0) {
      await syncSkills(result.skillUris)
    } else {
      console.log('\nNo skills to sync.')
    }

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(2)

    console.log('\n' + '='.repeat(60))
    console.log('Sync Complete!')
    console.log('='.repeat(60))
    console.log(`  Occupations synced: ${result.occupationCount}`)
    console.log(`  Skills synced: ${result.skillUriCount}`)
    console.log(`  Time elapsed: ${elapsed} minutes`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('Sync failed:', error)
    process.exit(1)
  } finally {
    await CLOSE_DB()
    console.log('Disconnected from MongoDB')
  }
}

main()
