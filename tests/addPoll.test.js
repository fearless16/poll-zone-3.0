import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import { initTestEnv } from './setupTestDB.js'
import { addPoll } from '../src/Firebase/dbHandler.js'
import { doc, getDoc } from 'firebase/firestore'

describe('📥 Add Poll', () => {
  let db, testEnv
  const roomId = 'poll-room'

  beforeAll(async () => {
    testEnv = await initTestEnv()
    db = testEnv.unauthenticatedContext().firestore()
    await db.doc('rooms/' + roomId).set({ poll: {} })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should create a poll with correct options', async () => {
    await addPoll(
      roomId,
      [
        { option: 'Yes', votes: 0 },
        { option: 'No', votes: 0 },
      ],
      'Are you dumb?',
      db
    )

    const snap = await getDoc(doc(db, 'rooms', roomId))
    const poll = snap.data().poll

    expect(poll.question).toBe('Are you dumb?')
    expect(poll.options.length).toBe(2)
    expect(poll.isOpen).toBe(true)
  })
})
