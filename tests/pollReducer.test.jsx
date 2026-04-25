import { describe, it, expect, beforeEach } from 'vitest'
import { pollReducer } from '../src/Context/pollReducer'
import { REDUCER_ACTIONS, Messages } from '../src/Utils/constants'

const mockUserId = 'user-123'
const basePoll = {
  isOpen: true,
  voted: [{ id: 'user-321' }],
  options: [],
  question: 'Kya haal hai?',
  lastUpdated: 9999,
}

const baseState = {
  loading: false,
  currentPollData: { lastUpdated: 9998 },
  roomData: {},
  error: '',
  isHost: false,
  isOpen: false,
  voted: false,
  isPoll: false,
}

describe('pollReducer', () => {
  let payload

  beforeEach(() => {
    payload = {
      poll: { ...basePoll, lastUpdated: 9999 },
      host: mockUserId,
      userId: mockUserId,
    }
  })

  it('should return same state if payload is older than current state', () => {
    const olderPayload = { ...payload, poll: { ...basePoll, lastUpdated: 9000 } }
    const result = pollReducer(baseState, { type: REDUCER_ACTIONS.SUCCESS, payload: olderPayload })
    expect(result).toEqual(baseState)
  })

  it('should handle SUCCESS with fresh poll data', () => {
    const result = pollReducer(baseState, { type: REDUCER_ACTIONS.SUCCESS, payload })
    expect(result.loading).toBe(false)
    expect(result.currentPollData).toEqual(payload.poll)
    expect(result.roomData).toEqual(payload)
    expect(result.isHost).toBe(true)
    expect(result.voted).toBe(false)
    expect(result.isPoll).toBe(true)
    expect(result.isOpen).toBe(true)
  })

  it('should handle SUCCESS when user already voted', () => {
    payload.poll.voted.push({ id: mockUserId })
    const result = pollReducer(baseState, { type: REDUCER_ACTIONS.SUCCESS, payload })
    expect(result.voted).toBe(true)
  })

  it('should handle OPEN action', () => {
    const result = pollReducer(baseState, { type: REDUCER_ACTIONS.OPEN })
    expect(result.isOpen).toBe(true)
  })

  it('should handle LOADING action', () => {
    const result = pollReducer(baseState, { type: REDUCER_ACTIONS.LOADING })
    expect(result.loading).toBe(true)
  })

  it('should handle UNSET_LOADING action', () => {
    const result = pollReducer(
      { ...baseState, loading: true },
      { type: REDUCER_ACTIONS.UNSET_LOADING }
    )
    expect(result.loading).toBe(false)
  })

  it('should handle VOTED action (optimistic update)', () => {
    const result = pollReducer(
      { ...baseState, loading: true, voted: false },
      { type: REDUCER_ACTIONS.VOTED }
    )
    expect(result.loading).toBe(false)
    expect(result.voted).toBe(true)
  })

  it('should handle FAILURE action', () => {
    const result = pollReducer(baseState, { type: REDUCER_ACTIONS.FAILURE })
    expect(result.loading).toBe(false)
    expect(result.error).toBe(Messages.ERROR.message)
  })

  it('should return default state for unknown action', () => {
    const result = pollReducer(baseState, { type: 'UNKNOWN_ACTION' })
    expect(result).toEqual(baseState)
  })

  it('should preserve optimistic voted=true when snapshot from another user arrives (same poll)', () => {
    // State after optimistic VOTED dispatch
    const stateAfterVote = {
      ...baseState,
      voted: true,
      currentPollData: { ...basePoll, createdAt: { seconds: 5000 } },
    }
    // Snapshot from another user's vote — our userId NOT in voted array yet
    const otherUserPayload = {
      poll: {
        ...basePoll,
        voted: [{ id: 'user-321' }, { id: 'user-other' }],
        createdAt: { seconds: 5000 },
        lastUpdated: 10000,
      },
      host: 'host-1',
      userId: mockUserId,
    }
    const result = pollReducer(stateAfterVote, {
      type: REDUCER_ACTIONS.SUCCESS,
      payload: otherUserPayload,
    })
    // voted stays true despite server not yet having our vote
    expect(result.voted).toBe(true)
  })

  it('should reset voted to false when a new poll is created', () => {
    // State: voted=true on old poll
    const stateAfterVote = {
      ...baseState,
      voted: true,
      currentPollData: { ...basePoll, createdAt: { seconds: 5000 } },
    }
    // New poll with different createdAt — user has not voted
    const newPollPayload = {
      poll: {
        ...basePoll,
        voted: [],
        createdAt: { seconds: 9000 },
        lastUpdated: 11000,
      },
      host: 'host-1',
      userId: mockUserId,
    }
    const result = pollReducer(stateAfterVote, {
      type: REDUCER_ACTIONS.SUCCESS,
      payload: newPollPayload,
    })
    // voted resets to false for the new poll
    expect(result.voted).toBe(false)
  })
})
