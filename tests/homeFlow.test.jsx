/**
 * Home Flow Tests
 *
 * Tests for: Host creates room, Toast navigation, Participant joins room
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router'
import { onSnapshot } from 'firebase/firestore'
import { renderWithRouter } from './helpers/testUtils'
import { LocationDisplay } from './helpers/testUtils'

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
const mockJoinPoll = vi.fn()

vi.mock('../src/Firebase/dbHandler', () => ({
  createRoom: (...args) => mockCreateRoom(...args),
  joinPoll: (...args) => mockJoinPoll(...args),
  addPoll: vi.fn(),
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
import Toast from '../src/Components/Toast'

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
describe('Home Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(storage).forEach((k) => delete storage[k])
    onSnapshot.mockImplementation(() => vi.fn())
  })

  afterEach(() => {
    cleanup()
  })

  // ─── Host Create Room Flow ─────────────────────────────────────
  describe('Host Create Room Flow', () => {
    it('creates room and shows toast with room ID', async () => {
      mockCreateRoom.mockResolvedValueOnce({
        response: { success: true, roomId: 'ROOM-ABC', hostId: 'host-1' },
      })

      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<div data-testid="create-page">Create</div>} />
        </Routes>
      )

      const inputs = screen.getAllByPlaceholderText(/name/i)
      const displayNameInput = inputs.find((i) => i.placeholder.match(/display name/i))
      const roomNameInput = inputs.find((i) => i.placeholder.match(/room name/i))

      fireEvent.change(displayNameInput, { target: { value: 'Alice' } })
      fireEvent.change(roomNameInput, { target: { value: 'Sprint Review' } })

      const createBtn = screen.getByRole('button', { name: /create room/i })
      fireEvent.click(createBtn)

      await waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalledWith('Alice', 'Sprint Review')
      })

      await waitFor(() => {
        expect(screen.getByText('ROOM-ABC')).toBeInTheDocument()
        expect(screen.getByText('Room Created')).toBeInTheDocument()
      })
    })

    it('shows error when createRoom fails', async () => {
      mockCreateRoom.mockResolvedValueOnce({
        error: { message: 'Firestore write failed' },
      })

      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      )

      const inputs = screen.getAllByPlaceholderText(/name/i)
      fireEvent.change(inputs.find((i) => i.placeholder.match(/display name/i)), {
        target: { value: 'Bob' },
      })
      fireEvent.change(inputs.find((i) => i.placeholder.match(/room name/i)), {
        target: { value: 'Room' },
      })

      fireEvent.click(screen.getByRole('button', { name: /create room/i }))

      await waitFor(() => {
        expect(screen.getByText('Firestore write failed')).toBeInTheDocument()
      })
    })

    it('shows error when createRoom throws exception', async () => {
      mockCreateRoom.mockRejectedValueOnce(new Error('Network error'))

      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      )

      const inputs = screen.getAllByPlaceholderText(/name/i)
      fireEvent.change(inputs.find((i) => i.placeholder.match(/display name/i)), {
        target: { value: 'C' },
      })
      fireEvent.change(inputs.find((i) => i.placeholder.match(/room name/i)), {
        target: { value: 'R' },
      })

      fireEvent.click(screen.getByRole('button', { name: /create room/i }))

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })
  })

  // ─── Toast Navigation ──────────────────────────────────────────
  describe('Toast Navigation', () => {
    it('closing the toast navigates to /create', async () => {
      const setShow = vi.fn()

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              path="/"
              element={<Toast show={true} setShow={setShow} roomId="R123" />}
            />
            <Route path="/create" element={<div data-testid="create-page">Create</div>} />
          </Routes>
          <LocationDisplay />
        </MemoryRouter>
      )

      expect(screen.getByText('R123')).toBeInTheDocument()

      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(setShow).toHaveBeenCalledWith(false)

      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toBe('/create')
      })
    })
  })

  // ─── Join Room Flow ────────────────────────────────────────────
  describe('Join Room Flow', () => {
    it('joins room and navigates to /poll', async () => {
      mockJoinPoll.mockResolvedValueOnce({
        response: { success: true, userId: 'user-1', data: 'User registered successfully' },
      })

      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/poll" element={<div data-testid="poll-page">Poll</div>} />
        </Routes>
      )

      const allDisplayNames = screen.getAllByPlaceholderText('Your display name')
      const allRoomIds = screen.getAllByPlaceholderText('Room ID')

      fireEvent.change(allDisplayNames[1], { target: { value: 'Bob' } })
      fireEvent.change(allRoomIds[0], { target: { value: 'ROOM-XYZ' } })

      fireEvent.click(screen.getByRole('button', { name: /join room/i }))

      await waitFor(() => {
        expect(mockJoinPoll).toHaveBeenCalledWith('ROOM-XYZ', 'Bob')
      })

      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toBe('/poll')
      })
    })

    it('shows error when joinPoll returns an error', async () => {
      mockJoinPoll.mockResolvedValueOnce({
        error: { message: 'Room does not exist' },
      })

      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      )

      const allDisplayNames = screen.getAllByPlaceholderText('Your display name')
      const allRoomIds = screen.getAllByPlaceholderText('Room ID')

      fireEvent.change(allDisplayNames[1], { target: { value: 'Bob' } })
      fireEvent.change(allRoomIds[0], { target: { value: 'BAD-ROOM' } })

      fireEvent.click(screen.getByRole('button', { name: /join room/i }))

      await waitFor(() => {
        expect(screen.getByText('Room does not exist')).toBeInTheDocument()
      })
    })

    it('shows error when both fields are empty', async () => {
      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      )

      const allDisplayNames = screen.getAllByPlaceholderText('Your display name')
      const allRoomIds = screen.getAllByPlaceholderText('Room ID')

      fireEvent.change(allDisplayNames[1], { target: { value: '' } })
      fireEvent.change(allRoomIds[0], { target: { value: '' } })

      const joinBtn = screen.getByRole('button', { name: /join room/i })
      expect(joinBtn).toBeInTheDocument()
    })
  })
})
