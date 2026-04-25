/**
 * Integration Tests
 *
 * Tests for: pollReducer edge cases, Full host lifecycle,
 * Strict data flow (Firestore schema fidelity),
 * Strict reducer state transitions
 */

import React from 'react'
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Routes, Route } from 'react-router'
import { onSnapshot } from 'firebase/firestore'
import { renderWithRouter, renderWithContext } from './helpers/testUtils'

// ─── Firebase Mocks ────────────────────────────────────────────────
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    onSnapshot: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    runTransaction: vi.fn(),
    arrayUnion: vi.fn((...args) => args),
    collection: vi.fn(),
    Timestamp: { now: () => ({ seconds: Date.now() / 1000 }) },
  }
})

vi.mock('../src/Firebase/config', () => ({ db: {} }))

const mockCreateRoom = vi.fn()
const mockAddPoll = vi.fn()

vi.mock('../src/Firebase/dbHandler', () => ({
  createRoom: (...args) => mockCreateRoom(...args),
  joinPoll: vi.fn(),
  addPoll: (...args) => mockAddPoll(...args),
  closePoll: vi.fn(),
  castVote: vi.fn(),
}))

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  ArcElement: {},
  Tooltip: {},
  Legend: {},
  Title: {},
}))
vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <canvas data-testid="chart" />,
}))

// ─── Component Imports ─────────────────────────────────────────────
import Home from '../src/Components/Home'
import CreatePoll from '../src/Components/CreatePoll'
import PollPage from '../src/Components/PollPage'
import Result from '../src/Components/Result'
import { Messages, REDUCER_ACTIONS } from '../src/Utils/constants'
import { pollReducer } from '../src/Context/pollReducer'

// ─── localStorage mock ─────────────────────────────────────────────
const storage = {}
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] ?? null),
  setItem: vi.fn((key, val) => { storage[key] = val }),
  removeItem: vi.fn((key) => { delete storage[key] }),
  clear: vi.fn(() => Object.keys(storage).forEach((k) => delete storage[k])),
}
vi.stubGlobal('localStorage', localStorageMock)

