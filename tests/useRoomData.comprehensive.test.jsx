import React, { useEffect, useState } from 'react'
import { render, waitFor, act, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RoomDataContextProvider, useRoomData } from '../src/Context/useRoomData'
import { onSnapshot } from 'firebase/firestore'

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    onSnapshot: vi.fn(),
    doc: vi.fn(),
  }
})

// ---------------------------------------------------------------------------
// Test Components
// ---------------------------------------------------------------------------

/** Renders full pollState as JSON for assertions */
function StateInspector({ skipSet = false, userId = 'user-1', roomId = 'room-1' }) {
  const { pollState, setRoomId, setUserId } = useRoomData()

  useEffect(() => {
    if (!skipSet) {
      setRoomId(roomId)
      setUserId(userId)
    }
  }, [skipSet, roomId, userId, setRoomId, setUserId])

  return (
    <div>
      <span data-testid="loading">{String(pollState.loading)}</span>
      <span data-testid="isHost">{String(pollState.isHost)}</span>
      <span data-testid="isOpen">{String(pollState.isOpen)}</span>
      <span data-testid="voted">{String(pollState.voted)}</span>
      <span data-testid="isPoll">{String(pollState.isPoll)}</span>
      <span data-testid="error">{pollState.error}</span>
      <span data-testid="question">{pollState.currentPollData?.question || ''}</span>
      <span data-testid="votedCount">
        {pollState.currentPollData?.voted?.length ?? 0}
      </span>
    </div>
  )
}

/** Captures snapshot callback for manual triggering */
let capturedSnapshotCb = null
function setupSnapshotCapture() {
  onSnapshot.mockImplementation((_, cb) => {
    capturedSnapshotCb = cb
    return vi.fn() // unsubscribe
  })
}

function fireSnapshot(data, opts = {}) {
  const { exists = true, hasPendingWrites = false } = opts
  capturedSnapshotCb({
    exists: () => exists,
    data: () => data,
    metadata: { hasPendingWrites },
  })
}

// ===========================================================================
// TEST SUITES
// ===========================================================================

