import { jest, describe, test, expect, beforeEach } from '@jest/globals'

/**
 * 1. Global in-memory storage for the database mock
 */
const mockUsers = new Map()

/**
 * 2. Mock 'db-local' BEFORE any other imports for ESM.
 */
jest.unstable_mockModule('db-local', () => {
  const mockSchema = {
    create: jest.fn((data) => ({
      save: jest.fn(() => {
        const userWithId = { ...data, _id: 'mock-id-' + Date.now() }
        mockUsers.set(data.username, userWithId)
        return userWithId
      })
    })),
    findOne: jest.fn((query) => {
      return mockUsers.get(query.username) || null
    })
  }

  return {
    default: jest.fn(() => ({
      Schema: jest.fn(() => mockSchema)
    }))
  }
})

/**
 * 3. Mock 'bcrypt'
 */
jest.unstable_mockModule('bcrypt', () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn()
  }
}))

/**
 * 4. Dynamic Imports with correct relative path.
 */
const { UserRepository } = await import('../user-repository.js')
const bcrypt = (await import('bcrypt')).default

describe('UserRepository Unit Tests', () => {
  beforeEach(() => {
    mockUsers.clear()
    jest.clearAllMocks()

    // Default successful bcrypt behaviors
    bcrypt.hash.mockResolvedValue('hashed_password_123')
    bcrypt.compare.mockResolvedValue(true)
  })

  describe('create()', () => {
    test('should register a new user successfully', async () => {
      const userId = await UserRepository.create({
        username: 'validuser',
        password: 'password123' // Length > 6
      })

      expect(userId).toBeDefined()
      expect(mockUsers.has('validuser')).toBe(true)
    })

    test('should fail if username exists', async () => {
      // First creation
      await UserRepository.create({ username: 'existing', password: 'password123' })

      // Second creation with same username
      await expect(
        UserRepository.create({ username: 'existing', password: 'password456' })
      ).rejects.toThrow('Username already exists')
    })

    test('should fail if password is too short', async () => {
      await expect(
        UserRepository.create({ username: 'testuser', password: '123' })
      ).rejects.toThrow('Password must be at least 6 characters long')
    })
  })

  describe('login()', () => {
    beforeEach(async () => {
      // Pre-seed a user for login tests with valid password length
      await UserRepository.create({ username: 'loginuser', password: 'password123' })
    })

    test('should return user without password on success', async () => {
      bcrypt.compare.mockResolvedValueOnce(true)

      const user = await UserRepository.login({
        username: 'loginuser',
        password: 'password123'
      })

      expect(user.username).toBe('loginuser')
      expect(user.password).toBeUndefined()
    })

    test('should fail with wrong password (but valid length)', async () => {
      // Simulate bcrypt finding a mismatch
      bcrypt.compare.mockResolvedValueOnce(false)

      await expect(
        UserRepository.login({
          username: 'loginuser',
          password: 'wrongpassword' // Length > 6 to pass validation
        })
      ).rejects.toThrow('Invalid password')
    })

    test('should fail if password is too short during login', async () => {
      await expect(
        UserRepository.login({ username: 'loginuser', password: '123' })
      ).rejects.toThrow('Password must be at least 6 characters long')

      // Verification: bcrypt.compare should never be called if validation fails first
      expect(bcrypt.compare).not.toHaveBeenCalled()
    })
  })
})
