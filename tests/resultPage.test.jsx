/**
 * Result Page Tests
 *
 * Tests for: Result page rendering, Close poll flow
 */

import React from 'react'
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Routes, Route } from 'react-router'
import { onSnapshot } from 'firebase/firestore'
import { renderWithContext } from './helpers/testUtils'

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

const mockClosePoll = vi.fn()

vi.mock('../src/Firebase/dbHandler', () => ({
  createRoom: vi.fn(),
  joinPoll: vi.fn(),
  addPoll: vi.fn(),
  closePoll: (...args) => mockClosePoll(...args),
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
import Result from '../src/Components/Result'
import { Messages } from '../src/Utils/constants'

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
describe('Result Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(storage).forEach((k) => delete storage[k])
    onSnapshot.mockImplementation(() => vi.fn())
  })

  afterEach(() => {
    cleanup()
  })

  const resultContext = (overrides = {}) => ({
    pollState: {
      loading: false,
      currentPollData: {
        question: 'Fave?',
        options: [
          { option: 'React', votes: 3 },
          { option: 'Vue', votes: 2 },
        ],
        voted: [
          { id: 'u1', name: 'A' },
          { id: 'u2', name: 'B' },
          { id: 'u3', name: 'C' },
        ],
        isOpen: true,
        lastUpdated: { seconds: 1000 },
      },
      roomData: {
        roomId: 'room1',
        roomName: 'Sprint',
        host: 'u1',
        participants: [
          { id: 'u1', name: 'A' },
          { id: 'u2', name: 'B' },
          { id: 'u3', name: 'C' },
        ],
        poll: {
          options: [
            { option: 'React', votes: 3 },
            { option: 'Vue', votes: 2 },
          ],
        },
      },
      error: '',
      isHost: true,
      isOpen: true,
      voted: true,
      isPoll: true,
      ...overrides,
    },
    dispatch: vi.fn(),
    roomId: 'room1',
    setRoomId: vi.fn(),
    userId: 'u1',
    setUserId: vi.fn(),
  })

  // ─── Result Page Flow ──────────────────────────────────────────
  describe('Result Page Flow', () => {
    it('shows poll results with chart, votes, and sidebar', () => {
      renderWithContext(<Result />, resultContext(), { route: '/result' })

      expect(screen.getByTestId('chart')).toBeInTheDocument()
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('Vue')).toBeInTheDocument()
      expect(screen.getByText('Sprint')).toBeInTheDocument()
      expect(screen.getByText('Room Details')).toBeInTheDocument()
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    })

    it('shows "Close Poll" button for host when poll is open', () => {
      renderWithContext(<Result />, resultContext(), { route: '/result' })
      expect(screen.getByRole('button', { name: /close poll/i })).toBeInTheDocument()
    })

    it('shows "Go to poll" button when poll is open', () => {
      renderWithContext(<Result />, resultContext(), { route: '/result' })
      expect(screen.getByRole('button', { name: /go to poll/i })).toBeInTheDocument()
    })

    it('shows NO_POLL_DATA when no poll data', () => {
      renderWithContext(
        <Result />,
        resultContext({ isPoll: false, currentPollData: {} }),
        { route: '/result' }
      )
      expect(screen.getByText(Messages.NO_POLL_DATA_TO_SHOW.message)).toBeInTheDocument()
    })

    it('shows "Poll has been closed" when poll is not open', () => {
      const ctx = resultContext({
        isOpen: false,
        currentPollData: {
          question: 'Q',
          options: [{ option: 'A', votes: 1 }],
          voted: [{ id: 'u1', name: 'A' }],
          isOpen: false,
        },
      })
      renderWithContext(<Result />, ctx, { route: '/result' })
      expect(screen.getByText(/poll has been closed/i)).toBeInTheDocument()
    })

    it('redirects to / when no roomId', () => {
      const ctx = resultContext()
      ctx.roomId = ''
      ctx.userId = ''

      renderWithContext(
        <Routes>
          <Route path="/result" element={<Result />} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>,
        ctx,
        { route: '/result' }
      )

      expect(screen.getByTestId('location').textContent).toBe('/')
    })
  })

  // ─── Close Poll Flow ───────────────────────────────────────────
  describe('Close Poll Flow', () => {
    it('closes poll when all users voted and navigates to /create', async () => {
      mockClosePoll.mockResolvedValueOnce({ response: { success: true } })

      const ctx = {
        pollState: {
          loading: false,
          currentPollData: {
            question: 'Q',
            options: [{ option: 'A', votes: 2 }],
            voted: [{ id: 'u1', name: 'A' }, { id: 'u2', name: 'B' }],
            isOpen: true,
          },
          roomData: {
            roomId: 'r1',
            host: 'u1',
            participants: [{ id: 'u1', name: 'A' }, { id: 'u2', name: 'B' }],
            poll: { options: [{ option: 'A', votes: 2 }] },
          },
          error: '',
          isHost: true,
          isOpen: true,
          voted: true,
          isPoll: true,
        },
        dispatch: vi.fn(),
        roomId: 'r1',
        setRoomId: vi.fn(),
        userId: 'u1',
        setUserId: vi.fn(),
      }

      renderWithContext(
        <Routes>
          <Route path="/result" element={<Result />} />
          <Route path="/create" element={<div data-testid="create-page">Create</div>} />
        </Routes>,
        ctx,
        { route: '/result' }
      )

      fireEvent.click(screen.getByRole('button', { name: /close poll/i }))

      await waitFor(() => {
        expect(mockClosePoll).toHaveBeenCalledWith('r1')
      })

      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toBe('/create')
      })
    })

    it('shows modal when not all users voted', async () => {
      const ctx = {
        pollState: {
          loading: false,
          currentPollData: {
            question: 'Q',
            options: [{ option: 'A', votes: 1 }],
            voted: [{ id: 'u1', name: 'A' }],
            isOpen: true,
          },
          roomData: {
            roomId: 'r1',
            host: 'u1',
            participants: [{ id: 'u1', name: 'A' }, { id: 'u2', name: 'B' }, { id: 'u3', name: 'C' }],
            poll: { options: [{ option: 'A', votes: 1 }] },
          },
          error: '',
          isHost: true,
          isOpen: true,
          voted: true,
          isPoll: true,
        },
        dispatch: vi.fn(),
        roomId: 'r1',
        setRoomId: vi.fn(),
        userId: 'u1',
        setUserId: vi.fn(),
      }

      renderWithContext(<Result />, ctx, { route: '/result' })

      fireEvent.click(screen.getByRole('button', { name: /close poll/i }))

      await waitFor(() => {
        expect(screen.getByText(/all participants have not voted/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /submit anyway/i })).toBeInTheDocument()
      })
    })
  })
})
