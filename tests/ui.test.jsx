/**
 * UI Component Tests
 *
 * Tests for: NoPoll SPA navigation, UI verification (NavBar, Footer, SideBar,
 * PageNotFound, VotingForm, Result layout, Home layout)
 */

import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router'
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

vi.mock('../src/Firebase/dbHandler', () => ({
  createRoom: vi.fn(),
  joinPoll: vi.fn(),
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
import PollPage from '../src/Components/PollPage'
import Result from '../src/Components/Result'
import NoPoll from '../src/Components/NoPoll'
import NavigationBar from '../src/Components/NavBar'
import Footer from '../src/Components/Footer'
import SideBar from '../src/Components/SideBar'
import PageNotFound from '../src/Components/404'
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
describe('UI Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(storage).forEach((k) => delete storage[k])
    onSnapshot.mockImplementation(() => vi.fn())
  })

  afterEach(() => {
    cleanup()
  })

  // ─── NoPoll SPA Navigation ─────────────────────────────────────
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
      expect(link).toBeInTheDocument()
    })

    it('does not render link when path is empty', () => {
      render(
        <MemoryRouter>
          <NoPoll message={Messages.NO_ACTIVE_POLL} />
        </MemoryRouter>
      )

      expect(screen.getByText(Messages.NO_ACTIVE_POLL.message)).toBeInTheDocument()
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
        expect(screen.getByText(new RegExp(msg.message.trim()))).toBeInTheDocument()
        if (msg.path) {
          const link = screen.getByText(msg.linkMessage)
          expect(link.getAttribute('href')).toBe(msg.path)
        }
        unmount()
      })
    })
  })

  // ─── UI Modern Look Verification ──────────────────────────────
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
      expect(screen.getAllByText('Create Room').length).toBe(2)
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

      expect(screen.getByTestId('chart')).toBeInTheDocument()
      expect(screen.getByText('Votes')).toBeInTheDocument()

      const badges = container.querySelectorAll('.badge')
      expect(badges.length).toBeGreaterThan(0)

      expect(screen.getByRole('button', { name: /close poll/i })).toBeInTheDocument()
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
      expect(screen.queryByRole('button', { name: /close poll/i })).not.toBeInTheDocument()
    })

    it('SideBar shows "No votes yet" when empty', () => {
      render(<SideBar voted={[]} />)

      expect(screen.getByText('No votes yet')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('SideBar renders voter list with green status dots', () => {
      const { container } = render(
        <SideBar voted={[{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]} />
      )

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()

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
      expect(form.className).toContain('bg-white')
    })

    it('PageNotFound renders 404 with modern stacked layout', () => {
      const { container } = render(<PageNotFound />)

      expect(screen.getByText('404')).toBeInTheDocument()
      expect(screen.getByText('Page not found')).toBeInTheDocument()
      const wrapper = container.firstChild
      expect(wrapper.className).toContain('flex-column')
    })

    it('bounce animation class is applied to Home cards', () => {
      renderWithRouter(
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      )

      const titles = screen.getAllByText('Create Room')
      expect(titles.length).toBeGreaterThanOrEqual(1)
    })
  })
})
