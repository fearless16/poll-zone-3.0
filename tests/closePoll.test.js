import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import { initTestEnv } from './setupTestDB.js'
import { closePoll } from '../src/Firebase/dbHandler.js'
import { doc, setDoc, getDoc } from 'firebase/firestore'

describe('🔒 Close Poll', () => {
  let db, testEnv
  const roomId = 'room-close'

  beforeAll(async () => {
    testEnv = await initTestEnv()
    db = testEnv.unauthenticatedContext().firestore()
    await setDoc(doc(db, 'rooms', roomId), {
      poll: { isOpen: true }
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should close the poll', async () => {
    await closePoll(roomId, db)
    const snap = await getDoc(doc(db, 'rooms', roomId))
    expect(snap.data().poll.isOpen).toBe(false)
  })
})
