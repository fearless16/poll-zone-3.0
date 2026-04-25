/**
 * CreatePoll Tests
 *
 * Tests for: CreatePoll page, Estimation poll creation, Voting poll creation
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

const mockAddPoll = vi.fn()

vi.mock('../src/Firebase/dbHandler', () => ({
  createRoom: vi.fn(),
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
import CreatePoll from '../src/Components/CreatePoll'
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
describe('CreatePoll Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(storage).forEach((k) => delete storage[k])
    onSnapshot.mockImplementation(() => vi.fn())
  })

  afterEach(() => {
    cleanup()
  })

  // ─── CreatePoll Flow ───────────────────────────────────────────
  describe('CreatePoll Flow', () => {
    it('shows NOT_HOST for non-host user', () => {
      const ctx = {
        pollState: { loading: false, currentPollData: {}, roomData: {}, error: '', isHost: false, isOpen: false, voted: false, isPoll: false },
        dispatch: vi.fn(),
        roomId: 'r1',
        setRoomId: vi.fn(),
        userId: 'u1',
        setUserId: vi.fn(),
      }

      renderWithContext(<CreatePoll />, ctx, { route: '/create' })
      expect(screen.getByText(Messages.NOT_HOST.message)).toBeInTheDocument()
    })

    it('shows estimation/voting toggle for host', () => {
      const ctx = {
        pollState: { loading: false, currentPollData: {}, roomData: {}, error: '', isHost: true, isOpen: false, voted: false, isPoll: false },
        dispatch: vi.fn(),
        roomId: 'r1',
        setRoomId: vi.fn(),
        userId: 'u1',
        setUserId: vi.fn(),
      }

      renderWithContext(<CreatePoll />, ctx, { route: '/create' })
      expect(screen.getByText(/create estimation poll/i)).toBeInTheDocument()
    })

    it('shows loader when loading', () => {
      const ctx = {
        pollState: { loading: true, currentPollData: {}, roomData: {}, error: '', isHost: true, isOpen: false, voted: false, isPoll: false },
        dispatch: vi.fn(),
        roomId: 'r1',
        setRoomId: vi.fn(),
        userId: 'u1',
        setUserId: vi.fn(),
      }

      renderWithContext(<CreatePoll />, ctx, { route: '/create' })
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('redirects to / when no roomId and not loading', () => {
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
          <Route path="/create" element={<CreatePoll />} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>,
        ctx,
        { route: '/create' }
      )

      expect(screen.getByTestId('location').textContent).toBe('/')
    })
  })

  // ─── Estimation Poll Creation ──────────────────────────────────
  describe('Estimation Poll Creation', () => {
    it('submits estimation poll and navigates to /poll', async () => {
      storage.roomId = 'room-1'
      mockAddPoll.mockResolvedValueOnce({ response: { success: true } })

      const ctx = {
        pollState: { loading: false, currentPollData: {}, roomData: {}, error: '', isHost: true, isOpen: false, voted: false, isPoll: false },
        dispatch: vi.fn(),
        roomId: 'room-1',
        setRoomId: vi.fn(),
        userId: 'u1',
        setUserId: vi.fn(),
      }

      const { default: Estimation } = await import('../src/Components/Estimation')

      renderWithContext(
        <Routes>
          <Route path="/create" element={<Estimation />} />
          <Route path="/poll" element={<div data-testid="poll-page">Poll</div>} />
        </Routes>,
        ctx,
        { route: '/create' }
      )

      expect(screen.getByText(/create estimation poll/i)).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockAddPoll).toHaveBeenCalledWith(
          'room-1',
          expect.arrayContaining([
            expect.objectContaining({ votes: 0 }),
          ])
        )
      })

      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toBe('/poll')
      })
    })
  })

  // ─── Voting Poll Creation ──────────────────────────────────────
  describe('Voting Poll Creation', () => {
    it('submits voting poll with question and options', async () => {
      storage.roomId = 'room-1'
      mockAddPoll.mockResolvedValueOnce({ response: { success: true } })

      const ctx = {
        pollState: { loading: false, currentPollData: {}, roomData: {}, error: '', isHost: true, isOpen: false, voted: false, isPoll: false },
        dispatch: vi.fn(),
        roomId: 'room-1',
        setRoomId: vi.fn(),
        userId: 'u1',
        setUserId: vi.fn(),
      }

      const { default: Voting } = await import('../src/Components/Voting')

      renderWithContext(
        <Routes>
          <Route path="/create" element={<Voting />} />
          <Route path="/poll" element={<div data-testid="poll-page">Poll</div>} />
        </Routes>,
        ctx,
        { route: '/create' }
      )

      expect(screen.getByText(/create question poll/i)).toBeInTheDocument()

      fireEvent.change(screen.getByPlaceholderText(/enter your question/i), {
        target: { value: 'Best language?' },
      })

      const optionInputs = screen.getAllByPlaceholderText(/option \d/i)
      fireEvent.change(optionInputs[0], { target: { value: 'JavaScript' } })
      fireEvent.change(optionInputs[1], { target: { value: 'Python' } })
      fireEvent.change(optionInputs[2], { target: { value: 'Rust' } })
      fireEvent.change(optionInputs[3], { target: { value: 'Go' } })

      fireEvent.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockAddPoll).toHaveBeenCalledWith(
          'room-1',
          expect.arrayContaining([
            { option: 'JavaScript', votes: 0 },
            { option: 'Python', votes: 0 },
            { option: 'Rust', votes: 0 },
            { option: 'Go', votes: 0 },
          ]),
          'Best language?'
        )
      })

      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toBe('/poll')
      })
    })
  })
})