// ═══════════════════════════════════════════════════════════════════
describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(storage).forEach((k) => delete storage[k])
    onSnapshot.mockImplementation(() => vi.fn())
  })

  afterEach(() => {
    cleanup()
  })

  // ─── pollReducer Edge Cases ────────────────────────────────────
  describe('pollReducer Edge Cases', () => {
    const baseState = {
      loading: false,
      currentPollData: { lastUpdated: 100 },
      roomData: {},
      error: '',
      isHost: false,
      isOpen: false,
      voted: false,
      isPoll: false,
    }

    it('LOADING action does not crash (no payload)', () => {
      const result = pollReducer(baseState, { type: REDUCER_ACTIONS.LOADING })
      expect(result.loading).toBe(true)
    })

    it('FAILURE action does not crash (no payload)', () => {
      const result = pollReducer(baseState, { type: REDUCER_ACTIONS.FAILURE })
      expect(result.loading).toBe(false)
      expect(result.error).toBe(Messages.ERROR.message)
    })

    it('UNSET_LOADING action does not crash (no payload)', () => {
      const result = pollReducer({ ...baseState, loading: true }, { type: REDUCER_ACTIONS.UNSET_LOADING })
      expect(result.loading).toBe(false)
    })

    it('handles SUCCESS when voted is not an array', () => {
      const payload = {
        poll: { voted: 'corrupted', options: [{ option: 'A' }], isOpen: true, lastUpdated: 999 },
        host: 'h1',
        userId: 'u1',
      }
      const result = pollReducer(baseState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(result.voted).toBe(false)
    })

    it('handles SUCCESS when voted is null', () => {
      const payload = {
        poll: { voted: null, options: [], isOpen: true, lastUpdated: 999 },
        host: 'h1',
        userId: 'u1',
      }
      const result = pollReducer(baseState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(result.voted).toBe(false)
    })

    it('handles SUCCESS when poll is empty object', () => {
      const payload = {
        poll: {},
        host: 'h1',
        userId: 'u1',
      }
      const result = pollReducer(baseState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(result.isPoll).toBe(false)
    })

    it('unknown action returns state unchanged', () => {
      const result = pollReducer(baseState, { type: 'BOGUS' })
      expect(result).toBe(baseState)
    })
  })

  // ─── Full Host Lifecycle ───────────────────────────────────────
  describe('Full Host Lifecycle (integration)', () => {
    it('host creates room, gets toast, then sees create poll page', async () => {
      storage.id = 'host-1'
      storage.roomId = 'room-1'

      mockCreateRoom.mockResolvedValueOnce({
        response: { success: true, roomId: 'room-1', hostId: 'host-1' },
      })

      onSnapshot.mockImplementation((_, cb) => {
        cb({
          exists: () => true,
          data: () => ({
            poll: {},
            host: 'host-1',
            participants: [{ id: 'host-1', name: 'Alice' }],
          }),
          metadata: { hasPendingWrites: false },
        })
        return vi.fn()
      })

      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreatePoll />} />
          <Route path="/poll" element={<PollPage />} />
        </Routes>
      )

      const allNames = screen.getAllByPlaceholderText('Your display name')
      const roomName = screen.getByPlaceholderText('Room name')

      fireEvent.change(allNames[0], { target: { value: 'Alice' } })
      fireEvent.change(roomName, { target: { value: 'Retro' } })

      fireEvent.click(screen.getByRole('button', { name: /create room/i }))

      await waitFor(() => {
        expect(screen.getByText('room-1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /close/i }))

      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toBe('/create')
      })
    })
  })

  // ─── Strict Data Flow: Firestore Schema Fidelity ───────────────
  describe('Strict Data Flow: Firestore Schema Fidelity', () => {
    const firestoreContext = ({
      roomName = 'Sprint Planning',
      roomId = 'ROOM-1',
      hostId = 'host-1',
      userId = 'host-1',
      participants = [{ id: 'host-1', name: 'Alice' }],
      poll = {},
      stateOverrides = {},
    } = {}) => {
      const firestoreDoc = { roomName, host: hostId, participants, poll, createdAt: { seconds: 1000 } }
      const payload = { ...firestoreDoc, userId, roomId }
      const isHostVal = hostId === userId
      const isOpenVal = !!poll?.isOpen
      const isPollVal = !!poll && Object.keys(poll).length > 0
      const votedVal = Array.isArray(poll?.voted) && poll.voted.some(v => v.id === userId)

      return {
        pollState: {
          loading: false,
          currentPollData: poll,
          roomData: payload,
          error: '',
          isHost: isHostVal,
          isOpen: isOpenVal,
          voted: votedVal,
          isPoll: isPollVal,
          ...stateOverrides,
        },
        dispatch: vi.fn(),
        roomId,
        setRoomId: vi.fn(),
        userId,
        setUserId: vi.fn(),
      }
    }

    it('RoomDetailsCard renders roomName (not name) from Firestore doc', () => {
      const ctx = firestoreContext({ roomName: 'Sprint Planning' })
      ctx.pollState.isPoll = true
      ctx.pollState.isOpen = true
      ctx.pollState.currentPollData = {
        isOpen: true,
        options: [{ option: '1', votes: 1 }],
        voted: [{ id: 'host-1', name: 'Alice' }],
      }

      renderWithContext(
        <Routes>
          <Route path="/" element={<Result />} />
        </Routes>,
        ctx
      )

      expect(screen.getByText('Sprint Planning')).toBeInTheDocument()
      expect(screen.getByText('Room Details')).toBeInTheDocument()
    })

    it('participant sees VotingForm when poll is open and not voted', () => {
      const poll = {
        isOpen: true,
        question: 'Best framework?',
        options: [{ option: 'React', votes: 0 }, { option: 'Vue', votes: 0 }],
        voted: [],
        createdAt: { seconds: 2000 },
      }
      const ctx = firestoreContext({
        userId: 'participant-1',
        participants: [{ id: 'host-1', name: 'Alice' }, { id: 'participant-1', name: 'Bob' }],
        poll,
      })

      renderWithContext(
        <Routes>
          <Route path="/" element={<PollPage />} />
        </Routes>,
        ctx
      )

      expect(screen.getByText('Best framework?')).toBeInTheDocument()
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('Vue')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
    })

    it('participant sees "Poll closed" when poll.isOpen = false', () => {
      const poll = {
        isOpen: false,
        options: [{ option: 'React', votes: 2 }],
        voted: [{ id: 'host-1', name: 'Alice' }, { id: 'participant-1', name: 'Bob' }],
        createdAt: { seconds: 2000 },
      }
      const ctx = firestoreContext({
        userId: 'participant-1',
        participants: [{ id: 'host-1', name: 'Alice' }, { id: 'participant-1', name: 'Bob' }],
        poll,
      })

      renderWithContext(
        <Routes>
          <Route path="/" element={<PollPage />} />
        </Routes>,
        ctx
      )

      expect(screen.getByText('Poll closed')).toBeInTheDocument()
      expect(screen.getByText('see results')).toBeInTheDocument()
    })

    it('participant sees new poll after host creates one (voted resets)', () => {
      const newPoll = {
        isOpen: true,
        question: 'New question?',
        options: [{ option: 'A', votes: 0 }, { option: 'B', votes: 0 }],
        voted: [],
        createdAt: { seconds: 9000 },
      }
      const ctx = firestoreContext({
        userId: 'participant-1',
        participants: [{ id: 'host-1', name: 'Alice' }, { id: 'participant-1', name: 'Bob' }],
        poll: newPoll,
      })

      renderWithContext(
        <Routes>
          <Route path="/" element={<PollPage />} />
        </Routes>,
        ctx
      )

      expect(screen.getByText('New question?')).toBeInTheDocument()
      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('B')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
    })

    it('host sees "No poll present" when room has empty poll object', () => {
      const ctx = firestoreContext({ poll: {} })

      renderWithContext(
        <Routes>
          <Route path="/" element={<PollPage />} />
        </Routes>,
        ctx
      )

      expect(screen.getByText('No poll present')).toBeInTheDocument()
    })

    it('non-host sees "No active poll" when room has empty poll object', () => {
      const ctx = firestoreContext({ userId: 'participant-1', poll: {} })

      renderWithContext(
        <Routes>
          <Route path="/" element={<PollPage />} />
        </Routes>,
        ctx
      )

      expect(screen.getByText('No active poll, wait for host to create a poll')).toBeInTheDocument()
    })

    it('participant sees "Voted successfully" after voting', () => {
      const poll = {
        isOpen: true,
        options: [{ option: 'React', votes: 1 }],
        voted: [{ id: 'participant-1', name: 'Bob' }],
        createdAt: { seconds: 2000 },
      }
      const ctx = firestoreContext({
        userId: 'participant-1',
        participants: [{ id: 'host-1', name: 'Alice' }, { id: 'participant-1', name: 'Bob' }],
        poll,
      })

      renderWithContext(
        <Routes>
          <Route path="/" element={<PollPage />} />
        </Routes>,
        ctx
      )

      expect(screen.getByText('Voted successfully')).toBeInTheDocument()
      expect(screen.getByText('see results')).toBeInTheDocument()
    })
  })

  // ─── Strict Reducer: State Transitions Mirror Firestore ────────
  describe('Strict Reducer: State Transitions Mirror Firestore', () => {
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

    it('full host flow: join → create poll → vote → close → create new poll', () => {
      const roomPayload = {
        roomName: 'Sprint',
        host: 'host-1',
        participants: [{ id: 'host-1', name: 'Alice' }],
        poll: {},
        userId: 'host-1',
        roomId: 'ROOM-1',
      }
      let state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload: roomPayload })
      expect(state.isHost).toBe(true)
      expect(state.isPoll).toBe(false)
      expect(state.isOpen).toBe(false)
      expect(state.loading).toBe(false)

      const pollPayload = {
        ...roomPayload,
        poll: {
          isOpen: true,
          options: [{ option: '1', votes: 0 }, { option: '2', votes: 0 }],
          voted: [],
          createdAt: { seconds: 5000 },
        },
      }
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: pollPayload })
      expect(state.isPoll).toBe(true)
      expect(state.isOpen).toBe(true)
      expect(state.voted).toBe(false)

      state = pollReducer(state, { type: REDUCER_ACTIONS.VOTED })
      expect(state.voted).toBe(true)

      const votedPayload = {
        ...pollPayload,
        poll: {
          ...pollPayload.poll,
          voted: [{ id: 'host-1', name: 'Alice' }],
          options: [{ option: '1', votes: 1 }, { option: '2', votes: 0 }],
        },
      }
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: votedPayload })
      expect(state.voted).toBe(true)

      const closedPayload = {
        ...votedPayload,
        poll: { ...votedPayload.poll, isOpen: false },
      }
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: closedPayload })
      expect(state.isOpen).toBe(false)
      expect(state.isPoll).toBe(true)
      expect(state.voted).toBe(true)

      state = pollReducer(state, { type: REDUCER_ACTIONS.POLL_CREATED })
      expect(state.voted).toBe(false)
      expect(state.isOpen).toBe(true)
      expect(state.isPoll).toBe(true)

      const newPollPayload = {
        ...roomPayload,
        poll: {
          isOpen: true,
          options: [{ option: '3', votes: 0 }, { option: '5', votes: 0 }],
          voted: [],
          createdAt: { seconds: 9000 },
        },
      }
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: newPollPayload })
      expect(state.isOpen).toBe(true)
      expect(state.isPoll).toBe(true)
      expect(state.voted).toBe(false)
    })

    it('full participant flow: join → see poll → vote → poll closed → new poll', () => {
      const participantId = 'participant-1'

      const pollPayload = {
        roomName: 'Sprint',
        host: 'host-1',
        participants: [{ id: 'host-1', name: 'Alice' }, { id: participantId, name: 'Bob' }],
        poll: {
          isOpen: true,
          options: [{ option: 'React', votes: 0 }, { option: 'Vue', votes: 0 }],
          voted: [],
          createdAt: { seconds: 5000 },
        },
        userId: participantId,
        roomId: 'ROOM-1',
      }
      let state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload: pollPayload })
      expect(state.isHost).toBe(false)
      expect(state.isPoll).toBe(true)
      expect(state.isOpen).toBe(true)
      expect(state.voted).toBe(false)

      state = pollReducer(state, { type: REDUCER_ACTIONS.VOTED })
      expect(state.voted).toBe(true)

      const votedPayload = {
        ...pollPayload,
        poll: {
          ...pollPayload.poll,
          voted: [{ id: participantId, name: 'Bob' }],
          options: [{ option: 'React', votes: 1 }, { option: 'Vue', votes: 0 }],
        },
      }
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: votedPayload })
      expect(state.voted).toBe(true)

      const closedPayload = {
        ...votedPayload,
        poll: { ...votedPayload.poll, isOpen: false },
      }
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: closedPayload })
      expect(state.isOpen).toBe(false)
      expect(state.isPoll).toBe(true)

      const newPollPayload = {
        ...pollPayload,
        poll: {
          isOpen: true,
          options: [{ option: 'A', votes: 0 }, { option: 'B', votes: 0 }],
          voted: [],
          createdAt: { seconds: 9000 },
        },
      }
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: newPollPayload })
      expect(state.isOpen).toBe(true)
      expect(state.isPoll).toBe(true)
      expect(state.voted).toBe(false)
    })

    it('roomName field is preserved in roomData through reducer', () => {
      const payload = {
        roomName: 'Retro Meeting',
        host: 'host-1',
        participants: [{ id: 'host-1', name: 'Alice' }],
        poll: { isOpen: true, options: [], voted: [], createdAt: { seconds: 1000 } },
        userId: 'host-1',
        roomId: 'ROOM-1',
      }
      const state = pollReducer(initialState, { type: REDUCER_ACTIONS.SUCCESS, payload })
      expect(state.roomData.roomName).toBe('Retro Meeting')
      expect(state.roomData.name).toBeUndefined()
    })
  })
})
