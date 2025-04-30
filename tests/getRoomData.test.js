import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import { initTestEnv } from './setupTestDB.js'
import { getRoomData } from '../src/Firebase/dbHandler.js'
import { doc, setDoc } from 'firebase/firestore'

describe('📦 Get Room Data', () => {
  let db, testEnv
  const roomId = 'fetch-room'

  beforeAll(async () => {
    testEnv = await initTestEnv()
    db = testEnv.unauthenticatedContext().firestore()
    await setDoc(doc(db, 'rooms', roomId), {
      roomName: 'Bakchodi Central',
      host: 'ramu'
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should fetch correct room data', async () => {
    const { response } = await getRoomData(roomId, db)
    expect(response.success).toBe(true)
    expect(response.data.roomName).toBe('Bakchodi Central')
  })
})
