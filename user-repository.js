import DBLocal from 'db-local'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { config } from './config.js'

// Initialize local database with schema
const { Schema } = new DBLocal({ path: './db' })

/**
 * User schema definition
 * Defines the structure of user documents in the database
 */
const User = Schema('User', {
  _id: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true }
})

/**
 * Repository pattern for user-related database operations
 * Handles user creation, authentication, and validation
 */
export class UserRepository {
  /**
   * Creates a new user in the database
   * @param {Object} params - User creation parameters
   * @param {string} params.username - The username (3-30 characters)
   * @param {string} params.password - The plain text password (min 6 characters)
   * @returns {Promise<string>} The generated user ID (UUID)
   * @throws {Error} If validation fails or username already exists
   */
  static async create ({ username, password }) {
    // Validate input parameters
    Validation.username(username)
    Validation.password(password)
    Validation.validateUsername(username)

    // Generate unique ID and hash password
    const id = crypto.randomUUID()
    const hashedPassword = await bcrypt.hash(password, config.saltRounds)

    try {
      // Create and save user to database
      User.create({
        _id: id,
        username,
        password: hashedPassword
      }).save()

      return id
    } catch (error) {
      throw new Error('Error: ', error.message)
    }
  }

  /**
   * Authenticates a user with username and password
   * @param {Object} params - Login credentials
   * @param {string} params.username - The username
   * @param {string} params.password - The plain text password
   * @returns {Promise<Object>} User object without password field
   * @throws {Error} If credentials are invalid
   */
  static async login ({ username, password }) {
    // Validate input parameters
    Validation.username(username)
    Validation.password(password)

    // Find user in database
    const user = User.findOne({ username })
    if (!user) throw new Error('Invalid username or password')

    // Verify password
    await Validation.validatePassword(password, user.password)

    // Remove password from returned object for security
    const { password: _, ...publicUser } = user

    return publicUser
  }
}

/**
 * Validation class for user input and business rules
 * Centralizes all validation logic for users
 */
class Validation {
  /**
   * Validates username format and constraints
   * @param {string} username - The username to validate
   * @throws {Error} If username doesn't meet requirements
   */
  static username (username) {
    if (typeof username !== 'string') throw new Error('Username must be string')
    if (username.length === 0) throw new Error('Username cannot be empty')
    if (username.length < 3) throw new Error('Username must be at least 3 characters long')
    if (username.length > 30) throw new Error('Username must be at most 30 characters long')
  }

  /**
   * Validates password format and constraints
   * @param {string} password - The password to validate
   * @throws {Error} If password doesn't meet requirements
   */
  static password (password) {
    if (typeof password !== 'string') throw new Error('Password must be string')
    if (password.length === 0) throw new Error('Password cannot be empty')
    if (password.length < 6) throw new Error('Password must be at least 6 characters long')
  }

  /**
   * Checks if username already exists in database
   * @param {string} username - The username to check
   * @throws {Error} If username is already taken
   */
  static validateUsername (username) {
    if (User.findOne({ username })) throw new Error('Username already exists')
  }

  /**
   * Validates password against hashed password
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @throws {Error} If password doesn't match
   */
  static async validatePassword (password, hashedPassword) {
    const isPasswordValid = await bcrypt.compare(password, hashedPassword)
    if (!isPasswordValid) throw new Error('Invalid password')
  }
}
