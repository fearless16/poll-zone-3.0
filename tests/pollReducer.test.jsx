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

  it('should handle FAILURE action', () => {
    const result = pollReducer(baseState, { type: REDUCER_ACTIONS.FAILURE })
    expect(result.loading).toBe(false)
    expect(result.error).toBe(Messages.ERROR.message)
  })

  it('should return default state for unknown action', () => {
    const result = pollReducer(baseState, { type: 'UNKNOWN_ACTION' })
    expect(result).toEqual(baseState)
  })
})
