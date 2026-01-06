/**
 * Express.js User Authentication Server
 *
 * A Node.js server implementing user authentication with JWT tokens and secure cookie handling.
 *
 * @requires express - Web application framework
 * @requires jsonwebtoken - JWT token generation and verification
 * @requires cookie-parser - Cookie parsing middleware
 * @requires ./config.js - Application configuration
 * @requires ./user-repository.js - User data access layer
 *
 * @typedef {Object} User
 * @property {string} _id - User unique identifier
 * @property {string} username - User's username
 *
 * @typedef {Object} AuthToken
 * @property {string} id - User ID
 * @property {string} username - Username
 * @property {number} iat - Issued at timestamp
 * @property {number} exp - Expiration timestamp
 *
 * @middleware authenticateToken - Verifies JWT token from cookies and attaches user to request
 * @middleware sessionMiddleware - Initializes session with user data from token
 *
 * @route POST /login - Authenticates user and returns JWT token
 * @param {Object} req.body
 * @param {string} req.body.username - User's username
 * @param {string} req.body.password - User's password
 * @returns {Object} user - Authenticated user object
 * @returns {string} token - JWT access token
 *
 * @route POST /register - Creates new user account
 * @param {Object} req.body
 * @param {string} req.body.username - Desired username
 * @param {string} req.body.password - User's password
 * @returns {Object} userId - ID of created user
 *
 * @route POST /logout - Clears authentication cookie
 * @returns {Object} message - Logout confirmation message
 *
 * @route GET / - Renders home page with optional user data
 * @returns {html} Rendered index view
 *
 * @route GET /protected - Protected route requiring valid JWT token
 * @requires authenticateToken middleware
 * @returns {html} Rendered protected view with user data
 */
import express from 'express'
import { config } from './config.js'
import { UserRepository } from './user-repository.js'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'

const app = express()

app.use(express.json())
app.use(cookieParser())
app.set('view engine', 'ejs')

const authenticateToken = (req, res, next) => {
  const token = req.cookies.access_token

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const user = jwt.verify(token, config.jwtSecret)
    req.user = user
    next()
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

app.use((req, res, next) => {
  const token = req.cookies.access_token
  req.session = { user: null }

  try {
    const data = jwt.verify(token, config.jwtSecret)
    req.session.user = data
  } catch (error) {

  }

  next()
})

app.get('/', (req, res) => {
  const { user } = req.session
  res.render('index', { user })
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  try {
    const user = await UserRepository.login({ username, password })
    const token = jwt.sign(
      { id: user._id, username: user.username },
      config.jwtSecret,
      { expiresIn: '1h' }
    )

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
      maxAge: 3600000
    }).send({ user, token })
  } catch (error) {
    res.status(401).json({ error: error.message })
  }
})

app.post('/register', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  try {
    const id = await UserRepository.create({ username, password })
    res.status(201).json({ userId: id })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/logout', (req, res) => {
  res.clearCookie('access_token')
    .json({ message: 'Logout successful' })
})

app.get('/protected', authenticateToken, (req, res) => {
  res.render('protected', { user: req.user })
})

app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`)
})
