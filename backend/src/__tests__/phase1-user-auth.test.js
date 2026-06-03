/**
 * Phase 1 — User & Auth Model & Service Tests
 *
 * Tests cover: userModel CRUD, userService business logic, Joi validation
 */

import { describe, it, expect } from '@jest/globals'
import { ObjectId } from 'mongodb'
import { userModel } from '~/models/userModel'
import { userService } from '~/services/userService'
import { StatusCodes } from 'http-status-codes'
import { USER_ROLES } from '~/utils/constants'

// ============================================================
// userModel Tests
// ============================================================
describe('userModel', () => {
  const validUserData = {
    email: 'test@example.com',
    password: 'password123',
    username: 'testuser',
    displayName: 'Test User',
    phone: '0900000000',
    role: USER_ROLES.WORKER
  }

  describe('createNew', () => {
    it('should create a new user with valid data', async () => {
      const result = await userModel.createNew(validUserData)
      expect(result.insertedId).toBeDefined()
    })

    it('should reject duplicate email', async () => {
      await userModel.createNew(validUserData)
      await expect(userModel.createNew(validUserData)).rejects.toThrow()
    })

    it('should reject invalid email format', async () => {
      await expect(userModel.createNew({ ...validUserData, email: 'invalid-email' })).rejects.toThrow()
    })

    it('should reject missing required fields', async () => {
      await expect(userModel.createNew({ email: 'test2@example.com' })).rejects.toThrow()
    })
  })

  describe('findOneById', () => {
    it('should find user by valid ObjectId', async () => {
      const created = await userModel.createNew(validUserData)
      const found = await userModel.findOneById(created.insertedId)
      expect(found).not.toBeNull()
      expect(found.email).toBe(validUserData.email)
    })

    it('should return null for non-existent id', async () => {
      const fakeId = new ObjectId()
      const found = await userModel.findOneById(fakeId)
      expect(found).toBeNull()
    })
  })

  describe('findOneByEmail', () => {
    it('should find user by email', async () => {
      await userModel.createNew(validUserData)
      const found = await userModel.findOneByEmail(validUserData.email)
      expect(found).not.toBeNull()
      expect(found.email).toBe(validUserData.email)
    })

    it('should return null for non-existent email', async () => {
      const found = await userModel.findOneByEmail('nonexistent@example.com')
      expect(found).toBeNull()
    })

    it('should not find user marked as destroyed', async () => {
      const created = await userModel.createNew(validUserData)
      await userModel.update(created.insertedId, { _destroy: true })
      const found = await userModel.findOneByEmail(validUserData.email)
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update displayName successfully', async () => {
      const created = await userModel.createNew(validUserData)
      const updated = await userModel.update(created.insertedId, { displayName: 'Updated Name' })
      expect(updated.displayName).toBe('Updated Name')
    })

    it('should strip protected fields from update', async () => {
      const created = await userModel.createNew(validUserData)
      const updated = await userModel.update(created.insertedId, {
        email: 'hacked@example.com',
        username: 'hacked',
        displayName: 'Hacked'
      })
      expect(updated.email).toBe(validUserData.email)
      expect(updated.username).toBe(validUserData.username)
    })
  })

  describe('countUsersByRole', () => {
    it('should count users by role', async () => {
      await userModel.createNew({ ...validUserData, email: 'worker1@test.com', role: USER_ROLES.WORKER, phone: '0911111111' })
      await userModel.createNew({ ...validUserData, email: 'worker2@test.com', role: USER_ROLES.WORKER, phone: '0922222222' })
      await userModel.createNew({ ...validUserData, email: 'trainer1@test.com', role: USER_ROLES.TRAINER, phone: '0933333333' })
      const count = await userModel.countUsersByRole(USER_ROLES.WORKER)
      expect(count).toBe(2)
    })
  })

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      for (let i = 0; i < 15; i++) {
        await userModel.createNew({ ...validUserData, email: `user${i}@test.com` })
      }
      const result = await userModel.getUsers({}, 0, 10)
      expect(result.users.length).toBe(10)
      expect(result.totalUsers).toBe(15)
    })
  })

  describe('updateUserStatus', () => {
    it('should update user isActive status', async () => {
      const created = await userModel.createNew(validUserData)
      const updated = await userModel.updateUserStatus(created.insertedId, { isActive: false })
      expect(updated.isActive).toBe(false)
    })
  })

  describe('getUserStats', () => {
    it('should return stats per role', async () => {
      await userModel.createNew({ ...validUserData, email: 'w1@test.com', role: USER_ROLES.WORKER, phone: '0911111111', isActive: true })
      await userModel.createNew({ ...validUserData, email: 'w2@test.com', role: USER_ROLES.WORKER, phone: '0922222222', isActive: false })
      const stats = await userModel.getUserStats()
      expect(stats[USER_ROLES.WORKER]).toBeDefined()
      expect(stats[USER_ROLES.WORKER].total).toBe(2)
    })
  })
})

