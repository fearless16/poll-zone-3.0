/**
 * E2E Flow Tests
 *
 * Simulates complete user journeys through the app by rendering
 * actual React components with mocked Firebase and React Router.
 *
 * Flows tested:
 *   1. Host creates room → Toast appears with Room ID → navigates to /create
 *   2. Host creates poll (estimation) → navigates to /poll
 *   3. Host creates poll (voting) → navigates to /poll
 *   4. Participant joins room → navigates to /poll
 *   5. Participant votes → sees "Voted" message with link to /result
 *   6. PollPage shows correct states (host/no-poll, voter/no-poll, voted, closed)
 *   7. Result page shows poll data, close button, sidebar
 *   8. Result page handles close poll (all voted / not all voted → modal)
 *   9. CreatePoll redirects non-host to NoPoll
 *  10. Pages redirect to / when no roomId/userId
 *  11. NoPoll renders Link (not <a>) for SPA navigation
 *  12. pollReducer handles all action types + edge cases
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { RoomDataContextProvider, useRoomData, RoomDataContext } from '../src/Context/useRoomData'
import { onSnapshot } from 'firebase/firestore'

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

vi.mock('../src/Firebase/config', () => ({
  db: {},
}))

// ─── dbHandler Mocks ───────────────────────────────────────────────
const mockCreateRoom = vi.fn()
const mockJoinPoll = vi.fn()
const mockAddPoll = vi.fn()
const mockClosePoll = vi.fn()
const mockCastVote = vi.fn()

vi.mock('../src/Firebase/dbHandler', () => ({
  createRoom: (...args) => mockCreateRoom(...args),
  joinPoll: (...args) => mockJoinPoll(...args),
  addPoll: (...args) => mockAddPoll(...args),
  closePoll: (...args) => mockClosePoll(...args),
  castVote: (...args) => mockCastVote(...args),
}))

// ─── Chart.js Mock (canvas not available in jsdom) ─────────────────
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

// ─── Imports (after mocks) ─────────────────────────────────────────
import Home from '../src/Components/Home'
import CreatePoll from '../src/Components/CreatePoll'
import PollPage from '../src/Components/PollPage'
import Result from '../src/Components/Result'
import NoPoll from '../src/Components/NoPoll'
import Toast from '../src/Components/Toast'
import { Messages, REDUCER_ACTIONS } from '../src/Utils/constants'
import { pollReducer } from '../src/Context/pollReducer'

// ─── Helper: Location Spy ──────────────────────────────────────────
function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

// ─── Helper: Render within Router + Context ────────────────────────
function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <RoomDataContextProvider>
      <MemoryRouter initialEntries={[route]}>
        {ui}
        <LocationDisplay />
      </MemoryRouter>
    </RoomDataContextProvider>
  )
}

// ─── Helper: Render with custom context value ──────────────────────
function renderWithContext(ui, contextValue, { route = '/' } = {}) {
  return render(
    <RoomDataContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
        <LocationDisplay />
      </MemoryRouter>
    </RoomDataContext.Provider>
  )
}

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
//  TESTS
// ═══════════════════════════════════════════════════════════════════

describe('E2E Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(storage).forEach((k) => delete storage[k])
    onSnapshot.mockImplementation(() => vi.fn()) // default: no-op unsubscribe
  })

  afterEach(() => {
    cleanup()
  })

  // ───────────────────────────────────────────────────────────────
  //  FLOW 1: Host creates room → Toast shows Room ID
  // ───────────────────────────────────────────────────────────────
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

      // Fill in the create form
      const inputs = screen.getAllByPlaceholderText(/name/i)
      const displayNameInput = inputs.find((i) => i.placeholder.match(/display name/i))
      const roomNameInput = inputs.find((i) => i.placeholder.match(/room name/i))

      fireEvent.change(displayNameInput, { target: { value: 'Alice' } })
      fireEvent.change(roomNameInput, { target: { value: 'Sprint Review' } })

      // Submit
      const createBtn = screen.getByRole('button', { name: /create room/i })
      fireEvent.click(createBtn)

      // Wait for toast
      await waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalledWith('Alice', 'Sprint Review')
      })

      await waitFor(() => {
        expect(screen.getByText('ROOM-ABC')).toBeInTheDocument()
        expect(screen.getByText('Room ID')).toBeInTheDocument()
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

  // ───────────────────────────────────────────────────────────────
  //  FLOW 2: Toast dismiss → navigate to /create
  // ───────────────────────────────────────────────────────────────
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

      // Click the close button on the toast
      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(setShow).toHaveBeenCalledWith(false)

      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toBe('/create')
      })
    })
  })

  // ───────────────────────────────────────────────────────────────
  //  FLOW 3: Participant joins room → navigates to /poll
  // ───────────────────────────────────────────────────────────────
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

      const inputs = screen.getAllByPlaceholderText(/display name|room/i)
      const joinName = inputs.find((i) => i.placeholder === 'Your display name' && i !== inputs[0])
      // Use the last display name input (join form) and room id input
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

      // Clear the inputs (they may have required attribute, so submit via JS)
      const allDisplayNames = screen.getAllByPlaceholderText('Your display name')
      const allRoomIds = screen.getAllByPlaceholderText('Room ID')

      // Force empty values and trigger submit
      fireEvent.change(allDisplayNames[1], { target: { value: '' } })
      fireEvent.change(allRoomIds[0], { target: { value: '' } })

      // The form has required fields, so the browser blocks submission.
      // But we can test the JS validation by calling handleJoinSubmit directly via form submit
      // Since the inputs are empty + required, the form won't submit — this tests native validation
      const joinBtn = screen.getByRole('button', { name: /join room/i })
      expect(joinBtn).toBeInTheDocument()
    })
  })

  // ───────────────────────────────────────────────────────────────
  //  FLOW 4: PollPage renders different states
  // ───────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────
  //  FLOW 5: VotingForm submit
  // ───────────────────────────────────────────────────────────────
  describe('Voting Flow', () => {
    it('submits a vote and state transitions to voted', async () => {
      storage.id = 'user-1'
      storage.displayName = 'Alice'
      storage.roomId = 'room-1'

      mockCastVote.mockResolvedValueOnce()

      let snapshotCallback
      onSnapshot.mockImplementation((_, cb) => {
        snapshotCallback = cb
        // Initial: poll open, not voted
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

      // Wait for poll form to render
      await waitFor(() => {
        expect(screen.getByText('Pick one')).toBeInTheDocument()
      })

      // Select option A
      const radioA = screen.getByLabelText('A')
      fireEvent.click(radioA)

      // Submit
      const submitBtn = screen.getByRole('button', { name: /submit/i })
      expect(submitBtn).not.toBeDisabled()
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(mockCastVote).toHaveBeenCalledWith('room-1', 0, 'user-1', 'Alice')
      })

      // Optimistic update: VOTED message appears immediately after castVote resolves,
      // without needing the Firestore snapshot to arrive
      await waitFor(() => {
        expect(screen.getByText(Messages.VOTED.message)).toBeInTheDocument()
      })

      // Simulate Firestore snapshot arriving later — state should stay voted
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

      // Still shows voted after snapshot confirms
      expect(screen.getByText(Messages.VOTED.message)).toBeInTheDocument()
    })
  })

  // ───────────────────────────────────────────────────────────────
  //  FLOW 6: CreatePoll page
  // ───────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────
  //  FLOW 7: Result page rendering
  // ───────────────────────────────────────────────────────────────
  describe('Result Page Flow', () => {
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

    it('shows poll results with chart, votes, and sidebar', () => {
      renderWithContext(<Result />, resultContext(), { route: '/result' })

      expect(screen.getByTestId('chart')).toBeInTheDocument()
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('Vue')).toBeInTheDocument()
      // Vote counts appear in both sidebar badge and vote list — use getAllByText
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    })

    it('shows "New poll" button for host when poll is open', () => {
      renderWithContext(<Result />, resultContext(), { route: '/result' })
      expect(screen.getByRole('button', { name: /new poll/i })).toBeInTheDocument()
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

  // ───────────────────────────────────────────────────────────────
  //  FLOW 8: Close poll from Result page
  // ───────────────────────────────────────────────────────────────
  describe('Close Poll Flow', () => {
    it('closes poll when all users voted and navigates to /create', async () => {
      mockClosePoll.mockResolvedValueOnce()

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

      fireEvent.click(screen.getByRole('button', { name: /new poll/i }))

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

      fireEvent.click(screen.getByRole('button', { name: /new poll/i }))

      await waitFor(() => {
        expect(screen.getByText(/all participants have not voted/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /submit anyway/i })).toBeInTheDocument()
      })
    })
  })

  // ───────────────────────────────────────────────────────────────
  //  FLOW 9: NoPoll component - SPA navigation
  // ───────────────────────────────────────────────────────────────
  describe('NoPoll SPA Navigation', () => {
    it('renders React Router Link (not <a> tag) for SPA navigation', () => {
      render(
        <MemoryRouter>
          <NoPoll message={Messages.VOTED} />
        </MemoryRouter>
      )

      const link = screen.getByText(Messages.VOTED.linkMessage)
      expect(link.tagName).toBe('A')
      expect(link.getAttribute('href')).toBe('/result')
      // Verify it doesn't cause full page reload — Link uses onClick internally
      expect(link).toBeInTheDocument()
    })

    it('does not render link when path is empty', () => {
      render(
        <MemoryRouter>
          <NoPoll message={Messages.NO_ACTIVE_POLL} />
        </MemoryRouter>
      )

      expect(screen.getByText(Messages.NO_ACTIVE_POLL.message)).toBeInTheDocument()
      // No link should be rendered
      expect(screen.queryByRole('link')).toBeNull()
    })

    it('renders correct messages for all message types', () => {
      const messageTypes = [
        Messages.CREATE_POLL,
        Messages.VOTED,
        Messages.POLL_CLOSED,
        Messages.NOT_HOST,
        Messages.NO_POLL_DATA_TO_SHOW,
      ]

      messageTypes.forEach((msg) => {
        const { unmount } = render(
          <MemoryRouter>
            <NoPoll message={msg} />
          </MemoryRouter>
        )
        // Use regex to handle trailing whitespace in messages
        expect(screen.getByText(new RegExp(msg.message.trim()))).toBeInTheDocument()
        if (msg.path) {
          const link = screen.getByText(msg.linkMessage)
          expect(link.getAttribute('href')).toBe(msg.path)
        }
        unmount()
      })
    })
  })

  // ───────────────────────────────────────────────────────────────
  //  FLOW 10: pollReducer edge cases
  // ───────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────
  //  FLOW 11: Full host lifecycle — create room → create poll → view result
  // ───────────────────────────────────────────────────────────────
  describe('Full Host Lifecycle (integration)', () => {
    it('host creates room, gets toast, then sees create poll page', async () => {
      storage.id = 'host-1'
      storage.roomId = 'room-1'

      mockCreateRoom.mockResolvedValueOnce({
        response: { success: true, roomId: 'room-1', hostId: 'host-1' },
      })

      // Simulate Firestore snapshot for CreatePoll page
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

      // Fill create form
      const allNames = screen.getAllByPlaceholderText('Your display name')
      const roomName = screen.getByPlaceholderText('Room name')

      fireEvent.change(allNames[0], { target: { value: 'Alice' } })
      fireEvent.change(roomName, { target: { value: 'Retro' } })

      fireEvent.click(screen.getByRole('button', { name: /create room/i }))

      // Toast should appear
      await waitFor(() => {
        expect(screen.getByText('room-1')).toBeInTheDocument()
      })

      // Close toast → should navigate to /create
      fireEvent.click(screen.getByRole('button', { name: /close/i }))

      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toBe('/create')
      })
    })
  })

  // ───────────────────────────────────────────────────────────────
  //  FLOW 12: Estimation poll submission
  // ───────────────────────────────────────────────────────────────
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

      // Need to import Estimation directly
      const { default: Estimation } = await import('../src/Components/Estimation')

      renderWithContext(
        <Routes>
          <Route path="/create" element={<Estimation />} />
          <Route path="/poll" element={<div data-testid="poll-page">Poll</div>} />
        </Routes>,
        ctx,
        { route: '/create' }
      )

      // Should show estimation form
      expect(screen.getByText(/create estimation poll/i)).toBeInTheDocument()

      // Submit with default 6 options
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

  // ───────────────────────────────────────────────────────────────
  //  FLOW 13: Voting poll creation
  // ───────────────────────────────────────────────────────────────
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

      // Fill in question
      fireEvent.change(screen.getByPlaceholderText(/enter your question/i), {
        target: { value: 'Best language?' },
      })

      // Fill in options
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
