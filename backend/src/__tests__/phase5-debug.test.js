import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { userModel } from '~/models/userModel'
import { workerProfileModel } from '~/models/workerProfileModel'
import { enrollmentService } from '~/services/enrollmentService'
import { StatusCodes } from 'http-status-codes'
import { USER_ROLES, EDUCATION_LEVELS, JOB_TYPES } from '~/utils/constants'
import { GET_DB } from '~/config/mongodb'

describe('Phase 2 Debug', () => {
  let trainerId, workerId

  beforeEach(async () => {
    const trainer = await userModel.createNew({
      email: `trainer_${Date.now()}@test.com`,
      password: 'password123',
      username: `trainer_${Date.now()}`,
      displayName: 'Trainer',
      phone: '0900000000',
      role: USER_ROLES.TRAINER,
      isActive: true,
      emailVerified: true
    })
    trainerId = trainer.insertedId

    const worker = await userModel.createNew({
      email: `worker_${Date.now()}@test.com`,
      password: 'password123',
      username: `worker_${Date.now()}`,
      displayName: 'Worker',
      phone: '0900000001',
      role: USER_ROLES.WORKER,
      isActive: true,
      emailVerified: true
    })
    workerId = worker.insertedId

    // Try creating worker profile
    const result = await workerProfileModel.createNew({
      userId: workerId.toString(),
      currentStep: 1,
      isCompleted: false,
      basicInfo: {
        age: 45,
        gender: 'male',
        province: 'HCM',
        education: EDUCATION_LEVELS.UNIVERSITY,
        maritalStatus: 'single',
        phone: '0900000001'
      },
      employmentHistory: [{
        occupation: 'Software Engineer',
        companyName: 'Tech Corp',
        jobType: JOB_TYPES.FULL_TIME
      }]
    }, true)
    console.log('createNew result:', JSON.stringify(result))

    // Check what's in the DB directly
    const db = await import('~/config/mongodb').then(m => m.GET_DB())
    const allProfiles = await db.collection('worker_profiles').find({}).toArray()
    console.log('All profiles in DB:', JSON.stringify(allProfiles))

    // Try completeProfile
    console.log('Calling completeProfile with:', workerId.toString())
    await workerProfileModel.completeProfile(workerId.toString())
    console.log('completeProfile done')

    // Check what's in the DB directly after completeProfile
    const afterProfiles = await db.collection('worker_profiles').find({}).toArray()
    console.log('All profiles in DB after completeProfile:', JSON.stringify(afterProfiles))

    // Verify profile was completed
    const profile = await workerProfileModel.findOneByUserId(workerId.toString())
    console.log('Profile after completeProfile:', JSON.stringify(profile))
    console.log('workerId used for query:', workerId.toString())
  })

  it('should verify setup works', () => {
    expect(trainerId).toBeDefined()
    expect(workerId).toBeDefined()
  })

  it('should create and complete worker profile', async () => {
    const profile = await workerProfileModel.findOneByUserId(workerId.toString())
    expect(profile).not.toBeNull()
    expect(profile.isCompleted).toBe(true)
  })
})
