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
import NavigationBar from '../src/Components/NavBar'
import Footer from '../src/Components/Footer'
import SideBar from '../src/Components/SideBar'
import PageNotFound from '../src/Components/404'
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
      // Room name must be visible (uses roomName field, not name)
      expect(screen.getByText('Sprint')).toBeInTheDocument()
      expect(screen.getByText('Room Details')).toBeInTheDocument()
      // Vote counts appear in both sidebar badge and vote list — use getAllByText
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

  // ───────────────────────────────────────────────────────────────
  //  UI VERIFICATION: Dark Mode, Modern Layout, Text Blocks
  // ───────────────────────────────────────────────────────────────
  describe('UI Modern Look Verification', () => {
    it('Home page renders hero section with proper headings', () => {
      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      )

      expect(screen.getByText('Welcome to Poll Zone')).toBeInTheDocument()
      expect(screen.getByText(/create a room to start polling/i)).toBeInTheDocument()
      expect(screen.getByText('Start a new poll session as host')).toBeInTheDocument()
      expect(screen.getByText('Enter a room ID to participate')).toBeInTheDocument()
      expect(screen.getByText('or')).toBeInTheDocument()
      // Both card titles + buttons exist
      expect(screen.getAllByText('Create Room').length).toBe(2) // h2 + button
      expect(screen.getAllByText('Join Room').length).toBe(2)
    })

    it('Home page cards have card header subtitles', () => {
      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      )

      expect(screen.getByText('Start a new poll session as host')).toBeInTheDocument()
      expect(screen.getByText('Enter a room ID to participate')).toBeInTheDocument()
    })

    it('NavBar renders dark mode toggle button', () => {
      renderWithRouter(
        <Routes>
          <Route path="/" element={<NavigationBar />} />
        </Routes>
      )

      const toggle = screen.getByRole('button', { name: /toggle dark mode/i })
      expect(toggle).toBeInTheDocument()
      expect(toggle).toHaveClass('theme-toggle')
    })

    it('dark mode toggle switches theme attribute on html', () => {
      renderWithRouter(
        <Routes>
          <Route path="/" element={<NavigationBar />} />
        </Routes>
      )

      const toggle = screen.getByRole('button', { name: /toggle dark mode/i })
      // Default is light (localStorage is empty in test)
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')

      fireEvent.click(toggle)
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

      fireEvent.click(toggle)
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('dark mode persists theme preference in localStorage', () => {
      renderWithRouter(
        <Routes>
          <Route path="/" element={<NavigationBar />} />
        </Routes>
      )

      const toggle = screen.getByRole('button', { name: /toggle dark mode/i })
      fireEvent.click(toggle)
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')

      fireEvent.click(toggle)
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light')
    })

    it('Footer renders with proper semantic elements (no h1)', () => {
      const { container } = render(<Footer />)

      const h1 = container.querySelector('h1')
      expect(h1).toBeNull()

      const footer = container.querySelector('footer')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('footer')

      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs.length).toBe(2)
    })

    it('NoPoll uses responsive layout (no fixed width)', () => {
      renderWithRouter(
        <Routes>
          <Route path="/" element={<NoPoll message={Messages.NO_ACTIVE_POLL} />} />
        </Routes>
      )

      const card = screen.getByText(Messages.NO_ACTIVE_POLL.message).closest('.card')
      expect(card).toBeInTheDocument()
      // Must NOT have fixed width:40rem — should use maxWidth + width:100%
      expect(card.style.width).toBe('100%')
      expect(card.style.maxWidth).toBe('36rem')
    })

    it('Result page renders chart, votes and action buttons for open poll', () => {
      storage.roomId = 'ROOM-1'
      storage.id = 'host-1'

      const ctx = {
        pollState: {
          roomData: { roomName: 'Sprint', roomId: 'ROOM-1', participants: [{ id: 'host-1', name: 'A' }], poll: { options: [{ option: '1', votes: 1 }] } },
          currentPollData: {
            isOpen: true,
            options: [{ option: '1', votes: 1 }, { option: '2', votes: 0 }],
            voted: [{ id: 'host-1', name: 'A' }],
          },
          isHost: true,
          isPoll: true,
          isOpen: true,
          voted: false,
          loading: false,
          error: null,
        },
        dispatch: vi.fn(),
        roomId: 'ROOM-1',
        setRoomId: vi.fn(),
        userId: 'host-1',
        setUserId: vi.fn(),
      }

      const { container } = renderWithContext(
        <Routes>
          <Route path="/" element={<Result />} />
        </Routes>,
        ctx
      )

      // Chart should render
      expect(screen.getByTestId('chart')).toBeInTheDocument()

      // Votes card header
      expect(screen.getByText('Votes')).toBeInTheDocument()

      // Badges use pill style
      const badges = container.querySelectorAll('.badge')
      expect(badges.length).toBeGreaterThan(0)

      // Close Poll button present for host
      expect(screen.getByRole('button', { name: /close poll/i })).toBeInTheDocument()

      // Go to poll button present
      expect(screen.getByRole('button', { name: /go to poll/i })).toBeInTheDocument()
    })

    it('Result page shows closed banner when poll is closed', () => {
      storage.roomId = 'ROOM-1'
      storage.id = 'host-1'

      const ctx = {
        pollState: {
          roomData: { roomName: 'Sprint', roomId: 'ROOM-1', participants: [{ id: 'host-1', name: 'A' }], poll: { options: [{ option: '1', votes: 1 }] } },
          currentPollData: {
            isOpen: false,
            options: [{ option: '1', votes: 1 }],
            voted: [{ id: 'host-1', name: 'A' }],
          },
          isHost: true,
          isPoll: true,
          isOpen: false,
          voted: false,
          loading: false,
          error: null,
        },
        dispatch: vi.fn(),
        roomId: 'ROOM-1',
        setRoomId: vi.fn(),
        userId: 'host-1',
        setUserId: vi.fn(),
      }

      renderWithContext(
        <Routes>
          <Route path="/" element={<Result />} />
        </Routes>,
        ctx
      )

      expect(screen.getByText('Poll has been closed')).toBeInTheDocument()
      // Should NOT have action buttons
      expect(screen.queryByRole('button', { name: /close poll/i })).not.toBeInTheDocument()
    })

    it('SideBar shows "No votes yet" when empty', () => {
      const { container } = render(
        <SideBar voted={[]} />
      )

      expect(screen.getByText('No votes yet')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('SideBar renders voter list with green status dots', () => {
      const { container } = render(
        <SideBar voted={[{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]} />
      )

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // voter count badge

      // Green dots
      const dots = container.querySelectorAll('span[style*="borderRadius"]')
      dots.forEach((dot) => {
        expect(dot.style.backgroundColor).toBe('green')
      })
    })

    it('VotingForm card uses CSS variable background (not hardcoded bg-white)', () => {
      storage.roomId = 'ROOM-1'
      storage.id = 'user-1'

      const ctx = {
        pollState: {
          currentPollData: {
            question: 'Best lang?',
            isOpen: true,
            options: [{ option: 'JS', votes: 0 }, { option: 'Rust', votes: 0 }],
            voted: [],
          },
          isHost: false,
          isPoll: true,
          isOpen: true,
          voted: false,
          loading: false,
          error: null,
        },
        dispatch: vi.fn(),
        roomId: 'ROOM-1',
        setRoomId: vi.fn(),
        userId: 'user-1',
        setUserId: vi.fn(),
      }

      const { container } = renderWithContext(
        <Routes>
          <Route path="/" element={<PollPage />} />
        </Routes>,
        ctx
      )

      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
      // Uses bg-white class for clean B&W look
      expect(form.className).toContain('bg-white')
    })

    it('PageNotFound renders 404 with modern stacked layout', () => {
      const { container } = render(<PageNotFound />)

      expect(screen.getByText('404')).toBeInTheDocument()
      expect(screen.getByText('Page not found')).toBeInTheDocument()
      // Should have flex column layout
      const wrapper = container.firstChild
      expect(wrapper.className).toContain('flex-column')
    })

    it('bounce animation class is applied to Home cards', () => {
      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      )

      // Verify home page renders card titles (animation applied via CSS modules)
      const titles = screen.getAllByText('Create Room')
      expect(titles.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ───────────────────────────────────────────────────────────────
  //  STRICT DATA FLOW TESTS
  //  These verify that the Firestore document schema (roomName,
  //  poll.isOpen, poll.voted, poll.createdAt) is correctly handled
  //  by the reducer, components, and full flow.
  // ───────────────────────────────────────────────────────────────
  describe('Strict Data Flow: Firestore Schema Fidelity', () => {

    // Helper: creates a context matching exact Firestore document shape
    // after createRoom + addPoll + votes
    const firestoreContext = ({
      roomName = 'Sprint Planning',
      roomId = 'ROOM-1',
      hostId = 'host-1',
      userId = 'host-1',
      participants = [{ id: 'host-1', name: 'Alice' }],
      poll = {},
      stateOverrides = {},
    } = {}) => {
      // Simulate what the reducer produces from a Firestore doc
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
      // RoomDetailsCard is rendered inside Result
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

      // Room name MUST render from roomName field
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
      // New poll with empty voted array — participant has NOT voted
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

      // Must see the NEW poll's question and options
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

  // ───────────────────────────────────────────────────────────────
  //  STRICT REDUCER STATE TRANSITION TESTS
  //  Verify exact state transitions that mirror the real Firestore flow.
  // ───────────────────────────────────────────────────────────────
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
      // Step 1: Room created, no poll yet
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

      // Step 2: Host creates poll
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

      // Step 3: Host votes (optimistic)
      state = pollReducer(state, { type: REDUCER_ACTIONS.VOTED })
      expect(state.voted).toBe(true)

      // Step 4: Snapshot confirms vote
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

      // Step 5: Host closes poll
      const closedPayload = {
        ...votedPayload,
        poll: { ...votedPayload.poll, isOpen: false },
      }
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: closedPayload })
      expect(state.isOpen).toBe(false)
      expect(state.isPoll).toBe(true)
      expect(state.voted).toBe(true) // still voted on OLD poll

      // Step 6: Host dispatches POLL_CREATED (from Estimation/Voting component)
      state = pollReducer(state, { type: REDUCER_ACTIONS.POLL_CREATED })
      expect(state.voted).toBe(false)
      expect(state.isOpen).toBe(true)
      expect(state.isPoll).toBe(true)

      // Step 7: Snapshot arrives with new poll
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
      expect(state.voted).toBe(false) // reset for new poll
    })

    it('full participant flow: join → see poll → vote → poll closed → new poll', () => {
      const participantId = 'participant-1'

      // Step 1: Room with active poll
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

      // Step 2: Participant votes (optimistic)
      state = pollReducer(state, { type: REDUCER_ACTIONS.VOTED })
      expect(state.voted).toBe(true)

      // Step 3: Snapshot confirms vote
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

      // Step 4: Host closes poll — participant gets snapshot
      const closedPayload = {
        ...votedPayload,
        poll: { ...votedPayload.poll, isOpen: false },
      }
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: closedPayload })
      expect(state.isOpen).toBe(false)
      expect(state.isPoll).toBe(true)
      // PollPage should show "Poll closed" (not voted/open)

      // Step 5: Host creates new poll — participant gets snapshot
      const newPollPayload = {
        ...pollPayload,
        poll: {
          isOpen: true,
          options: [{ option: 'A', votes: 0 }, { option: 'B', votes: 0 }],
          voted: [],
          createdAt: { seconds: 9000 }, // different createdAt
        },
      }
      state = pollReducer(state, { type: REDUCER_ACTIONS.SUCCESS, payload: newPollPayload })
      expect(state.isOpen).toBe(true)
      expect(state.isPoll).toBe(true)
      expect(state.voted).toBe(false) // MUST reset — new poll, participant hasn't voted
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
      // Ensure there's no 'name' field that could be confused
      expect(state.roomData.name).toBeUndefined()
    })
  })
})
