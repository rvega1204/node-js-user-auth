export default {
  testEnvironment: 'node',
  transform: {},

  collectCoverageFrom: [
    '*.js',
    '!jest.config.js',
    '!coverage/**'
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js'
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/db/'
  ],

  verbose: true,
  clearMocks: true,
  restoreMocks: true
}
