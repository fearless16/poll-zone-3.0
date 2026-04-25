import { vi, describe, it, expect, beforeEach } from 'vitest'
import {
  createRoom,
  joinPoll,
  addPoll,
  closePoll,
  castVote,
} from '../src/Firebase/dbHandler'
import { getDoc, addDoc, updateDoc, runTransaction } from 'firebase/firestore'

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
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
    arrayUnion: vi.fn(() => 'arrayUnion'),
    Timestamp: {
      now: () => new Date(),
    },
  }
})

vi.mock('uuid', () => ({
  v4: () => 'host123',
}))

const mockDocSnap = (data = null, exists = true) => ({
  exists: () => exists,
  data: () => data,
})

describe('🔥 dbHandler 100% test suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
  })

  describe('createRoom', () => {
    it('should create room', async () => {
      const roomId = 'room456'
      addDoc.mockResolvedValueOnce({ id: roomId })

      const result = await createRoom('Alice', 'My Room')

      expect(result).toEqual({ response: { success: true, roomId, hostId: 'host123' } })
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should handle addDoc error', async () => {
      const error = new Error('Firebase Error')
      addDoc.mockRejectedValueOnce(error)

      const result = await createRoom('Alice', 'My Room')
      expect(result).toEqual({ error })
    })
  })

  describe('joinPoll', () => {
    it('should join poll successfully', async () => {
      getDoc.mockResolvedValueOnce(
        mockDocSnap({
          participants: [],
          host: 'host123',
        })
      )
      updateDoc.mockResolvedValue(undefined)

      localStorageMock.getItem.mockImplementation((key) => {
        return key === 'id' ? null : null
      })

      const result = await joinPoll('roomId', 'Bob')
      expect(result.response.success).toBe(true)
      expect(result.response.userId).toBe('host123')
      expect(updateDoc).toHaveBeenCalled()
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should detect existing user', async () => {
      localStorageMock.getItem.mockImplementation((key) => (key === 'id' ? 'id123' : null))

      getDoc.mockResolvedValueOnce(
        mockDocSnap({
          participants: [{ id: 'id123' }],
        })
      )

      const result = await joinPoll('roomId', 'Bob')
      expect(result.response.data).toBe('Already a room member')
      expect(result.response.userId).toBe('id123')
    })

    it('should handle room not found', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap(null, false))
      const result = await joinPoll('roomId', 'Bob')
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('Room does not exist')
    })

    it('should handle join error', async () => {
      const error = new Error('Join error')
      getDoc.mockRejectedValueOnce(error)
      const result = await joinPoll('roomId', 'Bob')
      expect(result).toEqual({ error })
    })
  })

  describe('addPoll', () => {
    it('should create a voting poll', async () => {
      updateDoc.mockResolvedValueOnce()
      const result = await addPoll('room1', [{ option: 'A', votes: 0 }], 'Q?')
      expect(result.response.success).toBe(true)
    })

    it('should create estimation poll', async () => {
      updateDoc.mockResolvedValueOnce()
      const result = await addPoll('room1', [{ option: '1', votes: 0 }])
      expect(result.response.success).toBe(true)
    })

    it('should handle poll creation error', async () => {
      const error = new Error('Poll error')
      updateDoc.mockRejectedValueOnce(error)
      const result = await addPoll('room1', [])
      expect(result).toEqual({ error })
    })
  })

  describe('closePoll', () => {
    it('should close poll if open', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap({ poll: { isOpen: true } }))
      updateDoc.mockResolvedValueOnce()
      const result = await closePoll('room1')
      expect(result.response.success).toBe(true)
      expect(updateDoc).toHaveBeenCalled()
    })

    it('should return success if poll already closed', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap({ poll: { isOpen: false } }))
      const result = await closePoll('room1')
      expect(result.response.success).toBe(true)
      expect(updateDoc).not.toHaveBeenCalled()
    })

    it('should return error if room not found', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap(null, false))
      const result = await closePoll('room1')
      expect(result.error.message).toBe('Room does not exist')
    })

    it('should return error if poll is malformed', async () => {
      getDoc.mockResolvedValueOnce(mockDocSnap({ poll: null }, true))
      const result = await closePoll('room1')
      expect(result.error.message).toBe('Poll is missing or malformed')
    })

    it('should return error if roomId is missing', async () => {
      const result = await closePoll('')
      expect(result.error.message).toBe('Room ID is required')
    })
  })

  describe('castVote', () => {
    it('should cast vote', async () => {
      const update = vi.fn()
      runTransaction.mockImplementationOnce(async (_, cb) => {
        return cb({
          get: vi.fn().mockResolvedValueOnce(
            mockDocSnap({
              poll: {
                isOpen: true,
                voted: [],
                options: [{ option: 'A', votes: 0 }],
              },
            })
          ),
          update,
        })
      })

      const result = await castVote('room1', 0, 'u1', 'Alice')
      expect(result.response.success).toBe(true)
      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'poll.options': [{ option: 'A', votes: 1 }],
          'poll.voted': [{ id: 'u1', name: 'Alice' }],
          'poll.lastUpdated': expect.any(Date),
        })
      )
    })

    it('should return error if room missing', async () => {
      runTransaction.mockImplementationOnce(async (_, cb) => {
        return cb({
          get: vi.fn().mockResolvedValueOnce(mockDocSnap(null, false)),
          update: vi.fn(),
        })
      })
      const result = await castVote('room1', 0, 'u1', 'Alice')
      expect(result.error.message).toBe('Room does not exist')
    })

    it('should return error if poll closed', async () => {
      runTransaction.mockImplementationOnce(async (_, cb) => {
        return cb({
          get: vi.fn().mockResolvedValueOnce(
            mockDocSnap({
              poll: { isOpen: false },
            })
          ),
          update: vi.fn(),
        })
      })
      const result = await castVote('room1', 0, 'u1', 'Alice')
      expect(result.error.message).toBe('Poll is closed')
    })

    it('should return error if user already voted', async () => {
      runTransaction.mockImplementationOnce(async (_, cb) => {
        return cb({
          get: vi.fn().mockResolvedValueOnce(
            mockDocSnap({
              poll: {
                isOpen: true,
                voted: [{ id: 'u1' }],
                options: [{ option: 'A', votes: 0 }],
              },
            })
          ),
          update: vi.fn(),
        })
      })
      const result = await castVote('room1', 0, 'u1', 'Alice')
      expect(result.error.message).toBe('Already voted')
    })
  })
})
