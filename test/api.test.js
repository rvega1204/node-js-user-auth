import { jest, describe, test, expect, beforeEach } from '@jest/globals'

/**
 * 1. Definir almacén de datos mock y variable para capturar la app.
 */
const mockUsers = []
let capturedApp

/**
 * 2. MOCK DE EXPRESS (ESM)
 * Debe hacerse con unstable_mockModule para que funcione en ESM.
 * Secuestramos la instancia para Supertest y anulamos el listen real.
 */
jest.unstable_mockModule('express', () => {
  const actualExpress = jest.requireActual('express')
  const mockExpress = () => {
    const app = actualExpress()
    capturedApp = app // Aquí capturamos la app de index.js
    app.listen = (port, cb) => { if (cb) cb(); return { close: (c) => c && c() } }
    return app
  }
  Object.assign(mockExpress, actualExpress)
  return { default: mockExpress }
})

/**
 * 3. MOCK DEL REPOSITORIO (ESM)
 */
jest.unstable_mockModule('../user-repository.js', () => ({
  UserRepository: {
    create: jest.fn(async ({ username, password }) => {
      if (mockUsers.some(u => u.username === username)) throw new Error('Username already exists')
      const id = '123'
      mockUsers.push({ _id: id, username, password })
      return id
    }),
    login: jest.fn(async ({ username, password }) => {
      const user = mockUsers.find(u => u.username === username && u.password === password)
      if (!user) throw new Error('Invalid credentials')
      return user
    })
  }
}))

// 4. IMPORTACIÓN DINÁMICA DE DEPENDENCIAS
// En ESM, Supertest e index.js deben cargarse DESPUÉS de definir los mocks.
const request = (await import('supertest')).default
await import('../index.js')

describe('API Auth Tests', () => {
  beforeEach(() => {
    mockUsers.length = 0
  })

  test('POST /register - should work', async () => {
    const res = await request(capturedApp)
      .post('/register')
      .send({ username: 'test', password: '123' })
      .expect(201)

    expect(res.body).toHaveProperty('userId')
  })

  test('POST /login - should work', async () => {
    mockUsers.push({ _id: '1', username: 'user', password: '123' })

    const res = await request(capturedApp)
      .post('/login')
      .send({ username: 'user', password: '123' })
      .expect(200)

    expect(res.body).toHaveProperty('token')
  })

  test('POST /logout - should work', async () => {
    const res = await request(capturedApp)
      .post('/logout')
      .expect(200)

    expect(res.headers['set-cookie'][0]).toMatch(/access_token=;/)
  })
})
