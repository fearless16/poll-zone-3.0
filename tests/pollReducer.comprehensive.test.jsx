import { describe, it, expect } from 'vitest'
import { pollReducer } from '../src/Context/pollReducer'
import { REDUCER_ACTIONS, Messages } from '../src/Utils/constants'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const initialState = {
  loading: true,
  currentPollData: {},
  roomData: {},
  error: '',
  isHost: false,
  isOpen: false,
  voted: false,
  isPoll: false,
}

const buildPayload = (overrides = {}) => ({
  poll: {
    question: 'Which framework?',
    options: [
      { option: 'React', votes: 0 },
      { option: 'Vue', votes: 0 },
    ],
    voted: [],
    isOpen: true,
    type: 'voting',
    createdAt: { seconds: 1000 },
    lastUpdated: { seconds: 2000 },
    ...overrides.poll,
  },
  host: 'host-1',
  userId: 'host-1',
  roomName: 'Test Room',
  participants: [{ id: 'host-1', name: 'Host' }],
  roomId: 'room-1',
  ...overrides,
})

// ===========================================================================
// TEST SUITES
// ===========================================================================

describe('pollReducer – comprehensive stress tests', () => {
  // =========================================================================
  // SUCCESS action
  // =========================================================================

  describe('SUCCESS action', () => {
    it('transitions from loading to loaded with correct state', () => {
      const payload = buildPayload()
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })

      expect(state.loading).toBe(false)
      expect(state.currentPollData).toBe(payload.poll)
      expect(state.roomData).toBe(payload)
      expect(state.error).toBe('')
      expect(state.isHost).toBe(true)
      expect(state.isOpen).toBe(true)
      expect(state.voted).toBe(false)
      expect(state.isPoll).toBe(true)
    })

    it('detects voted=true when user is in voted array', () => {
      const payload = buildPayload({
        poll: { voted: [{ id: 'host-1', name: 'Host' }] },
        userId: 'host-1',
      })
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.voted).toBe(true)
    })

    it('detects voted=false when user is NOT in voted array', () => {
      const payload = buildPayload({
        poll: { voted: [{ id: 'other-user', name: 'Other' }] },
        userId: 'host-1',
      })
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.voted).toBe(false)
    })

    it('detects isHost=false for non-host user', () => {
      const payload = buildPayload({ userId: 'user-42' })
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.isHost).toBe(false)
    })

    it('detects isOpen=false when poll is closed', () => {
      const payload = buildPayload({ poll: { isOpen: false } })
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.isOpen).toBe(false)
    })

    it('detects isPoll=false when poll is empty object', () => {
      const payload = buildPayload()
      payload.poll = {}
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.isPoll).toBe(false)
    })

    it('clears previous error on SUCCESS', () => {
      const errorState = { ...initialState, error: 'Some old error' }
      const payload = buildPayload()
      const state = pollReducer(errorState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.error).toBe('')
    })
  })

  // =========================================================================
  // State transitions
  // =========================================================================

  describe('state transitions', () => {
    it('LOADING sets loading=true, preserves everything else', () => {
      const base = { ...initialState, loading: false, isHost: true, error: 'err' }
      const state = pollReducer(base, { type: REDUCER_ACTIONS.LOADING })
      expect(state.loading).toBe(true)
      expect(state.isHost).toBe(true)
      expect(state.error).toBe('err')
    })

    it('UNSET_LOADING sets loading=false, preserves everything else', () => {
      const base = { ...initialState, loading: true, isHost: true }
      const state = pollReducer(base, { type: REDUCER_ACTIONS.UNSET_LOADING })
      expect(state.loading).toBe(false)
      expect(state.isHost).toBe(true)
    })

    it('FAILURE sets loading=false and error message', () => {
      const base = { ...initialState, loading: true }
      const state = pollReducer(base, { type: REDUCER_ACTIONS.FAILURE })
      expect(state.loading).toBe(false)
      expect(state.error).toBe(Messages.ERROR.message)
    })

    it('OPEN sets isOpen=true', () => {
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.OPEN })
      expect(state.isOpen).toBe(true)
    })

    it('unknown action returns same state', () => {
      const state = pollReducer(initialState, { type: 'NONSENSE' })
      expect(state).toBe(initialState)
    })
  })

  // =========================================================================
  // Rapid state updates (simulating Firestore snapshots)
  // =========================================================================

  describe('rapid sequential snapshot processing', () => {
    it('processes 100 rapid SUCCESS actions reflecting votes accumulating', () => {
      let state = initialState

      for (let i = 0; i < 100; i++) {
        const voted = Array.from({ length: i + 1 }, (_, j) => ({
          id: `user-${j}`,
          name: `User ${j}`,
        }))

        const payload = buildPayload({
          poll: {
            voted,
            options: [
              { option: 'A', votes: Math.floor((i + 1) / 2) },
              { option: 'B', votes: Math.ceil((i + 1) / 2) },
            ],
            isOpen: true,
          },
          userId: 'user-0',
        })

        state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload })

        // After each snapshot, state should reflect the latest
        expect(state.loading).toBe(false)
        expect(state.currentPollData.voted).toHaveLength(i + 1)
        expect(state.voted).toBe(true) // user-0 is always in the voted array
        expect(state.isOpen).toBe(true)
      }

      // Final state check
      expect(state.currentPollData.voted).toHaveLength(100)
      expect(
        state.currentPollData.options[0].votes + state.currentPollData.options[1].votes
      ).toBe(100)
    })

    it('correctly transitions from open to closed mid-stream', () => {
      let state = initialState

      // 50 snapshots with poll open
      for (let i = 0; i < 50; i++) {
        const payload = buildPayload({
          poll: { isOpen: true, voted: Array.from({ length: i + 1 }, (_, j) => ({ id: `u-${j}` })) },
          userId: 'viewer',
        })
        state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload })
        expect(state.isOpen).toBe(true)
      }

      // Poll closes
      const closedPayload = buildPayload({
        poll: { isOpen: false, voted: Array.from({ length: 50 }, (_, j) => ({ id: `u-${j}` })) },
        userId: 'viewer',
      })
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: closedPayload })
      expect(state.isOpen).toBe(false)
      expect(state.voted).toBe(false) // 'viewer' never voted
    })

    it('never allows a stale SUCCESS to flip voted back to false after user voted', () => {
      // Simulate: user votes → snapshot arrives showing vote → another snapshot processes
      let state = initialState

      // Snapshot 1: user has voted
      const votedPayload = buildPayload({
        poll: {
          voted: [{ id: 'user-1' }],
          isOpen: true,
          lastUpdated: { seconds: 100 },
        },
        userId: 'user-1',
      })
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: votedPayload })
      expect(state.voted).toBe(true)

      // Snapshot 2: newer data still includes user in voted
      const newerPayload = buildPayload({
        poll: {
          voted: [{ id: 'user-1' }, { id: 'user-2' }],
          isOpen: true,
          lastUpdated: { seconds: 200 },
        },
        userId: 'user-1',
      })
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: newerPayload })
      expect(state.voted).toBe(true)
      expect(state.currentPollData.voted).toHaveLength(2)
    })
  })

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('handles SUCCESS with null poll gracefully', () => {
      const payload = buildPayload()
      payload.poll = null
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.voted).toBe(false)
      expect(state.isPoll).toBe(false)
      expect(state.isOpen).toBe(false)
    })

    it('handles SUCCESS with undefined userId', () => {
      const payload = buildPayload({ userId: undefined })
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.isHost).toBe(false)
      expect(state.voted).toBe(false)
    })

    it('handles poll with empty voted array', () => {
      const payload = buildPayload({ poll: { voted: [] } })
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.voted).toBe(false)
    })

    it('handles poll with undefined voted', () => {
      const payload = buildPayload({ poll: { voted: undefined, isOpen: true } })
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.voted).toBe(false)
    })

    it('preserves state shape after multiple action types', () => {
      let state = initialState

      state = pollReducer(state, { type: REDUCER_ACTIONS.LOADING })
      expect(Object.keys(state)).toEqual(Object.keys(initialState))

      const payload = buildPayload()
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(Object.keys(state)).toEqual(Object.keys(initialState))

      state = pollReducer(state, { type: REDUCER_ACTIONS.FAILURE })
      expect(Object.keys(state)).toEqual(Object.keys(initialState))
    })
  })

  // =========================================================================
  // PollPage render condition verification
  // =========================================================================

  describe('PollPage render conditions – state-based verification', () => {
    /**
     * Tests that the reducer produces correct state for every PollPage branch:
     *  - Host, no poll: "Create poll"
     *  - Non-host, no poll: "Wait for host"
     *  - Open, voted: "Voted successfully"
     *  - Closed, has poll: "Poll closed"
     *  - Open, not voted: show VotingForm
     */

    it('host with no poll → CREATE_POLL state', () => {
      const payload = buildPayload({ userId: 'host-1' })
      payload.poll = {}
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.isHost).toBe(true)
      expect(state.isPoll).toBe(false)
      expect(state.isOpen).toBe(false)
    })

    it('non-host with no poll → NO_ACTIVE_POLL state', () => {
      const payload = buildPayload({ userId: 'viewer' })
      payload.poll = {}
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.isHost).toBe(false)
      expect(state.isPoll).toBe(false)
      expect(state.isOpen).toBe(false)
    })

    it('open + voted → VOTED state (should NOT show VotingForm)', () => {
      const payload = buildPayload({
        poll: { voted: [{ id: 'user-1' }], isOpen: true },
        userId: 'user-1',
      })
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.isOpen).toBe(true)
      expect(state.voted).toBe(true)
      // VotingForm should NOT render → PollPage checks: isOpen && voted → NoPoll
    })

    it('closed + has poll → POLL_CLOSED state', () => {
      const payload = buildPayload({
        poll: { isOpen: false, voted: [], options: [{ option: 'A', votes: 1 }] },
        userId: 'user-1',
      })
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.isOpen).toBe(false)
      expect(state.isPoll).toBe(true)
      expect(state.voted).toBe(false)
    })

    it('open + not voted → SHOW VOTING FORM state', () => {
      const payload = buildPayload({
        poll: {
          voted: [{ id: 'other-user' }],
          isOpen: true,
          options: [{ option: 'A', votes: 1 }],
        },
        userId: 'user-1',
      })
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.isPoll).toBe(true)
      expect(state.isOpen).toBe(true)
      expect(state.voted).toBe(false)
      // VotingForm should render
    })
  })
})
