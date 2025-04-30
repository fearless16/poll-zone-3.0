import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import { initTestEnv } from './setupTestDB.js'
import { castVote } from '../src/Firebase/dbHandler.js'
import { doc, setDoc, getDoc } from 'firebase/firestore'

describe('🔥 Voting Transaction', () => {
  let db, testEnv
  const roomId = 'test-room'
  const userId = 'user-420'
  const displayName = 'Munna Bhai'

  beforeAll(async () => {
    testEnv = await initTestEnv()
    db = testEnv.unauthenticatedContext().firestore()
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('💥 should allow valid vote', async () => {
    const ref = doc(db, 'rooms', roomId)

    await setDoc(ref, {
      poll: {
        isOpen: true,
        voted: [],
        options: [
          { option: 'Opt 1', votes: 0 },
          { option: 'Opt 2', votes: 0 },
        ],
      },
    })

    // 👇 force write flush
    await getDoc(ref)

    await castVote(roomId, 1, userId, displayName, db)

    const snap = await getDoc(ref)
    const poll = snap.data().poll

    expect(poll.options[1].votes).toBe(1)
    expect(poll.voted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: userId, name: displayName }),
      ])
    )
  })

  test('❌ should reject double voting', async () => {
    await expect(
      castVote(roomId, 1, userId, displayName, db) // ✅ db injected here too
    ).rejects.toThrow('Already voted!')
  })
})