describe('useRoomData – comprehensive integration tests', () => {
  beforeEach(() => {
    capturedSnapshotCb = null
    cleanup()
  })

  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  // =========================================================================
  // Subscription lifecycle
  // =========================================================================

  describe('subscription lifecycle', () => {
    it('does not subscribe until roomId and userId are set', () => {
      render(
        <RoomDataContextProvider>
          <StateInspector skipSet />
        </RoomDataContextProvider>
      )
      expect(onSnapshot).not.toHaveBeenCalled()
    })

    it('subscribes when roomId and userId are provided', async () => {
      const unsubMock = vi.fn()
      onSnapshot.mockReturnValue(unsubMock)

      render(
        <RoomDataContextProvider>
          <StateInspector />
        </RoomDataContextProvider>
      )

      await waitFor(() => {
        expect(onSnapshot).toHaveBeenCalledTimes(1)
      })
    })

    it('unsubscribes on unmount', async () => {
      const unsubMock = vi.fn()
      onSnapshot.mockReturnValue(unsubMock)

      const { unmount } = render(
        <RoomDataContextProvider>
          <StateInspector />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(onSnapshot).toHaveBeenCalled())
      unmount()
      expect(unsubMock).toHaveBeenCalled()
    })

    it('resubscribes when roomId changes', async () => {
      const unsub1 = vi.fn()
      const unsub2 = vi.fn()
      let callCount = 0
      onSnapshot.mockImplementation(() => {
        callCount++
        return callCount === 1 ? unsub1 : unsub2
      })

      function DynamicRoom() {
        const [room, setRoom] = useState('room-1')
        return (
          <>
            <button data-testid="switch" onClick={() => setRoom('room-2')}>
              Switch
            </button>
            <StateInspector roomId={room} />
          </>
        )
      }

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <DynamicRoom />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1))

      act(() => {
        getByTestId('switch').click()
      })

      await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(2))
      expect(unsub1).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Snapshot processing
  // =========================================================================

  describe('snapshot processing', () => {
    it('dispatches SUCCESS for valid snapshot with poll data', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector userId="host-1" />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      act(() => {
        fireSnapshot({
          poll: { question: 'Q1', options: [], voted: [], isOpen: true },
          host: 'host-1',
          participants: [{ id: 'host-1', name: 'Host' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('loading').textContent).toBe('false')
        expect(getByTestId('question').textContent).toBe('Q1')
        expect(getByTestId('isHost').textContent).toBe('true')
        expect(getByTestId('isOpen').textContent).toBe('true')
        expect(getByTestId('voted').textContent).toBe('false')
        expect(getByTestId('isPoll').textContent).toBe('true')
      })
    })

    it('dispatches FAILURE when document does not exist', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      act(() => {
        fireSnapshot(null, { exists: false })
      })

      await waitFor(() => {
        expect(getByTestId('error').textContent).toBeTruthy()
      })
    })

    it('dispatches FAILURE when poll field is missing', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      act(() => {
        fireSnapshot({ host: 'h1', participants: [] })
      })

      await waitFor(() => {
        expect(getByTestId('error').textContent).toBeTruthy()
      })
    })

    it('skips snapshots with pending writes', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      act(() => {
        fireSnapshot(
          {
            poll: { question: 'Pending', options: [], voted: [], isOpen: true },
            host: 'h1',
            participants: [],
          },
          { hasPendingWrites: true }
        )
      })

      // Should NOT update question since pending writes are skipped
      await waitFor(() => {
        expect(getByTestId('question').textContent).toBe('')
      })
    })

    it('processes snapshot after pending write resolves', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      // First snapshot: pending (skipped)
      act(() => {
        fireSnapshot(
          {
            poll: { question: 'Pending', options: [], voted: [], isOpen: true },
            host: 'h1',
            participants: [],
          },
          { hasPendingWrites: true }
        )
      })

      await waitFor(() => {
        expect(getByTestId('question').textContent).toBe('')
      })

      // Second snapshot: confirmed
      act(() => {
        fireSnapshot({
          poll: { question: 'Confirmed', options: [], voted: [], isOpen: true },
          host: 'h1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('question').textContent).toBe('Confirmed')
      })
    })
  })

  // =========================================================================
  // Voting flow state transitions via snapshots
  // =========================================================================

  describe('voting flow via real-time snapshots', () => {
    it('transitions from "no poll" → "open poll" → "voted" via snapshots', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector userId="user-1" />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      // Snapshot 1: no poll
      act(() => {
        fireSnapshot({
          poll: {},
          host: 'host-1',
          participants: [{ id: 'user-1' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('isPoll').textContent).toBe('false')
        expect(getByTestId('isOpen').textContent).toBe('false')
      })

      // Snapshot 2: host creates poll
      act(() => {
        fireSnapshot({
          poll: {
            question: 'Pick one',
            options: [
              { option: 'A', votes: 0 },
              { option: 'B', votes: 0 },
            ],
            voted: [],
            isOpen: true,
            type: 'voting',
          },
          host: 'host-1',
          participants: [{ id: 'user-1' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('isPoll').textContent).toBe('true')
        expect(getByTestId('isOpen').textContent).toBe('true')
        expect(getByTestId('voted').textContent).toBe('false')
        expect(getByTestId('question').textContent).toBe('Pick one')
      })

      // Snapshot 3: user-1 votes
      act(() => {
        fireSnapshot({
          poll: {
            question: 'Pick one',
            options: [
              { option: 'A', votes: 1 },
              { option: 'B', votes: 0 },
            ],
            voted: [{ id: 'user-1', name: 'User 1' }],
            isOpen: true,
            type: 'voting',
          },
          host: 'host-1',
          participants: [{ id: 'user-1' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('voted').textContent).toBe('true')
        expect(getByTestId('isOpen').textContent).toBe('true')
        expect(getByTestId('votedCount').textContent).toBe('1')
      })
    })

    it('simulates 100 users voting via sequential snapshots', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector userId="user-0" />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      // Initial poll
      act(() => {
        fireSnapshot({
          poll: {
            question: 'Scale?',
            options: [{ option: '1', votes: 0 }, { option: '2', votes: 0 }],
            voted: [],
            isOpen: true,
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('voted').textContent).toBe('false')
      })

      // Simulate 100 votes arriving via snapshots
      for (let i = 0; i < 100; i++) {
        const voted = Array.from({ length: i + 1 }, (_, j) => ({
          id: `user-${j}`,
          name: `User ${j}`,
        }))

        act(() => {
          fireSnapshot({
            poll: {
              question: 'Scale?',
              options: [
                { option: '1', votes: Math.floor((i + 1) / 2) },
                { option: '2', votes: Math.ceil((i + 1) / 2) },
              ],
              voted,
              isOpen: true,
            },
            host: 'host-1',
            participants: [],
          })
        })
      }

      // After all 100 snapshots, user-0 should be voted
      await waitFor(() => {
        expect(getByTestId('voted').textContent).toBe('true')
        expect(getByTestId('votedCount').textContent).toBe('100')
      })
    })

    it('vote page does NOT reappear after user has voted', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector userId="user-1" />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      // User votes
      act(() => {
        fireSnapshot({
          poll: {
            question: 'Q',
            options: [{ option: 'A', votes: 1 }],
            voted: [{ id: 'user-1' }],
            isOpen: true,
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('voted').textContent).toBe('true')
      })

      // More users vote – user-1 should STAY voted
      for (let i = 2; i <= 50; i++) {
        act(() => {
          fireSnapshot({
            poll: {
              question: 'Q',
              options: [{ option: 'A', votes: i }],
              voted: [
                { id: 'user-1' },
                ...Array.from({ length: i - 1 }, (_, j) => ({
                  id: `user-${j + 2}`,
                })),
              ],
              isOpen: true,
            },
            host: 'host-1',
            participants: [],
          })
        })

        // CRITICAL: voted must NEVER flip back to false
        expect(getByTestId('voted').textContent).toBe('true')
      }
    })

    it('transitions from open → closed via snapshot', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector userId="user-1" />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      // Open poll
      act(() => {
        fireSnapshot({
          poll: {
            question: 'Q',
            options: [{ option: 'A', votes: 5 }],
            voted: [{ id: 'user-1' }],
            isOpen: true,
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('isOpen').textContent).toBe('true')
      })

      // Poll closed
      act(() => {
        fireSnapshot({
          poll: {
            question: 'Q',
            options: [{ option: 'A', votes: 5 }],
            voted: [{ id: 'user-1' }],
            isOpen: false,
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('isOpen').textContent).toBe('false')
        expect(getByTestId('isPoll').textContent).toBe('true')
      })
    })
  })

  // =========================================================================
  // Host vs non-host
  // =========================================================================

  describe('host vs non-host detection', () => {
    it('correctly identifies the host user', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector userId="host-1" />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      act(() => {
        fireSnapshot({
          poll: { question: 'Q', options: [], voted: [], isOpen: true },
          host: 'host-1',
          participants: [{ id: 'host-1' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('isHost').textContent).toBe('true')
      })
    })

    it('correctly identifies a non-host user', async () => {
      setupSnapshotCapture()

      const { getByTestId } = render(
        <RoomDataContextProvider>
          <StateInspector userId="regular-user" />
        </RoomDataContextProvider>
      )

      await waitFor(() => expect(capturedSnapshotCb).not.toBeNull())

      act(() => {
        fireSnapshot({
          poll: { question: 'Q', options: [], voted: [], isOpen: true },
          host: 'host-1',
          participants: [{ id: 'regular-user' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('isHost').textContent).toBe('false')
      })
    })
  })
})
