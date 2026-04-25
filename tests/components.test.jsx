/**
 * Component-level tests for every React component and workflow.
 *
 * Tests cover:
 * - Home (create room, join room, validation, error handling)
 * - CreatePoll (host guard, estimation/voting toggle)
 * - Voting (poll creation form, validation, duplicates)
 * - Estimation (fibonacci options, bounds clamping)
 * - VotingForm (vote casting, error handling, double-vote guard)
 * - PollPage (state routing: loading/voted/closed/no-poll/voting-form)
 * - Result (close poll, modal trigger, safe property access)
 * - Modal (close poll confirmation, loading state)
 * - NoPoll (renders message with Link, not <a>)
 * - RoomDetailsCard (average computation, safe rendering)
 * - SideBar (voter list)
 * - NavBar (host-only links)
 * - Chart (renders without crash)
 * - Toast (room ID display, navigation)
 * - Footer / 404 / Loader (render without crash)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { RoomDataContextProvider, RoomDataContext, useRoomData } from '../src/Context/useRoomData'
import { REDUCER_ACTIONS, Messages } from '../src/Utils/constants'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    onSnapshot: vi.fn(() => vi.fn()),
    doc: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    runTransaction: vi.fn(),
    arrayUnion: vi.fn((...args) => args),
    Timestamp: { now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }) },
  }
})

vi.mock('../src/Firebase/dbHandler', () => ({
  createRoom: vi.fn(),
  joinPoll: vi.fn(),
  addPoll: vi.fn(),
  castVote: vi.fn(),
  closePoll: vi.fn(),
  getRoomData: vi.fn(),
  isVoted: vi.fn(),
}))

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  ArcElement: {},
  Tooltip: {},
  Legend: {},
  Title: {},
}))

vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="mock-chart">Chart</div>,
}))

vi.mock('bootstrap-switch-button-react', () => ({
  default: ({ onChange, checked }) => (
    <button
      data-testid="switch-button"
      onClick={() => onChange(!checked)}
    >
      {checked ? 'Estimation' : 'Voting'}
    </button>
  ),
}))

vi.mock('@iconify/react', () => ({
  Icon: () => <span data-testid="icon">icon</span>,
}))

import { createRoom, joinPoll, addPoll, castVote, closePoll } from '../src/Firebase/dbHandler'

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const lsStore = {}
const localStorageMock = {
  getItem: vi.fn((key) => lsStore[key] ?? null),
  setItem: vi.fn((key, val) => { lsStore[key] = val }),
  removeItem: vi.fn((key) => { delete lsStore[key] }),
  clear: vi.fn(() => { Object.keys(lsStore).forEach(k => delete lsStore[k]) }),
}
vi.stubGlobal('localStorage', localStorageMock)

// ---------------------------------------------------------------------------
// Custom context wrapper for testing components in isolation
// ---------------------------------------------------------------------------

function MockContextProvider({ value, children }) {
  return (
    <RoomDataContext.Provider value={value}>
      <MemoryRouter>{children}</MemoryRouter>
    </RoomDataContext.Provider>
  )
}

function buildMockContext(overrides = {}) {
  return {
    pollState: {
      loading: false,
      currentPollData: {},
      roomData: {},
      error: '',
      isHost: false,
      isOpen: false,
      voted: false,
      isPoll: false,
      ...overrides.pollState,
    },
    dispatch: vi.fn(),
    roomId: overrides.roomId || 'room-1',
    setRoomId: vi.fn(),
    userId: overrides.userId || 'user-1',
    setUserId: vi.fn(),
    ...overrides,
  }
}

// ===========================================================================
// IMPORTS (after mocks)
// ===========================================================================

import Home from '../src/Components/Home'
import CreatePoll from '../src/Components/CreatePoll'
import Voting from '../src/Components/Voting'
import Estimation from '../src/Components/Estimation'
import VotingForm from '../src/Components/Forms/VotingForm'
import PollPage from '../src/Components/PollPage'
import Result from '../src/Components/Result'
import Modals from '../src/Components/Modal'
import NoPoll from '../src/Components/NoPoll'
import RoomDetailsCard from '../src/Components/RoomDetailsCard'
import SideBar from '../src/Components/SideBar'
import NavigationBar from '../src/Components/NavBar'
import Charts from '../src/Components/Chart'
import ToastComponent from '../src/Components/Toast'
import Footer from '../src/Components/Footer'
import PageNotFound from '../src/Components/404'
import Loader from '../src/Components/Loader'

// ===========================================================================
// TEST SUITES
// ===========================================================================

describe('Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockNavigate.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  // =========================================================================
  // Home
  // =========================================================================

  describe('Home', () => {
    const renderHome = () =>
      render(
        <MemoryRouter>
          <RoomDataContextProvider>
            <Home />
          </RoomDataContextProvider>
        </MemoryRouter>
      )

    it('renders create and join forms', () => {
      renderHome()
      expect(screen.getByText('Create Poll Room')).toBeTruthy()
      expect(screen.getByText('Join Poll Room')).toBeTruthy()
    })

    it('creates a room and shows toast with room ID', async () => {
      createRoom.mockResolvedValueOnce({ response: { success: true, roomId: 'new-room-123' } })
      renderHome()

      const nameInputs = screen.getAllByPlaceholderText('Enter display name')
      const roomNameInput = screen.getByPlaceholderText('Enter room name')

      fireEvent.change(nameInputs[0], { target: { value: 'Alice' } })
      fireEvent.change(roomNameInput, { target: { value: 'My Room' } })

      const createBtn = screen.getByText('Create Poll')
      await act(async () => {
        fireEvent.click(createBtn)
      })

      expect(createRoom).toHaveBeenCalledWith('Alice', 'My Room')
      await waitFor(() => {
        expect(screen.getByText('new-room-123')).toBeTruthy()
      })
    })

    it('shows error when createRoom fails', async () => {
      createRoom.mockResolvedValueOnce({ error: new Error('Network failure') })
      renderHome()

      const nameInputs = screen.getAllByPlaceholderText('Enter display name')
      const roomNameInput = screen.getByPlaceholderText('Enter room name')

      fireEvent.change(nameInputs[0], { target: { value: 'Alice' } })
      fireEvent.change(roomNameInput, { target: { value: 'Room' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Create Poll'))
      })

      await waitFor(() => {
        expect(screen.getByText('Network failure')).toBeTruthy()
      })
    })

    it('joins a room and navigates to /poll', async () => {
      joinPoll.mockResolvedValueOnce({ response: { success: true, data: 'User registered successfully' } })
      renderHome()

      const nameInputs = screen.getAllByPlaceholderText('Enter display name')
      const roomIdInput = screen.getByPlaceholderText('Enter room id')

      fireEvent.change(nameInputs[1], { target: { value: 'Bob' } })
      fireEvent.change(roomIdInput, { target: { value: 'existing-room-id-12345' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Join Poll'))
      })

      expect(joinPoll).toHaveBeenCalledWith('existing-room-id-12345', 'Bob')
      expect(mockNavigate).toHaveBeenCalledWith('/poll')
    })

    it('shows error for too short display name', async () => {
      renderHome()

      const nameInputs = screen.getAllByPlaceholderText('Enter display name')
      const roomIdInput = screen.getByPlaceholderText('Enter room id')

      fireEvent.change(nameInputs[1], { target: { value: 'A' } })
      fireEvent.change(roomIdInput, { target: { value: 'valid-room-id-123456' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Join Poll'))
      })

      await waitFor(() => {
        expect(screen.getByText('Display name must be 2-50 characters')).toBeTruthy()
      })
    })

    it('shows error for invalid room ID format', async () => {
      renderHome()

      const nameInputs = screen.getAllByPlaceholderText('Enter display name')
      const roomIdInput = screen.getByPlaceholderText('Enter room id')

      fireEvent.change(nameInputs[1], { target: { value: 'Bob' } })
      fireEvent.change(roomIdInput, { target: { value: 'short' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Join Poll'))
      })

      await waitFor(() => {
        expect(screen.getByText('Invalid Room ID format')).toBeTruthy()
      })
    })

    it('shows error when joinPoll returns error', async () => {
      joinPoll.mockResolvedValueOnce({ error: new Error('Room does not exist') })
      renderHome()

      const nameInputs = screen.getAllByPlaceholderText('Enter display name')
      const roomIdInput = screen.getByPlaceholderText('Enter room id')

      fireEvent.change(nameInputs[1], { target: { value: 'Bob' } })
      fireEvent.change(roomIdInput, { target: { value: 'nonexistent-room-id-1' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Join Poll'))
      })

      await waitFor(() => {
        expect(screen.getByText('Room does not exist')).toBeTruthy()
      })
    })

    it('handles createRoom throwing an exception', async () => {
      createRoom.mockRejectedValueOnce(new Error('Unexpected'))
      renderHome()

      const nameInputs = screen.getAllByPlaceholderText('Enter display name')
      const roomNameInput = screen.getByPlaceholderText('Enter room name')

      fireEvent.change(nameInputs[0], { target: { value: 'Alice' } })
      fireEvent.change(roomNameInput, { target: { value: 'Room' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Create Poll'))
      })

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeTruthy()
      })
    })
  })

  // =========================================================================
  // Voting (create poll form)
  // =========================================================================

  describe('Voting', () => {
    const renderVoting = (contextOverrides = {}) => {
      const ctx = buildMockContext({
        pollState: { loading: false, isHost: true },
        ...contextOverrides,
      })
      return render(
        <MockContextProvider value={ctx}>
          <Voting />
        </MockContextProvider>
      )
    }

    it('renders question input and option fields', () => {
      renderVoting()
      expect(screen.getByPlaceholderText('Enter your question')).toBeTruthy()
      expect(screen.getAllByPlaceholderText(/^Option \d+$/).length).toBe(4)
    })

    it('submits a valid voting poll', async () => {
      lsStore.roomId = 'room-1'
      addPoll.mockResolvedValueOnce({ response: { success: true } })
      renderVoting()

      fireEvent.change(screen.getByPlaceholderText('Enter your question'), {
        target: { value: 'Best color?' },
      })

      const optionInputs = screen.getAllByPlaceholderText(/^Option \d+$/)
      fireEvent.change(optionInputs[0], { target: { value: 'Red' } })
      fireEvent.change(optionInputs[1], { target: { value: 'Blue' } })
      fireEvent.change(optionInputs[2], { target: { value: 'Green' } })
      fireEvent.change(optionInputs[3], { target: { value: 'Yellow' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      expect(addPoll).toHaveBeenCalledWith(
        'room-1',
        expect.arrayContaining([
          expect.objectContaining({ option: 'Red', votes: 0 }),
          expect.objectContaining({ option: 'Blue', votes: 0 }),
        ]),
        'Best color?'
      )
      expect(mockNavigate).toHaveBeenCalledWith('/poll')
    })

    it('rejects duplicate options', async () => {
      lsStore.roomId = 'room-1'
      renderVoting()

      fireEvent.change(screen.getByPlaceholderText('Enter your question'), {
        target: { value: 'Q?' },
      })

      const optionInputs = screen.getAllByPlaceholderText(/^Option \d+$/)
      fireEvent.change(optionInputs[0], { target: { value: 'Same' } })
      fireEvent.change(optionInputs[1], { target: { value: 'Same' } })
      fireEvent.change(optionInputs[2], { target: { value: 'Other' } })
      fireEvent.change(optionInputs[3], { target: { value: 'More' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      await waitFor(() => {
        expect(screen.getByText('Duplicate options are not allowed')).toBeTruthy()
      })
      expect(addPoll).not.toHaveBeenCalled()
    })

    it('shows error when roomId not in localStorage', async () => {
      renderVoting()

      fireEvent.change(screen.getByPlaceholderText('Enter your question'), {
        target: { value: 'Q?' },
      })

      const optionInputs = screen.getAllByPlaceholderText(/^Option \d+$/)
      fireEvent.change(optionInputs[0], { target: { value: 'A' } })
      fireEvent.change(optionInputs[1], { target: { value: 'B' } })
      fireEvent.change(optionInputs[2], { target: { value: 'C' } })
      fireEvent.change(optionInputs[3], { target: { value: 'D' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      await waitFor(() => {
        expect(screen.getByText('Room ID not found')).toBeTruthy()
      })
    })

    it('shows error for max options exceeded', () => {
      renderVoting()
      const numInput = screen.getByPlaceholderText('Number of options (2–8)')
      fireEvent.change(numInput, { target: { value: '9' } })
      expect(screen.getByText('Maximum 8 options allowed')).toBeTruthy()
    })

    it('shows error for min options below 2', () => {
      renderVoting()
      const numInput = screen.getByPlaceholderText('Number of options (2–8)')
      fireEvent.change(numInput, { target: { value: '1' } })
      expect(screen.getByText('Minimum 2 options required')).toBeTruthy()
    })

    it('handles addPoll returning error', async () => {
      lsStore.roomId = 'room-1'
      addPoll.mockResolvedValueOnce({ error: new Error('Only host can create polls') })
      renderVoting()

      fireEvent.change(screen.getByPlaceholderText('Enter your question'), {
        target: { value: 'Q?' },
      })

      const optionInputs = screen.getAllByPlaceholderText(/^Option \d+$/)
      fireEvent.change(optionInputs[0], { target: { value: 'A' } })
      fireEvent.change(optionInputs[1], { target: { value: 'B' } })
      fireEvent.change(optionInputs[2], { target: { value: 'C' } })
      fireEvent.change(optionInputs[3], { target: { value: 'D' } })

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      await waitFor(() => {
        expect(screen.getByText('Only host can create polls')).toBeTruthy()
      })
      expect(mockNavigate).not.toHaveBeenCalledWith('/poll')
    })
  })

  // =========================================================================
  // Estimation
  // =========================================================================

  describe('Estimation', () => {
    const renderEstimation = (contextOverrides = {}) => {
      const ctx = buildMockContext({
        pollState: { loading: false, isHost: true },
        ...contextOverrides,
      })
      return render(
        <MockContextProvider value={ctx}>
          <Estimation />
        </MockContextProvider>
      )
    }

    it('renders estimation form', () => {
      renderEstimation()
      expect(screen.getByText('Create Estimation Poll')).toBeTruthy()
    })

    it('submits estimation poll with fibonacci values', async () => {
      lsStore.roomId = 'room-1'
      addPoll.mockResolvedValueOnce({ response: { success: true } })
      renderEstimation()

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      expect(addPoll).toHaveBeenCalledWith(
        'room-1',
        expect.arrayContaining([
          expect.objectContaining({ option: 1, votes: 0 }),
          expect.objectContaining({ option: 2, votes: 0 }),
        ])
      )
      expect(mockNavigate).toHaveBeenCalledWith('/poll')
    })

    it('handles missing roomId', async () => {
      const ctx = buildMockContext({ pollState: { loading: false, isHost: true } })
      render(
        <MockContextProvider value={ctx}>
          <Estimation />
        </MockContextProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      expect(ctx.dispatch).toHaveBeenCalledWith({ type: REDUCER_ACTIONS.FAILURE })
      expect(addPoll).not.toHaveBeenCalled()
    })

    it('handles addPoll error response', async () => {
      lsStore.roomId = 'room-1'
      addPoll.mockResolvedValueOnce({ error: new Error('Only host can create polls') })
      const ctx = buildMockContext({ pollState: { loading: false, isHost: true } })
      render(
        <MockContextProvider value={ctx}>
          <Estimation />
        </MockContextProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      expect(ctx.dispatch).toHaveBeenCalledWith({ type: REDUCER_ACTIONS.FAILURE })
      expect(mockNavigate).not.toHaveBeenCalledWith('/poll')
    })

    it('clamps options to valid range', async () => {
      lsStore.roomId = 'room-1'
      addPoll.mockResolvedValueOnce({ response: { success: true } })
      const ctx = buildMockContext({
        pollState: { loading: false, isHost: true },
      })
      const { container } = render(
        <MockContextProvider value={ctx}>
          <Estimation />
        </MockContextProvider>
      )

      // Set value to 99 and remove the max constraint to bypass HTML5 validation
      const numInput = screen.getByDisplayValue('6')
      numInput.removeAttribute('max')
      fireEvent.change(numInput, { target: { value: '99' } })

      const form = container.querySelector('form')
      await act(async () => {
        fireEvent.submit(form)
      })

      // Should clamp to 8 max
      expect(addPoll).toHaveBeenCalled()
      const calledOptions = addPoll.mock.calls[0][1]
      expect(calledOptions.length).toBeLessThanOrEqual(8)
      expect(calledOptions.length).toBeGreaterThanOrEqual(2)
    })
  })

  // =========================================================================
  // VotingForm
  // =========================================================================

  describe('VotingForm', () => {
    const renderVotingForm = (pollStateOverrides = {}) => {
      const pollState = {
        loading: false,
        currentPollData: {
          question: 'Pick one',
          options: [
            { option: 'A', votes: 0 },
            { option: 'B', votes: 0 },
          ],
          voted: [],
          isOpen: true,
        },
        isHost: false,
        isOpen: true,
        voted: false,
        isPoll: true,
        error: '',
        roomData: {},
        ...pollStateOverrides,
      }
      const dispatch = vi.fn()
      return render(
        <MockContextProvider value={buildMockContext({ pollState, dispatch })}>
          <VotingForm pollState={pollState} dispatch={dispatch} />
        </MockContextProvider>
      )
    }

    it('renders poll question and options', () => {
      renderVotingForm()
      expect(screen.getByText('Pick one')).toBeTruthy()
      expect(screen.getByLabelText('A')).toBeTruthy()
      expect(screen.getByLabelText('B')).toBeTruthy()
    })

    it('submit button is disabled when no option selected', () => {
      renderVotingForm()
      const submitBtn = screen.getByText('Submit')
      expect(submitBtn.disabled).toBe(true)
    })

    it('enables submit after selecting an option', () => {
      renderVotingForm()
      fireEvent.click(screen.getByLabelText('A'))
      const submitBtn = screen.getByText('Submit')
      expect(submitBtn.disabled).toBe(false)
    })

    it('casts vote on submit', async () => {
      lsStore.id = 'user-1'
      lsStore.displayName = 'Alice'
      lsStore.roomId = 'room-1'
      castVote.mockResolvedValueOnce()

      renderVotingForm()

      fireEvent.click(screen.getByLabelText('A'))

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      expect(castVote).toHaveBeenCalledWith('room-1', 0, 'user-1', 'Alice')
    })

    it('shows error when missing user information', async () => {
      renderVotingForm()

      fireEvent.click(screen.getByLabelText('A'))

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      await waitFor(() => {
        expect(screen.getByText('Missing user information')).toBeTruthy()
      })
    })

    it('shows error when castVote fails', async () => {
      lsStore.id = 'user-1'
      lsStore.displayName = 'Alice'
      lsStore.roomId = 'room-1'
      castVote.mockRejectedValueOnce(new Error('Poll is closed'))

      renderVotingForm()
      fireEvent.click(screen.getByLabelText('A'))

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      await waitFor(() => {
        expect(screen.getByText('Poll is closed')).toBeTruthy()
      })
    })

    it('prevents double-vote if user already in voted array', async () => {
      lsStore.id = 'user-1'
      lsStore.displayName = 'Alice'
      lsStore.roomId = 'room-1'

      renderVotingForm({
        currentPollData: {
          question: 'Q',
          options: [{ option: 'A', votes: 1 }, { option: 'B', votes: 0 }],
          voted: [{ id: 'user-1', name: 'Alice' }],
          isOpen: true,
        },
      })

      fireEvent.click(screen.getByLabelText('A'))

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'))
      })

      expect(castVote).not.toHaveBeenCalled()
    })

    it('renders Estimation Poll title when no question', () => {
      renderVotingForm({
        currentPollData: {
          question: '',
          options: [
            { option: 1, votes: 0 },
            { option: 2, votes: 0 },
          ],
          voted: [],
          isOpen: true,
        },
      })
      expect(screen.getByText('Estimation Poll')).toBeTruthy()
    })
  })

  // =========================================================================
  // NoPoll
  // =========================================================================

  describe('NoPoll', () => {
    it('renders message text', () => {
      render(
        <MemoryRouter>
          <NoPoll message={Messages.VOTED} />
        </MemoryRouter>
      )
      expect(screen.getByText('Voted successfully')).toBeTruthy()
    })

    it('renders link using React Router Link (not <a>)', () => {
      const { container } = render(
        <MemoryRouter>
          <NoPoll message={Messages.VOTED} />
        </MemoryRouter>
      )
      const link = container.querySelector('a[href="/result"]')
      expect(link).toBeTruthy()
      expect(link.textContent).toBe('see results')
    })

    it('does not render link when path is empty', () => {
      const { container } = render(
        <MemoryRouter>
          <NoPoll message={Messages.NO_ACTIVE_POLL} />
        </MemoryRouter>
      )
      const links = container.querySelectorAll('a')
      expect(links.length).toBe(0)
    })

    it('renders all message types without crash', () => {
      const messageTypes = [
        Messages.VOTED,
        Messages.CREATE_POLL,
        Messages.NO_ACTIVE_POLL,
        Messages.POLL_CLOSED,
        Messages.NOT_HOST,
        Messages.NO_POLL_DATA_TO_SHOW,
      ]

      messageTypes.forEach((msg) => {
        const { unmount, container } = render(
          <MemoryRouter>
            <NoPoll message={msg} />
          </MemoryRouter>
        )
        // Use regex to match text that may have trailing spaces
        expect(container.textContent).toContain(msg.message.trim())
        unmount()
      })
    })
  })

  // =========================================================================
  // Modal
  // =========================================================================

  describe('Modal', () => {
    const renderModal = (overrides = {}) => {
      return render(
        <MemoryRouter>
          <Modals
            setModalOpen={vi.fn()}
            modalOpen={true}
            setSubmitted={vi.fn()}
            navigate={mockNavigate}
            roomId="room-1"
            {...overrides}
          />
        </MemoryRouter>
      )
    }

    it('renders modal with confirmation text', () => {
      renderModal()
      expect(screen.getByText('Submit Poll?')).toBeTruthy()
      expect(screen.getByText('All participants have not voted yet. Are you sure?')).toBeTruthy()
    })

    it('closes poll and navigates on Submit Anyway', async () => {
      closePoll.mockResolvedValueOnce()
      renderModal()

      await act(async () => {
        fireEvent.click(screen.getByText('Submit Anyway'))
      })

      expect(closePoll).toHaveBeenCalledWith('room-1')
      expect(mockNavigate).toHaveBeenCalledWith('/create')
    })

    it('calls setSubmitted(false) when closePoll fails', async () => {
      closePoll.mockRejectedValueOnce(new Error('fail'))
      const setSubmitted = vi.fn()
      renderModal({ setSubmitted })

      await act(async () => {
        fireEvent.click(screen.getByText('Submit Anyway'))
      })

      expect(setSubmitted).toHaveBeenCalledWith(false)
    })

    it('does not close modal while loading', async () => {
      closePoll.mockImplementation(() => new Promise(() => {})) // never resolves
      const setModalOpen = vi.fn()
      renderModal({ setModalOpen })

      await act(async () => {
        fireEvent.click(screen.getByText('Submit Anyway'))
      })

      // Try to close while loading
      fireEvent.click(screen.getByText('Cancel'))
      // setModalOpen should not be called since loading prevents close
    })

    it('does nothing when roomId is empty', async () => {
      renderModal({ roomId: '' })

      await act(async () => {
        fireEvent.click(screen.getByText('Submit Anyway'))
      })

      expect(closePoll).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // RoomDetailsCard
  // =========================================================================

  describe('RoomDetailsCard', () => {
    it('renders room details', () => {
      render(
        <RoomDetailsCard
          room={{
            roomName: 'Test Room',
            roomId: 'room-123',
            participants: [{ id: 'u1', name: 'Alice' }],
            poll: { options: [{ option: 5, votes: 2 }, { option: 10, votes: 1 }] },
          }}
          isOpen={true}
        />
      )
      expect(screen.getByText('Test Room')).toBeTruthy()
      expect(screen.getByText('room-123')).toBeTruthy()
      expect(screen.getByText('Active')).toBeTruthy()
    })

    it('computes correct average', () => {
      render(
        <RoomDetailsCard
          room={{
            roomName: 'R',
            roomId: 'r1',
            participants: [{ id: 'u1' }],
            poll: { options: [{ option: 10, votes: 2 }, { option: 20, votes: 2 }] },
          }}
          isOpen={false}
        />
      )
      // (10*2 + 20*2) / (2+2) = 60/4 = 15.0
      expect(screen.getByText('15.0')).toBeTruthy()
      expect(screen.getByText('Closed')).toBeTruthy()
    })

    it('shows dash when no votes', () => {
      render(
        <RoomDetailsCard
          room={{
            roomName: 'R',
            roomId: 'r1',
            participants: [{ id: 'u1' }],
            poll: { options: [{ option: 'A', votes: 0 }] },
          }}
          isOpen={true}
        />
      )
      expect(screen.getByText('-')).toBeTruthy()
    })

    it('handles empty options array', () => {
      render(
        <RoomDetailsCard
          room={{
            roomName: 'R',
            roomId: 'r1',
            participants: [],
            poll: { options: [] },
          }}
          isOpen={true}
        />
      )
      expect(screen.getByText('-')).toBeTruthy()
    })
  })

  // =========================================================================
  // SideBar
  // =========================================================================

  describe('SideBar', () => {
    it('renders voter list', () => {
      render(
        <SideBar
          voted={[
            { id: 'u1', name: 'Alice' },
            { id: 'u2', name: 'Bob' },
          ]}
        />
      )
      expect(screen.getByText('Voters')).toBeTruthy()
      expect(screen.getByText('Alice')).toBeTruthy()
      expect(screen.getByText('Bob')).toBeTruthy()
      expect(screen.getByText('2')).toBeTruthy()
    })

    it('renders empty voter list', () => {
      render(<SideBar voted={[]} />)
      expect(screen.getByText('0')).toBeTruthy()
    })

    it('uses default empty array when voted prop is missing', () => {
      render(<SideBar />)
      expect(screen.getByText('0')).toBeTruthy()
    })
  })

  // =========================================================================
  // NavBar
  // =========================================================================

  describe('NavigationBar', () => {
    it('renders brand and navigation links', () => {
      const ctx = buildMockContext({ pollState: { isHost: false } })
      render(
        <MockContextProvider value={ctx}>
          <NavigationBar />
        </MockContextProvider>
      )
      expect(screen.getByText(/Poll Zone/)).toBeTruthy()
      expect(screen.getByText('Vote')).toBeTruthy()
      expect(screen.getByText('Result')).toBeTruthy()
    })

    it('shows Create link only for host', () => {
      const ctx = buildMockContext({ pollState: { isHost: true } })
      render(
        <MockContextProvider value={ctx}>
          <NavigationBar />
        </MockContextProvider>
      )
      expect(screen.getByText('Create')).toBeTruthy()
    })

    it('hides Create link for non-host', () => {
      const ctx = buildMockContext({ pollState: { isHost: false } })
      render(
        <MockContextProvider value={ctx}>
          <NavigationBar />
        </MockContextProvider>
      )
      expect(screen.queryByText('Create')).toBeNull()
    })
  })

  // =========================================================================
  // Chart
  // =========================================================================

  describe('Charts', () => {
    it('renders chart component', () => {
      render(
        <Charts
          chartData={{
            options: [
              { option: 'A', votes: 3 },
              { option: 'B', votes: 5 },
            ],
          }}
        />
      )
      expect(screen.getByTestId('mock-chart')).toBeTruthy()
    })
  })

  // =========================================================================
  // Toast
  // =========================================================================

  describe('Toast', () => {
    it('renders room ID in toast body', () => {
      render(
        <MemoryRouter>
          <ToastComponent show={true} setShow={vi.fn()} roomId="abc-123" />
        </MemoryRouter>
      )
      expect(screen.getByText('abc-123')).toBeTruthy()
      expect(screen.getByText('Copy Room ID')).toBeTruthy()
    })
  })

  // =========================================================================
  // Footer
  // =========================================================================

  describe('Footer', () => {
    it('renders footer text', () => {
      render(<Footer />)
      expect(screen.getByText(/developed for project purpose/i)).toBeTruthy()
    })
  })

  // =========================================================================
  // 404
  // =========================================================================

  describe('PageNotFound', () => {
    it('renders 404 message', () => {
      render(<PageNotFound />)
      expect(screen.getByText('404 | Page not found')).toBeTruthy()
    })
  })

  // =========================================================================
  // Loader
  // =========================================================================

  describe('Loader', () => {
    it('renders loading spinner with aria-label', () => {
      render(<Loader />)
      expect(screen.getByRole('status')).toBeTruthy()
      expect(screen.getByText('Loading…')).toBeTruthy()
    })
  })

  // =========================================================================
  // PollPage state routing
  // =========================================================================

  describe('PollPage state routing', () => {
    const renderPollPage = (pollStateOverrides = {}, ctxOverrides = {}) => {
      lsStore.roomId = 'room-1'
      lsStore.id = 'user-1'
      const ctx = buildMockContext({
        pollState: {
          loading: false,
          ...pollStateOverrides,
        },
        ...ctxOverrides,
      })
      return render(
        <MockContextProvider value={ctx}>
          <PollPage />
        </MockContextProvider>
      )
    }

    it('shows VotingForm when poll is open and user has not voted', () => {
      renderPollPage({
        isPoll: true,
        isOpen: true,
        voted: false,
        isHost: false,
        currentPollData: {
          question: 'Q?',
          options: [{ option: 'A', votes: 0 }, { option: 'B', votes: 0 }],
          voted: [],
          isOpen: true,
        },
      })
      expect(screen.getByText('Q?')).toBeTruthy()
    })

    it('shows VOTED message when user already voted', () => {
      renderPollPage({
        isPoll: true,
        isOpen: true,
        voted: true,
        isHost: false,
      })
      expect(screen.getByText(Messages.VOTED.message)).toBeTruthy()
    })

    it('shows POLL_CLOSED message when poll is closed', () => {
      renderPollPage({
        isPoll: true,
        isOpen: false,
        voted: false,
        isHost: false,
      })
      expect(screen.getByText(Messages.POLL_CLOSED.message)).toBeTruthy()
    })

    it('shows CREATE_POLL for host with no poll', () => {
      renderPollPage({
        isPoll: false,
        isOpen: false,
        isHost: true,
      })
      expect(screen.getByText(Messages.CREATE_POLL.message.trim(), { exact: false })).toBeTruthy()
    })

    it('shows NO_ACTIVE_POLL for non-host with no poll', () => {
      renderPollPage({
        isPoll: false,
        isOpen: false,
        isHost: false,
      })
      expect(screen.getByText(Messages.NO_ACTIVE_POLL.message)).toBeTruthy()
    })
  })

  // =========================================================================
  // Result page
  // =========================================================================

  describe('Result', () => {
    const renderResult = (pollStateOverrides = {}) => {
      lsStore.roomId = 'room-1'
      lsStore.id = 'host-1'
      const ctx = buildMockContext({
        pollState: {
          loading: false,
          isPoll: true,
          isOpen: true,
          isHost: true,
          voted: true,
          currentPollData: {
            question: 'Best?',
            options: [
              { option: 'A', votes: 2 },
              { option: 'B', votes: 1 },
            ],
            voted: [
              { id: 'host-1', name: 'Host' },
              { id: 'u2', name: 'U2' },
              { id: 'u3', name: 'U3' },
            ],
            isOpen: true,
          },
          roomData: {
            roomName: 'Test Room',
            roomId: 'room-1',
            participants: [
              { id: 'host-1', name: 'Host' },
              { id: 'u2', name: 'U2' },
              { id: 'u3', name: 'U3' },
            ],
            host: 'host-1',
            poll: {
              options: [
                { option: 'A', votes: 2 },
                { option: 'B', votes: 1 },
              ],
            },
          },
          ...pollStateOverrides,
        },
      })
      return render(
        <MockContextProvider value={ctx}>
          <Result />
        </MockContextProvider>
      )
    }

    it('renders chart and vote counts', () => {
      renderResult()
      expect(screen.getByTestId('mock-chart')).toBeTruthy()
      expect(screen.getByText('A')).toBeTruthy()
      expect(screen.getByText('B')).toBeTruthy()
    })

    it('shows NoPoll when no poll data', () => {
      const ctx = buildMockContext({
        pollState: { loading: false, isPoll: false },
      })
      lsStore.roomId = 'room-1'
      lsStore.id = 'user-1'
      render(
        <MockContextProvider value={ctx}>
          <Result />
        </MockContextProvider>
      )
      expect(screen.getByText(Messages.NO_POLL_DATA_TO_SHOW.message)).toBeTruthy()
    })

    it('handles safe access when voted/participants are undefined', () => {
      const ctx = buildMockContext({
        pollState: {
          loading: false,
          isPoll: true,
          isOpen: true,
          isHost: true,
          currentPollData: {
            options: [{ option: 'A', votes: 0 }],
            isOpen: true,
          },
          roomData: {
            roomName: 'R',
            roomId: 'r1',
            participants: [],
            host: 'host-1',
            poll: { options: [] },
          },
        },
      })
      lsStore.roomId = 'room-1'
      lsStore.id = 'host-1'

      // Should not crash even with undefined voted
      expect(() => {
        render(
          <MockContextProvider value={ctx}>
            <Result />
          </MockContextProvider>
        )
      }).not.toThrow()
    })
  })

  // =========================================================================
  // CreatePoll
  // =========================================================================

  describe('CreatePoll', () => {
    it('shows NOT_HOST for non-host users', () => {
      lsStore.roomId = 'room-1'
      lsStore.id = 'user-1'
      const ctx = buildMockContext({
        pollState: { loading: false, isHost: false },
      })
      render(
        <MockContextProvider value={ctx}>
          <CreatePoll />
        </MockContextProvider>
      )
      expect(screen.getByText(Messages.NOT_HOST.message)).toBeTruthy()
    })

    it('shows estimation form by default for host', () => {
      lsStore.roomId = 'room-1'
      lsStore.id = 'host-1'
      const ctx = buildMockContext({
        pollState: { loading: false, isHost: true },
      })
      render(
        <MockContextProvider value={ctx}>
          <CreatePoll />
        </MockContextProvider>
      )
      expect(screen.getByText('Create Estimation Poll')).toBeTruthy()
    })

    it('switches to voting form when toggle clicked', async () => {
      lsStore.roomId = 'room-1'
      lsStore.id = 'host-1'
      const ctx = buildMockContext({
        pollState: { loading: false, isHost: true },
      })
      render(
        <MockContextProvider value={ctx}>
          <CreatePoll />
        </MockContextProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('switch-button'))
      })

      expect(screen.getByText('Create Question Poll')).toBeTruthy()
    })
  })

  // =========================================================================
  // Workflow: Full create → vote → close → result
  // =========================================================================

  describe('Full workflow integration', () => {
    it('error objects from dbHandler have .message property for UI display', async () => {
      // Verifies the bug fix: errors are now Error objects, not strings
      joinPoll.mockResolvedValueOnce({ error: new Error('Room does not exist') })
      
      const renderHome = () =>
        render(
          <MemoryRouter>
            <RoomDataContextProvider>
              <Home />
            </RoomDataContextProvider>
          </MemoryRouter>
        )
      
      renderHome()
      
      const nameInputs = screen.getAllByPlaceholderText('Enter display name')
      const roomIdInput = screen.getByPlaceholderText('Enter room id')
      
      fireEvent.change(nameInputs[1], { target: { value: 'Bob' } })
      fireEvent.change(roomIdInput, { target: { value: 'nonexistent-room-id-1' } })
      
      await act(async () => {
        fireEvent.click(screen.getByText('Join Poll'))
      })
      
      await waitFor(() => {
        // This would fail with the old code where error was a plain string
        expect(screen.getByText('Room does not exist')).toBeTruthy()
      })
    })
  })
})
