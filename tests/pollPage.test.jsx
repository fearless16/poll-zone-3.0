/**
 * PollPage Tests
 *
 * Tests for: PollPage state rendering, Voting flow
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
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

const mockCastVote = vi.fn()

vi.mock('../src/Firebase/dbHandler', () => ({
  createRoom: vi.fn(),
  joinPoll: vi.fn(),
  addPoll: vi.fn(),
  closePoll: vi.fn(),
  castVote: (...args) => mockCastVote(...args),
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
import PollPage from '../src/Components/PollPage'
import { Messages, REDUCER_ACTIONS } from '../src/Utils/constants'

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
describe('PollPage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(storage).forEach((k) => delete storage[k])
    onSnapshot.mockImplementation(() => vi.fn())
  })

  afterEach(() => {
    cleanup()
  })

  // ─── PollPage State Rendering ──────────────────────────────────
  describe('PollPage State Rendering', () => {
    const makePollContext = (overrides = {}) => ({
      pollState: {
        loading: false,
        currentPollData: {},
        roomData: {},
        error: '',
        isHost: false,
        isOpen: false,
        voted: false,
        isPoll: false,
        ...overrides,
      },
      dispatch: vi.fn(),
      roomId: 'room1',
      setRoomId: vi.fn(),
      userId: 'user1',
      setUserId: vi.fn(),
    })

    it('shows loader when loading', () => {
      renderWithContext(<PollPage />, makePollContext({ loading: true }), { route: '/poll' })
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('shows CREATE_POLL for host with no poll', () => {
      renderWithContext(
        <PollPage />,
        makePollContext({ isHost: true, isPoll: false, isOpen: false }),
        { route: '/poll' }
      )
      expect(screen.getByText(/no poll present/i)).toBeInTheDocument()
      expect(screen.getByText(Messages.CREATE_POLL.linkMessage)).toBeInTheDocument()
    })

    it('shows NO_ACTIVE_POLL for non-host with no poll', () => {
      renderWithContext(
        <PollPage />,
        makePollContext({ isHost: false, isPoll: false, isOpen: false }),
        { route: '/poll' }
      )
      expect(screen.getByText(Messages.NO_ACTIVE_POLL.message)).toBeInTheDocument()
    })

    it('shows VOTED when user already voted', () => {
      renderWithContext(
        <PollPage />,
        makePollContext({ isOpen: true, voted: true }),
        { route: '/poll' }
      )
      expect(screen.getByText(Messages.VOTED.message)).toBeInTheDocument()
      expect(screen.getByText(Messages.VOTED.linkMessage)).toBeInTheDocument()
    })

    it('shows POLL_CLOSED when poll is closed', () => {
      renderWithContext(
        <PollPage />,
        makePollContext({ isPoll: true, isOpen: false }),
        { route: '/poll' }
      )
      expect(screen.getByText(Messages.POLL_CLOSED.message)).toBeInTheDocument()
    })

    it('shows VotingForm when poll is open and user has not voted', () => {
      const ctx = makePollContext({
        isPoll: true,
        isOpen: true,
        voted: false,
        currentPollData: {
          question: 'Best framework?',
          options: [
            { option: 'React', votes: 0 },
            { option: 'Vue', votes: 0 },
          ],
          voted: [],
          isOpen: true,
        },
      })
      renderWithContext(<PollPage />, ctx, { route: '/poll' })
      expect(screen.getByText('Best framework?')).toBeInTheDocument()
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('Vue')).toBeInTheDocument()
    })

    it('redirects to / when no roomId/userId and not loading', () => {
      const ctx = {
        pollState: { loading: false, currentPollData: {}, roomData: {}, error: '', isHost: false, isOpen: false, voted: false, isPoll: false },
        dispatch: vi.fn(),
        roomId: '',
        setRoomId: vi.fn(),
        userId: '',
        setUserId: vi.fn(),
      }

      renderWithContext(
        <Routes>
          <Route path="/poll" element={<PollPage />} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>,
        ctx,
        { route: '/poll' }
      )

      expect(screen.getByTestId('location').textContent).toBe('/')
    })
  })

  // ─── Voting Flow ───────────────────────────────────────────────
  describe('Voting Flow', () => {
    it('submits a vote and state transitions to voted', async () => {
      storage.id = 'user-1'
      storage.displayName = 'Alice'
      storage.roomId = 'room-1'

      mockCastVote.mockResolvedValueOnce({ response: { success: true } })

      let snapshotCallback
      onSnapshot.mockImplementation((_, cb) => {
        snapshotCallback = cb
        cb({
          exists: () => true,
          data: () => ({
            poll: {
              question: 'Pick one',
              options: [
                { option: 'A', votes: 0 },
                { option: 'B', votes: 0 },
              ],
              voted: [],
              isOpen: true,
              lastUpdated: { seconds: 1000 },
            },
            participants: [{ id: 'user-1', name: 'Alice' }],
            host: 'host-1',
          }),
          metadata: { hasPendingWrites: false },
        })
        return vi.fn()
      })

      renderWithRouter(
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/poll" element={<PollPage />} />
          <Route path="/result" element={<div data-testid="result">Result</div>} />
        </Routes>,
        { route: '/poll' }
      )

      await waitFor(() => {
        expect(screen.getByText('Pick one')).toBeInTheDocument()
      })

      const radioA = screen.getByLabelText('A')
      fireEvent.click(radioA)

      const submitBtn = screen.getByRole('button', { name: /submit/i })
      expect(submitBtn).not.toBeDisabled()
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(mockCastVote).toHaveBeenCalledWith('room-1', 0, 'user-1', 'Alice')
      })

      await waitFor(() => {
        expect(screen.getByText(Messages.VOTED.message)).toBeInTheDocument()
      })

      // Simulate Firestore snapshot arriving later
      act(() => {
        snapshotCallback({
          exists: () => true,
          data: () => ({
            poll: {
              question: 'Pick one',
              options: [
                { option: 'A', votes: 1 },
                { option: 'B', votes: 0 },
              ],
              voted: [{ id: 'user-1', name: 'Alice' }],
              isOpen: true,
              lastUpdated: { seconds: 2000 },
            },
            participants: [{ id: 'user-1', name: 'Alice' }],
            host: 'host-1',
          }),
          metadata: { hasPendingWrites: false },
        })
      })

      expect(screen.getByText(Messages.VOTED.message)).toBeInTheDocument()
    })
  })
})
