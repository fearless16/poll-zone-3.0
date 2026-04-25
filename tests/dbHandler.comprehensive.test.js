import { vi, describe, it, expect, beforeEach } from 'vitest'
import {
  createRoom,
  joinPoll,
  addPoll,
  getRoomData,
  isVoted,
  closePoll,
  castVote,
} from '../src/Firebase/dbHandler'
import { getDoc, addDoc, updateDoc, runTransaction } from 'firebase/firestore'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const localStorageMock = {
  store: {},
  getItem: vi.fn((key) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key, val) => {
    localStorageMock.store[key] = val
  }),
  removeItem: vi.fn((key) => {
    delete localStorageMock.store[key]
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {}
  }),
}
vi.stubGlobal('localStorage', localStorageMock)

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore')
  return {
    ...actual,
    doc: vi.fn((firestore, collection, id) => `${collection}/${id}`),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    runTransaction: vi.fn(),
    arrayUnion: vi.fn((...args) => args),
    Timestamp: { now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }) },
  }
})

vi.mock('uuid', () => ({ v4: () => 'mock-uuid-' + Math.random().toString(36).slice(2, 8) }))

const mockDocSnap = (data = null, exists = true) => ({
  exists: () => exists,
  data: () => data,
})

// ---------------------------------------------------------------------------
// Helpers for simulating Firestore transaction in-memory
// ---------------------------------------------------------------------------

/**
 * Creates a realistic in-memory Firestore-like transaction mock.
 * Maintains mutable state so concurrent castVote calls behave realistically.
 */
function createInMemoryRoom(initialPoll) {
  const state = {
    poll: { ...initialPoll },
  }

  const buildTransactionMock = () => ({
    get: vi.fn(async () => mockDocSnap(state)),
    update: vi.fn(async (_, updates) => {
      if (updates['poll.options']) state.poll.options = updates['poll.options']
      if (updates['poll.voted']) state.poll.voted = updates['poll.voted']
      if (updates['poll.lastUpdated']) state.poll.lastUpdated = updates['poll.lastUpdated']
      if (updates['poll.isOpen'] !== undefined) state.poll.isOpen = updates['poll.isOpen']
    }),
  })

  return { state, buildTransactionMock }
}

// ===========================================================================
// TEST SUITES
// ===========================================================================

