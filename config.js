/**
 * Loads and validates environment configuration for the application.
 *
 * @function loadConfig
 * @throws {Error} If required environment variables are missing
 * @returns {Object} Configuration object
 * @returns {number} returns.port - Server port (default: 3000)
 * @returns {number} returns.saltRounds - BCrypt salt rounds (default: 10)
 * @returns {string} returns.jwtSecret - JWT secret key for token signing
 * @returns {boolean} returns.isProduction - Whether app is running in production mode
 */
import dotenv from 'dotenv'

dotenv.config()

function loadConfig () {
  const requiredVars = ['JWT_SECRET']
  const missingVars = requiredVars.filter(key => !process.env[key])

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }

  return {
    port: Number(process.env.PORT) || 3000,
    saltRounds: Number(process.env.SALT_ROUNDS) || 10,
    jwtSecret: process.env.JWT_SECRET,
    isProduction: process.env.NODE_ENV === 'production'
  }
}

export const config = loadConfig()