// ============================================================
// userService Tests
// ============================================================
describe('userService', () => {
  const validUserData = {
    email: 'service@example.com',
    password: 'password123',
    username: 'serviceuser',
    displayName: 'Service User',
    phone: '0900000000',
    role: USER_ROLES.WORKER
  }

  // Helper to create a unique user each time
  const makeUser = (prefix) => ({
    ...validUserData,
    email: `${prefix}_${Date.now()}@example.com`,
    phone: `090${Date.now().toString().slice(-7)}`,
    isActive: true,
    emailVerified: true
  })

  describe('createNew', () => {
    it('should create user and return filtered fields', async () => {
      const u = makeUser('create')
      const result = await userService.createNew(u)
      expect(result.email).toBe(u.email)
      expect(result.password).toBeUndefined()
      expect(result.isActive).toBe(false) // New users start inactive
    })

    it('should throw CONFLICT for duplicate email', async () => {
      const u = makeUser('dup')
      await userService.createNew(u)
      try {
        await userService.createNew(u)
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.CONFLICT)
      }
    })
  })

  describe('verifyAccount', () => {
    it('should verify account with correct token', async () => {
      const u = makeUser('verify1')
      await userService.createNew(u)
      // Get the user to find the verifyToken
      const user = await userModel.findOneByEmail(u.email)
      const verified = await userService.verifyAccount({ email: u.email, token: user.verifyToken })
      expect(verified.isActive).toBe(true)
    })

    it('should throw NOT_FOUND for wrong email', async () => {
      try {
        await userService.verifyAccount({ email: 'wrong@example.com', token: 'sometoken' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_FOUND)
      }
    })

    it('should throw NOT_ACCEPTABLE for wrong token', async () => {
      const u = makeUser('verify2')
      await userService.createNew(u)
      try {
        await userService.verifyAccount({ email: u.email, token: 'wrongtoken' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_ACCEPTABLE)
      }
    })

    it('should throw NOT_ACCEPTABLE if already verified', async () => {
      const u = makeUser('verify3')
      await userService.createNew(u)
      const user = await userModel.findOneByEmail(u.email)
      await userService.verifyAccount({ email: u.email, token: user.verifyToken })
      try {
        await userService.verifyAccount({ email: u.email, token: user.verifyToken })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_ACCEPTABLE)
      }
    })
  })

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const u = makeUser('login1')
      const created = await userService.createNew(u)
      // Activate user before login
      await userModel.updateUserStatus(created._id, { isActive: true })
      const result = await userService.login({ email: u.email, password: u.password })
      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
    })

    it('should throw UNAUTHORIZED for wrong password', async () => {
      const u = makeUser('login2')
      const created = await userService.createNew(u)
      // Activate user before login
      await userModel.updateUserStatus(created._id, { isActive: true })
      try {
        await userService.login({ email: u.email, password: 'wrongpassword' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED)
      }
    })

    it('should throw UNAUTHORIZED for non-existent email', async () => {
      try {
        await userService.login({ email: 'nonexistent@example.com', password: 'password123' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED)
      }
    })

    it('should throw FORBIDDEN for inactive user', async () => {
      const u = makeUser('login3')
      await userService.createNew(u)
      const user = await userModel.findOneByEmail(u.email)
      await userModel.updateUserStatus(user._id, { isActive: false })
      try {
        await userService.login({ email: u.email, password: u.password })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
      }
    })
  })

  describe('getMe', () => {
    it('should return current user info', async () => {
      const u = makeUser('me')
      const created = await userService.createNew(u)
      const me = await userService.getMe(created._id)
      expect(me.email).toBe(u.email)
    })

    it('should throw NOT_FOUND for non-existent user', async () => {
      const fakeId = new ObjectId()
      try {
        await userService.getMe(fakeId)
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_FOUND)
      }
    })
  })

  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      const u = makeUser('changepw1')
      const created = await userService.createNew(u)
      const result = await userService.changePassword(created._id, {
        currentPassword: u.password,
        newPassword: 'newpassword456'
      })
      expect(result).toBeDefined()
    })

    it('should throw NOT_FOUND for non-existent user', async () => {
      const fakeId = new ObjectId()
      try {
        await userService.changePassword(fakeId, { currentPassword: 'old', newPassword: 'newpass' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_FOUND)
      }
    })

    it('should throw NOT_ACCEPTABLE for wrong current password', async () => {
      const u = makeUser('changepw2')
      const created = await userService.createNew(u)
      try {
        await userService.changePassword(created._id, { currentPassword: 'wrongpassword', newPassword: 'newpassword456' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.NOT_ACCEPTABLE)
      }
    })

    it('should throw BAD_REQUEST for new password too short', async () => {
      const u = makeUser('changepw3')
      const created = await userService.createNew(u)
      try {
        await userService.changePassword(created._id, { currentPassword: u.password, newPassword: '123' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST)
      }
    })
  })

  describe('getUserStats', () => {
    it('should return user stats', async () => {
      const stats = await userService.getUserStats()
      expect(stats).toBeDefined()
    })
  })

  describe('update', () => {
    it('should update user displayName', async () => {
      const u = makeUser('update1')
      const created = await userService.createNew(u)
      const updated = await userService.update(created._id, { displayName: 'New Display Name' })
      expect(updated.displayName).toBe('New Display Name')
    })
  })

  describe('updateUserStatus', () => {
    it('should deactivate user', async () => {
      const u = makeUser('updatestatus1')
      const created = await userService.createNew(u)
      const updated = await userService.updateUserStatus(created._id, { isActive: false })
      expect(updated.isActive).toBe(false)
    })
  })
})