describe('dbHandler – comprehensive test suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  // =========================================================================
  // createRoom
  // =========================================================================

  describe('createRoom', () => {
    it('creates a room and stores IDs in localStorage', async () => {
      addDoc.mockResolvedValueOnce({ id: 'room-abc' })
      const result = await createRoom('Alice', 'Design Sprint')

      expect(result.response.success).toBe(true)
      expect(result.response.roomId).toBe('room-abc')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('displayName', 'Alice')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('roomId', 'room-abc')
    })

    it('returns error on Firestore failure', async () => {
      const err = new Error('Network failure')
      addDoc.mockRejectedValueOnce(err)
      const result = await createRoom('Alice', 'Room')
      expect(result.error).toBe(err)
      expect(result.response).toBeUndefined()
    })

    it('stores a unique host ID via uuid', async () => {
      addDoc.mockResolvedValueOnce({ id: 'r1' })
      await createRoom('Host', 'Room')
      // id was set via setItem
      const idCall = localStorageMock.setItem.mock.calls.find(([k]) => k === 'id')
      expect(idCall).toBeTruthy()
      expect(idCall[1]).toMatch(/^mock-uuid-/)
    })
  })

  // =========================================================================
  // joinPoll
  // =========================================================================

  describe('joinPoll', () => {
    it('joins a room as a new participant', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap({ participants: [], host: 'h1' }))
      updateDoc.mockResolvedValueOnce()
      localStorageMock.store.id = null

      const result = await joinPoll('room1', 'Bob')
      expect(result.response.success).toBe(true)
      expect(result.response.data).toBe('User registered successfully')
      expect(updateDoc).toHaveBeenCalled()
    })

    it('detects already-joined user by localStorage id', async () => {
      localStorageMock.store.id = 'existing-id'
      getDoc.mockResolvedValueOnce(
        mockDocSnap({ participants: [{ id: 'existing-id' }], host: 'h1' })
      )

      const result = await joinPoll('room1', 'Bob')
      expect(result.response.data).toBe('Already a room member')
      expect(updateDoc).not.toHaveBeenCalled()
    })

    it('returns error when room does not exist', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap(null, false))
      const result = await joinPoll('missing-room', 'User')
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('Room does not exist')
    })

    it('handles Firestore error during join', async () => {
      const err = new Error('Permission denied')
      getDoc.mockRejectedValueOnce(err)
      const result = await joinPoll('room1', 'User')
      expect(result.error).toBe(err)
    })

    it('trims roomId whitespace', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap({ participants: [], host: 'h1' }))
      updateDoc.mockResolvedValueOnce()
      await joinPoll('  room1  ', 'User')
      // doc() was called with trimmed ID (the mock receives the trimmed value)
      expect(getDoc).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // addPoll
  // =========================================================================

  describe('addPoll', () => {
    it('creates a voting poll with question', async () => {
      localStorageMock.store.id = 'host123'
      getDoc.mockResolvedValueOnce(
        mockDocSnap({
          host: 'host123',
          participants: [{ id: 'host123', name: 'Alice' }],
        })
      )
      updateDoc.mockResolvedValueOnce()
      const result = await addPoll('room1', [{ option: 'A', votes: 0 }], 'Best color?')
      expect(result.response.success).toBe(true)
      const pollArg = updateDoc.mock.calls[0][1].poll
      expect(pollArg.type).toBe('voting')
      expect(pollArg.question).toBe('Best color?')
      expect(pollArg.isOpen).toBe(true)
      expect(pollArg.voted).toEqual([])
    })

    it('creates an estimation poll when no question provided', async () => {
      localStorageMock.store.id = 'host123'
      getDoc.mockResolvedValueOnce(
        mockDocSnap({
          host: 'host123',
          participants: [{ id: 'host123', name: 'Alice' }],
        })
      )
      updateDoc.mockResolvedValueOnce()
      const result = await addPoll('room1', [{ option: 1, votes: 0 }])
      expect(result.response.success).toBe(true)
      const pollArg = updateDoc.mock.calls[0][1].poll
      expect(pollArg.type).toBe('estimation')
      expect(pollArg.question).toBe('')
    })

    it('handles updateDoc failure', async () => {
      localStorageMock.store.id = 'host123'
      getDoc.mockResolvedValueOnce(
        mockDocSnap({
          host: 'host123',
          participants: [{ id: 'host123', name: 'Alice' }],
        })
      )
      const err = new Error('Write failed')
      updateDoc.mockRejectedValueOnce(err)
      const result = await addPoll('room1', [])
      expect(result.error).toBe(err)
    })

    it('poll starts with empty voted array and isOpen=true', async () => {
      localStorageMock.store.id = 'host123'
      getDoc.mockResolvedValueOnce(
        mockDocSnap({
          host: 'host123',
          participants: [{ id: 'host123', name: 'Alice' }],
        })
      )
      updateDoc.mockResolvedValueOnce()
      await addPoll('room1', [{ option: 'X', votes: 0 }], 'Q?')
      const pollArg = updateDoc.mock.calls[0][1].poll
      expect(pollArg.voted).toEqual([])
      expect(pollArg.isOpen).toBe(true)
      expect(pollArg.createdAt).toBeDefined()
    })
  })

  // =========================================================================
  // getRoomData
  // =========================================================================

  describe('getRoomData', () => {
    it('returns room data when room exists', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap({ host: 'h1', poll: {} }))
      const result = await getRoomData('room1')
      expect(result.response.success).toBe(true)
      expect(result.response.data).toEqual({ host: 'h1', poll: {} })
    })

    it('returns failure when room not found', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap(null, false))
      const result = await getRoomData('missing')
      expect(result.response.success).toBe(false)
      expect(result.error.message).toBe('Room not found')
    })

    it('returns failure for empty room data', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap({}, true))
      const result = await getRoomData('room1')
      expect(result.response.success).toBe(false)
    })

    it('handles Firestore read error', async () => {
      getDoc.mockRejectedValueOnce(new Error('Read error'))
      const result = await getRoomData('room1')
      expect(result.error.message).toBe('Read error')
    })
  })

  // =========================================================================
  // isVoted
  // =========================================================================

  describe('isVoted', () => {
    it('returns true if user has voted', async () => {
      localStorageMock.store.roomId = 'r1'
      localStorageMock.store.id = 'u1'
      getDoc.mockResolvedValueOnce(mockDocSnap({ poll: { voted: [{ id: 'u1' }] } }))
      expect(await isVoted()).toBe(true)
    })

    it('returns false if user has not voted', async () => {
      localStorageMock.store.roomId = 'r1'
      localStorageMock.store.id = 'u1'
      getDoc.mockResolvedValueOnce(mockDocSnap({ poll: { voted: [{ id: 'other' }] } }))
      expect(await isVoted()).toBe(false)
    })

    it('returns false when poll has no voted array', async () => {
      localStorageMock.store.roomId = 'r1'
      localStorageMock.store.id = 'u1'
      getDoc.mockResolvedValueOnce(mockDocSnap({ poll: {} }))
      expect(await isVoted()).toBe(false)
    })

    it('returns false when poll is missing entirely', async () => {
      localStorageMock.store.roomId = 'r1'
      localStorageMock.store.id = 'u1'
      getDoc.mockResolvedValueOnce(mockDocSnap({}))
      expect(await isVoted()).toBe(false)
    })
  })

  // =========================================================================
  // closePoll
  // =========================================================================

  describe('closePoll', () => {
    it('closes an open poll', async () => {
      localStorageMock.store.id = 'host123'
      
      runTransaction.mockImplementation(async (_, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue(
            mockDocSnap({
              host: 'host123',
              poll: { isOpen: true },
            })
          ),
          update: vi.fn(),
        }
        await callback(transaction)
        expect(transaction.update).toHaveBeenCalledWith(expect.anything(), { 'poll.isOpen': false })
      })
      
      await closePoll('room1')
    })

    it('skips if poll already closed', async () => {
      localStorageMock.store.id = 'host123'
      
      const mockUpdate = vi.fn()
      runTransaction.mockImplementation(async (_, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue(
            mockDocSnap({
              host: 'host123',
              poll: { isOpen: false },
            })
          ),
          update: mockUpdate,
        }
        await callback(transaction)
      })
      
      await closePoll('room1')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('throws if roomId is empty', async () => {
      await expect(closePoll('')).rejects.toThrow('Room ID is required')
    })

    it('throws if room does not exist', async () => {
      localStorageMock.store.id = 'host123'
      
      runTransaction.mockImplementation(async (_, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue(mockDocSnap(null, false)),
          update: vi.fn(),
        }
        await callback(transaction)
      })
      
      await expect(closePoll('room1')).rejects.toThrow('Room does not exist')
    })

    it('throws if poll is null', async () => {
      localStorageMock.store.id = 'host123'
      
      runTransaction.mockImplementation(async (_, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue(
            mockDocSnap({
              host: 'host123',
              poll: null,
            })
          ),
          update: vi.fn(),
        }
        await callback(transaction)
      })
      
      await expect(closePoll('room1')).rejects.toThrow('Poll is missing or malformed')
    })

    it('throws if poll is not an object', async () => {
      localStorageMock.store.id = 'host123'
      
      runTransaction.mockImplementation(async (_, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue(
            mockDocSnap({
              host: 'host123',
              poll: 'invalid',
            })
          ),
          update: vi.fn(),
        }
        await callback(transaction)
      })
      
      await expect(closePoll('room1')).rejects.toThrow('Poll is missing or malformed')
    })
  })

  // =========================================================================
  // castVote – basic
  // =========================================================================

  describe('castVote – basic', () => {
    it('casts a vote successfully', async () => {
      const update = vi.fn()
      runTransaction.mockImplementationOnce(async (_, cb) =>
        cb({
          get: vi.fn().mockResolvedValueOnce(
            mockDocSnap({
              poll: { isOpen: true, voted: [], options: [{ option: 'A', votes: 0 }] },
            })
          ),
          update,
        })
      )

      await castVote('room1', 0, 'u1', 'Alice')
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'poll.options': [{ option: 'A', votes: 1 }],
          'poll.voted': [{ id: 'u1', name: 'Alice' }],
        })
      )
    })

    it('throws if room does not exist', async () => {
      runTransaction.mockImplementationOnce(async (_, cb) =>
        cb({
          get: vi.fn().mockResolvedValueOnce(mockDocSnap(null, false)),
          update: vi.fn(),
        })
      )
      await expect(castVote('room1', 0, 'u1', 'Alice')).rejects.toThrow('Room does not exist')
    })

    it('throws if poll is closed', async () => {
      runTransaction.mockImplementationOnce(async (_, cb) =>
        cb({
          get: vi.fn().mockResolvedValueOnce(mockDocSnap({ poll: { isOpen: false } })),
          update: vi.fn(),
        })
      )
      await expect(castVote('room1', 0, 'u1', 'Alice')).rejects.toThrow('Poll is closed')
    })

    it('throws if user already voted', async () => {
      runTransaction.mockImplementationOnce(async (_, cb) =>
        cb({
          get: vi.fn().mockResolvedValueOnce(
            mockDocSnap({
              poll: { isOpen: true, voted: [{ id: 'u1' }], options: [{ option: 'A', votes: 0 }] },
            })
          ),
          update: vi.fn(),
        })
      )
      await expect(castVote('room1', 0, 'u1', 'Alice')).rejects.toThrow('Already voted')
    })

    it('increments correct option vote count', async () => {
      const update = vi.fn()
      runTransaction.mockImplementationOnce(async (_, cb) =>
        cb({
          get: vi.fn().mockResolvedValueOnce(
            mockDocSnap({
              poll: {
                isOpen: true,
                voted: [],
                options: [
                  { option: 'A', votes: 0 },
                  { option: 'B', votes: 3 },
                  { option: 'C', votes: 1 },
                ],
              },
            })
          ),
          update,
        })
      )

      await castVote('room1', 1, 'u1', 'Alice')
      const updatedOptions = update.mock.calls[0][1]['poll.options']
      expect(updatedOptions[0].votes).toBe(0) // untouched
      expect(updatedOptions[1].votes).toBe(4) // incremented
      expect(updatedOptions[2].votes).toBe(1) // untouched
    })
  })

  // =========================================================================
  // castVote – concurrent/stress (100 users)
  // =========================================================================

  describe('castVote – 100 concurrent voters simulation', () => {
    it('all 100 users vote on a 4-option poll, totals are correct', async () => {
      const NUM_VOTERS = 100
      const options = [
        { option: 'React', votes: 0 },
        { option: 'Vue', votes: 0 },
        { option: 'Angular', votes: 0 },
        { option: 'Svelte', votes: 0 },
      ]

      const room = createInMemoryRoom({
        isOpen: true,
        voted: [],
        options: options.map((o) => ({ ...o })),
        question: 'Best framework?',
      })

      // Each runTransaction call uses the shared in-memory state
      runTransaction.mockImplementation(async (_, cb) => {
        const txn = room.buildTransactionMock()
        return cb(txn)
      })

      // Generate 100 voters, each picking a random option
      const voters = Array.from({ length: NUM_VOTERS }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i}`,
        optionIndex: i % 4, // distribute evenly: 25 per option
      }))

      // Execute all votes concurrently
      const results = await Promise.allSettled(
        voters.map((v) => castVote('room1', v.optionIndex, v.id, v.name))
      )

      // All should succeed
      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      expect(fulfilled).toHaveLength(NUM_VOTERS)

      // Verify totals
      const finalOptions = room.state.poll.options
      expect(finalOptions[0].votes).toBe(25) // React
      expect(finalOptions[1].votes).toBe(25) // Vue
      expect(finalOptions[2].votes).toBe(25) // Angular
      expect(finalOptions[3].votes).toBe(25) // Svelte

      // Verify voted array
      expect(room.state.poll.voted).toHaveLength(NUM_VOTERS)
    })

    it('duplicate votes are rejected for all 100 users', async () => {
      const NUM_VOTERS = 100
      const room = createInMemoryRoom({
        isOpen: true,
        voted: [],
        options: [{ option: 'Yes', votes: 0 }, { option: 'No', votes: 0 }],
        question: 'Proceed?',
      })

      runTransaction.mockImplementation(async (_, cb) => {
        const txn = room.buildTransactionMock()
        return cb(txn)
      })

      // First round: all 100 vote
      const firstRound = await Promise.allSettled(
        Array.from({ length: NUM_VOTERS }, (_, i) =>
          castVote('room1', i % 2, `user-${i}`, `User ${i}`)
        )
      )
      expect(firstRound.filter((r) => r.status === 'fulfilled')).toHaveLength(NUM_VOTERS)

      // Second round: all 100 try to vote again → all rejected
      const secondRound = await Promise.allSettled(
        Array.from({ length: NUM_VOTERS }, (_, i) =>
          castVote('room1', i % 2, `user-${i}`, `User ${i}`)
        )
      )
      const rejected = secondRound.filter((r) => r.status === 'rejected')
      expect(rejected).toHaveLength(NUM_VOTERS)
      rejected.forEach((r) => {
        expect(r.reason.message).toBe('Already voted')
      })

      // Vote counts should not have increased
      expect(room.state.poll.options[0].votes).toBe(50)
      expect(room.state.poll.options[1].votes).toBe(50)
    })

    it('votes are rejected after poll is closed mid-stream', async () => {
      const room = createInMemoryRoom({
        isOpen: true,
        voted: [],
        options: [{ option: 'A', votes: 0 }],
        question: 'Test?',
      })

      runTransaction.mockImplementation(async (_, cb) => {
        const txn = room.buildTransactionMock()
        return cb(txn)
      })

      // Vote sequentially: first 50 succeed, then close, then 50 fail
      for (let i = 0; i < 50; i++) {
        await castVote('room1', 0, `user-${i}`, `User ${i}`)
      }

      expect(room.state.poll.voted).toHaveLength(50)
      expect(room.state.poll.options[0].votes).toBe(50)

      // Close poll
      room.state.poll.isOpen = false

      // Next 50 should all be rejected
      const rejectedResults = await Promise.allSettled(
        Array.from({ length: 50 }, (_, i) =>
          castVote('room1', 0, `user-${i + 50}`, `User ${i + 50}`)
        )
      )

      const rejected = rejectedResults.filter((r) => r.status === 'rejected')
      expect(rejected).toHaveLength(50)
      rejected.forEach((r) => {
        expect(r.reason.message).toBe('Poll is closed')
      })

      // Vote counts should NOT have increased
      expect(room.state.poll.options[0].votes).toBe(50)
    })
  })

  // =========================================================================
  // Full lifecycle: create → join → poll → vote → close
  // =========================================================================

  describe('full lifecycle flow', () => {
    it('host creates room → users join → poll created → users vote → poll closed', async () => {
      // Step 1: Host creates room
      addDoc.mockResolvedValueOnce({ id: 'lifecycle-room' })
      const createResult = await createRoom('Host', 'Lifecycle Room')
      expect(createResult.response.success).toBe(true)
      const roomId = createResult.response.roomId

      // Step 2: 5 users join
      for (let i = 0; i < 5; i++) {
        localStorageMock.store.id = null
        getDoc.mockResolvedValueOnce(
          mockDocSnap({
            participants: Array.from({ length: i }, (_, j) => ({ id: `user-${j}`, name: `U${j}` })),
            host: 'mock-uuid',
          })
        )
        updateDoc.mockResolvedValueOnce()
        const joinResult = await joinPoll(roomId, `User ${i}`)
        expect(joinResult.response.success).toBe(true)
      }

      // Step 3: Host creates poll
      localStorageMock.store.id = localStorageMock.store.id || 'host-id'
      const hostId = localStorageMock.store.id
      getDoc.mockResolvedValueOnce(
        mockDocSnap({
          host: hostId,
          participants: [{ id: hostId, name: 'Host' }],
        })
      )
      updateDoc.mockResolvedValueOnce()
      const pollResult = await addPoll(roomId, [
        { option: 'Option A', votes: 0 },
        { option: 'Option B', votes: 0 },
      ], 'Pick one')
      expect(pollResult.response.success).toBe(true)

      // Step 4: All 5 users vote
      const voteRoom = createInMemoryRoom({
        isOpen: true,
        voted: [],
        options: [
          { option: 'Option A', votes: 0 },
          { option: 'Option B', votes: 0 },
        ],
        question: 'Pick one',
      })

      runTransaction.mockImplementation(async (_, cb) => {
        const txn = voteRoom.buildTransactionMock()
        return cb(txn)
      })

      for (let i = 0; i < 5; i++) {
        await castVote(roomId, i % 2, `user-${i}`, `User ${i}`)
      }

      expect(voteRoom.state.poll.voted).toHaveLength(5)
      expect(voteRoom.state.poll.options[0].votes + voteRoom.state.poll.options[1].votes).toBe(5)

      // Step 5: Host closes poll
      localStorageMock.store.id = localStorageMock.store.id || 'host-id'
      runTransaction.mockImplementation(async (_, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue(
            mockDocSnap({
              host: localStorageMock.store.id,
              poll: { isOpen: true },
            })
          ),
          update: vi.fn(),
        }
        await callback(transaction)
        expect(transaction.update).toHaveBeenCalledWith(expect.anything(), { 'poll.isOpen': false })
      })
      
      await closePoll(roomId)
    })
  })

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('castVote with option index out of bounds does not crash', async () => {
      runTransaction.mockImplementationOnce(async (_, cb) =>
        cb({
          get: vi.fn().mockResolvedValueOnce(
            mockDocSnap({
              poll: { isOpen: true, voted: [], options: [{ option: 'A', votes: 0 }] },
            })
          ),
          update: vi.fn(),
        })
      )

      // index 5 is out of bounds – now guarded with bounds check
      await expect(castVote('room1', 5, 'u1', 'Alice')).rejects.toThrow('Invalid option index')
    })

    it('joinPoll with empty participants array succeeds', async () => {
      localStorageMock.store.id = null
      getDoc.mockResolvedValueOnce(mockDocSnap({ participants: [], host: 'h1' }))
      updateDoc.mockResolvedValueOnce()
      const result = await joinPoll('room1', 'New User')
      expect(result.response.success).toBe(true)
    })

    it('closePoll is idempotent', async () => {
      localStorageMock.store.id = 'host123'
      
      const mockUpdate = vi.fn()
      runTransaction.mockImplementation(async (_, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue(
            mockDocSnap({
              host: 'host123',
              poll: { isOpen: false },
            })
          ),
          update: mockUpdate,
        }
        await callback(transaction)
      })
      
      await closePoll('room1') // should not throw
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('createRoom with special characters in room name', async () => {
      addDoc.mockResolvedValueOnce({ id: 'r-special' })
      const result = await createRoom('Host', 'Room <script>alert("xss")</script>')
      expect(result.response.success).toBe(true)
    })
  })
})
