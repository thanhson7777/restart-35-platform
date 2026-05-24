/**
 * ESCO Employment History Migration Script
 *
 * Migrates existing employmentHistory data from old format to new ESCO format
 * - Converts position string to occupation object
 * - Converts skills string[] to skills object[]
 *
 * Usage:
 *   node src/scripts/migrateEmploymentHistory.js      # Dry run (preview)
 *   node src/scripts/migrateEmploymentHistory.js --run  # Execute migration
 */

import 'dotenv/config'
import { CONNECT_DB, CLOSE_DB, GET_DB } from '~/config/mongodb'

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry') || !args.includes('--run')

async function migrateEmploymentHistory() {
  const db = GET_DB()
  const collection = db.collection('worker_profiles')

  console.log('='.repeat(60))
  console.log('ESCO Employment History Migration')
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'LIVE MIGRATION'}`)
  console.log('='.repeat(60))

  // Find all profiles with employmentHistory
  const profiles = await collection.find({
    employmentHistory: { $exists: true, $ne: [] }
  }).toArray()

  console.log(`\nFound ${profiles.length} profiles with employment history\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const profile of profiles) {
    try {
      const employmentHistory = profile.employmentHistory || []
      let needsUpdate = false
      const newHistory = employmentHistory.map(job => {
        const newJob = { ...job }

        // 1. Convert position string to occupation object
        if (job.position && typeof job.position === 'string') {
          // If occupation already exists as object, keep it
          if (job.occupation && typeof job.occupation === 'object' && job.occupation.uri) {
            // Already in new format, skip
          } else {
            // Convert old position to new occupation format
            newJob.occupation = {
              uri: `legacy:${job.position}`,
              code: '',
              titleEn: job.position,
              titleVi: job.position
            }
            needsUpdate = true
          }
        }

        // 2. Convert skills string[] to skills object[]
        if (job.skills && Array.isArray(job.skills)) {
          const newSkills = job.skills.map(skill => {
            if (typeof skill === 'string') {
              needsUpdate = true
              return {
                uri: `legacy:${skill}`,
                titleEn: skill,
                titleVi: skill,
                type: 'skill',
                isEssential: false
              }
            }
            return skill // Already in object format
          })
          newJob.skills = newSkills
        }

        return newJob
      })

      if (needsUpdate && !isDryRun) {
        await collection.updateOne(
          { _id: profile._id },
          { $set: { employmentHistory: newHistory, updatedAt: new Date() } }
        )
        updated++
      } else if (needsUpdate && isDryRun) {
        updated++
      } else {
        skipped++
      }

      if (isDryRun && needsUpdate) {
        console.log(`\nProfile ${profile.userId} would be updated:`)
        console.log(`  - Position converted to occupation`)
        console.log(`  - ${profile.employmentHistory.length} jobs processed`)
      }
    } catch (error) {
      console.error(`Error processing profile ${profile.userId}:`, error.message)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Migration Summary:')
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)
  console.log('='.repeat(60))

  return { updated, skipped, errors }
}

async function migrateAspirations() {
  const db = GET_DB()
  const collection = db.collection('worker_profiles')

  console.log('\n' + '='.repeat(60))
  console.log('ESCO Aspirations Migration')
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'LIVE MIGRATION'}`)
  console.log('='.repeat(60))

  // Find all profiles with aspirations.targetJob as string
  const profiles = await collection.find({
    'aspirations.targetJob': { $exists: true, $ne: null, $type: 'string' }
  }).toArray()

  console.log(`\nFound ${profiles.length} profiles with legacy targetJob\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const profile of profiles) {
    try {
      const targetJob = profile.aspirations?.targetJob

      if (targetJob && typeof targetJob === 'string') {
        const newTargetJob = {
          uri: `legacy:${targetJob}`,
          code: '',
          titleEn: targetJob,
          titleVi: targetJob
        }

        if (!isDryRun) {
          await collection.updateOne(
            { _id: profile._id },
            {
              $set: {
                'aspirations.targetJob': newTargetJob,
                updatedAt: new Date()
              }
            }
          )
          updated++
        } else {
          updated++
          console.log(`\nProfile ${profile.userId} would be updated:`)
          console.log(`  - targetJob: "${targetJob}" → occupation object`)
        }
      } else {
        skipped++
      }
    } catch (error) {
      console.error(`Error processing profile ${profile.userId}:`, error.message)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Migration Summary:')
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)
  console.log('='.repeat(60))

  return { updated, skipped, errors }
}

async function migrateSkills() {
  const db = GET_DB()
  const collection = db.collection('worker_profiles')

  console.log('\n' + '='.repeat(60))
  console.log('ESCO Aspirations Skills Migration')
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'LIVE MIGRATION'}`)
  console.log('='.repeat(60))

  // Find profiles with skills as string[] in aspirations
  const profiles = await collection.find({
    'aspirations.skills': { $exists: true, $ne: [], $elemMatch: { $type: 'string' } }
  }).toArray()

  console.log(`\nFound ${profiles.length} profiles with legacy skills\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const profile of profiles) {
    try {
      const skills = profile.aspirations?.skills || []
      const hasStringSkills = skills.some(s => typeof s === 'string')

      if (hasStringSkills) {
        const newSkills = skills.map(skill => {
          if (typeof skill === 'string') {
            return {
              uri: `legacy:${skill}`,
              titleEn: skill,
              titleVi: skill,
              type: 'skill',
              isEssential: false
            }
          }
          return skill
        })

        if (!isDryRun) {
          await collection.updateOne(
            { _id: profile._id },
            {
              $set: {
                'aspirations.skills': newSkills,
                updatedAt: new Date()
              }
            }
          )
          updated++
        } else {
          updated++
          console.log(`\nProfile ${profile.userId} would be updated:`)
          console.log(`  - ${skills.length} skills converted to objects`)
        }
      } else {
        skipped++
      }
    } catch (error) {
      console.error(`Error processing profile ${profile.userId}:`, error.message)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Migration Summary:')
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)
  console.log('='.repeat(60))

  return { updated, skipped, errors }
}

async function main() {
  try {
    await CONNECT_DB()
    console.log('Connected to MongoDB\n')

    const historyResult = await migrateEmploymentHistory()
    const aspirationsResult = await migrateAspirations()
    const skillsResult = await migrateSkills()

    console.log('\n' + '='.repeat(60))
    console.log('OVERALL MIGRATION COMPLETE')
    console.log('='.repeat(60))
    console.log(`Employment History: ${historyResult.updated} updated, ${historyResult.skipped} skipped, ${historyResult.errors} errors`)
    console.log(`Aspirations targetJob: ${aspirationsResult.updated} updated, ${aspirationsResult.skipped} skipped, ${aspirationsResult.errors} errors`)
    console.log(`Aspirations skills: ${skillsResult.updated} updated, ${skillsResult.skipped} skipped, ${skillsResult.errors} errors`)

    if (isDryRun) {
      console.log('\n>>> This was a DRY RUN. Run with --run to execute migration. <<<')
    }

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await CLOSE_DB()
    console.log('\nDisconnected from MongoDB')
  }
}

main()
