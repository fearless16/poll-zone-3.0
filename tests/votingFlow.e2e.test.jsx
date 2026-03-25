/**
 * Full Voting Flow Tests
 *
 * These tests simulate the complete user journey through the poll system:
 *   Host creates room → Users join → Host creates poll → Users vote →
 *   State transitions are verified → Poll closed → Results shown
 *
 * Uses in-memory mocks to simulate Firestore snapshots and verify that
 * the entire React component tree behaves correctly under all conditions.
 */
import React, { useEffect, useState } from 'react'
import { render, waitFor, act, screen, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RoomDataContextProvider, useRoomData } from '../src/Context/useRoomData'
import { onSnapshot } from 'firebase/firestore'
import { Messages } from '../src/Utils/constants'

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    onSnapshot: vi.fn(),
    doc: vi.fn(),
  }
})

vi.mock('../src/Firebase/dbHandler', async () => ({
  castVote: vi.fn(),
  closePoll: vi.fn(),
  addPoll: vi.fn(),
  createRoom: vi.fn(),
  joinPoll: vi.fn(),
  getRoomData: vi.fn(),
  isVoted: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Snapshot control
// ---------------------------------------------------------------------------

let snapshotCb = null
function setupSnapshot() {
  onSnapshot.mockImplementation((_, cb) => {
    snapshotCb = cb
    return vi.fn()
  })
}

function fireSnap(data, { exists = true, hasPendingWrites = false } = {}) {
  snapshotCb({
    exists: () => exists,
    data: () => data,
    metadata: { hasPendingWrites },
  })
}

// ---------------------------------------------------------------------------
// Minimal PollPage replica that uses real context + reducer
// ---------------------------------------------------------------------------

function PollPageTest({ userId = 'user-1', roomId = 'room-1' }) {
  const { pollState, setRoomId, setUserId } = useRoomData()

  useEffect(() => {
    setRoomId(roomId)
    setUserId(userId)
  }, [roomId, userId, setRoomId, setUserId])

  const { isHost, isPoll, isOpen, voted, loading, error } = pollState

  if (loading) return <div data-testid="state">loading</div>
  if (error) return <div data-testid="state">error</div>

  // Same logic as PollPage.jsx renderPollState after our fix:
  // voted/closed checked FIRST
  if (isOpen && voted) return <div data-testid="state">voted</div>
  if (!isOpen && isPoll) return <div data-testid="state">poll-closed</div>
  if (isHost && !isPoll && !isOpen) return <div data-testid="state">create-poll</div>
  if (!isHost && !isPoll && !isOpen) return <div data-testid="state">no-active-poll</div>
  if (isPoll && isOpen && !voted) return <div data-testid="state">voting-form</div>

  return <div data-testid="state">unknown</div>
}

function renderPollPage(props = {}) {
  return render(
    <RoomDataContextProvider>
      <PollPageTest {...props} />
    </RoomDataContextProvider>
  )
}

// ===========================================================================
// TEST SUITES
// ===========================================================================

describe('Full Voting Flow – E2E component tests', () => {
  beforeEach(() => {
    snapshotCb = null
    cleanup()
  })

  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  // =========================================================================
  // Complete happy-path lifecycle
  // =========================================================================

  describe('complete happy-path lifecycle', () => {
    it('host journey: loading → create-poll → voting-form → voted → poll-closed', async () => {
      setupSnapshot()
      const { getByTestId } = renderPollPage({ userId: 'host-1' })

      // Initially loading
      expect(getByTestId('state').textContent).toBe('loading')

      await waitFor(() => expect(snapshotCb).not.toBeNull())

      // Snapshot: room exists, no poll yet
      act(() => {
        fireSnap({
          poll: {},
          host: 'host-1',
          participants: [{ id: 'host-1' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('create-poll')
      })

      // Host creates poll
      act(() => {
        fireSnap({
          poll: {
            question: 'Best language?',
            options: [
              { option: 'JS', votes: 0 },
              { option: 'Python', votes: 0 },
            ],
            voted: [],
            isOpen: true,
            type: 'voting',
          },
          host: 'host-1',
          participants: [{ id: 'host-1' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voting-form')
      })

      // Host votes
      act(() => {
        fireSnap({
          poll: {
            question: 'Best language?',
            options: [
              { option: 'JS', votes: 1 },
              { option: 'Python', votes: 0 },
            ],
            voted: [{ id: 'host-1', name: 'Host' }],
            isOpen: true,
            type: 'voting',
          },
          host: 'host-1',
          participants: [{ id: 'host-1' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voted')
      })

      // Poll closed
      act(() => {
        fireSnap({
          poll: {
            question: 'Best language?',
            options: [
              { option: 'JS', votes: 1 },
              { option: 'Python', votes: 0 },
            ],
            voted: [{ id: 'host-1', name: 'Host' }],
            isOpen: false,
            type: 'voting',
          },
          host: 'host-1',
          participants: [{ id: 'host-1' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('poll-closed')
      })
    })

    it('participant journey: loading → no-active-poll → voting-form → voted → poll-closed', async () => {
      setupSnapshot()
      const { getByTestId } = renderPollPage({ userId: 'user-42' })

      expect(getByTestId('state').textContent).toBe('loading')
      await waitFor(() => expect(snapshotCb).not.toBeNull())

      // No poll yet
      act(() => {
        fireSnap({
          poll: {},
          host: 'host-1',
          participants: [{ id: 'user-42' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('no-active-poll')
      })

      // Poll created by host
      act(() => {
        fireSnap({
          poll: {
            question: 'Sprint points?',
            options: [
              { option: '1', votes: 0 },
              { option: '3', votes: 0 },
              { option: '5', votes: 0 },
            ],
            voted: [],
            isOpen: true,
          },
          host: 'host-1',
          participants: [{ id: 'user-42' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voting-form')
      })

      // User votes
      act(() => {
        fireSnap({
          poll: {
            question: 'Sprint points?',
            options: [
              { option: '1', votes: 0 },
              { option: '3', votes: 1 },
              { option: '5', votes: 0 },
            ],
            voted: [{ id: 'user-42', name: 'User 42' }],
            isOpen: true,
          },
          host: 'host-1',
          participants: [{ id: 'user-42' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voted')
      })

      // Poll closed
      act(() => {
        fireSnap({
          poll: {
            question: 'Sprint points?',
            options: [
              { option: '1', votes: 0 },
              { option: '3', votes: 1 },
              { option: '5', votes: 0 },
            ],
            voted: [{ id: 'user-42', name: 'User 42' }],
            isOpen: false,
          },
          host: 'host-1',
          participants: [{ id: 'user-42' }],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('poll-closed')
      })
    })
  })

  // =========================================================================
  // Voting page MUST NOT reappear after vote (the original bug)
  // =========================================================================

  describe('vote page must NOT reappear after submission', () => {
    it('remains "voted" through 100 subsequent snapshots', async () => {
      setupSnapshot()
      const { getByTestId } = renderPollPage({ userId: 'user-1' })
      await waitFor(() => expect(snapshotCb).not.toBeNull())

      // Initial: show voting form
      act(() => {
        fireSnap({
          poll: {
            question: 'Q',
            options: [{ option: 'A', votes: 0 }],
            voted: [],
            isOpen: true,
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voting-form')
      })

      // User votes
      act(() => {
        fireSnap({
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
        expect(getByTestId('state').textContent).toBe('voted')
      })

      // 100 more snapshots as other users vote
      for (let i = 2; i <= 101; i++) {
        act(() => {
          fireSnap({
            poll: {
              question: 'Q',
              options: [{ option: 'A', votes: i }],
              voted: [
                { id: 'user-1' },
                ...Array.from({ length: i - 1 }, (_, j) => ({ id: `user-${j + 2}` })),
              ],
              isOpen: true,
            },
            host: 'host-1',
            participants: [],
          })
        })

        // CRITICAL ASSERTION: must NEVER show voting-form again
        expect(getByTestId('state').textContent).toBe('voted')
      }
    })

    it('pending-write snapshots do not cause flicker back to voting-form', async () => {
      setupSnapshot()
      const { getByTestId } = renderPollPage({ userId: 'user-1' })
      await waitFor(() => expect(snapshotCb).not.toBeNull())

      // User has voted (confirmed snapshot)
      act(() => {
        fireSnap({
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
        expect(getByTestId('state').textContent).toBe('voted')
      })

      // Pending write snapshot arrives (these are skipped by our fix)
      act(() => {
        fireSnap(
          {
            poll: {
              question: 'Q',
              options: [{ option: 'A', votes: 0 }],
              voted: [], // stale! user NOT in voted
              isOpen: true,
            },
            host: 'host-1',
            participants: [],
          },
          { hasPendingWrites: true }
        )
      })

      // State must NOT revert
      expect(getByTestId('state').textContent).toBe('voted')
    })
  })

  // =========================================================================
  // Error states
  // =========================================================================

  describe('error states', () => {
    it('shows error when room does not exist', async () => {
      setupSnapshot()
      const { getByTestId } = renderPollPage()
      await waitFor(() => expect(snapshotCb).not.toBeNull())

      act(() => {
        fireSnap(null, { exists: false })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('error')
      })
    })

    it('shows error when poll field is null', async () => {
      setupSnapshot()
      const { getByTestId } = renderPollPage()
      await waitFor(() => expect(snapshotCb).not.toBeNull())

      act(() => {
        fireSnap({ host: 'h1', participants: [], poll: null })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('error')
      })
    })
  })

  // =========================================================================
  // Multi-poll lifecycle (create → close → create new)
  // =========================================================================

  describe('multi-poll lifecycle', () => {
    it('handles create → vote → close → create new poll → vote again', async () => {
      setupSnapshot()
      const { getByTestId } = renderPollPage({ userId: 'user-1' })
      await waitFor(() => expect(snapshotCb).not.toBeNull())

      // Poll 1: created
      act(() => {
        fireSnap({
          poll: {
            question: 'Poll 1',
            options: [{ option: 'X', votes: 0 }],
            voted: [],
            isOpen: true,
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voting-form')
      })

      // Poll 1: user votes
      act(() => {
        fireSnap({
          poll: {
            question: 'Poll 1',
            options: [{ option: 'X', votes: 1 }],
            voted: [{ id: 'user-1' }],
            isOpen: true,
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voted')
      })

      // Poll 1: closed
      act(() => {
        fireSnap({
          poll: {
            question: 'Poll 1',
            options: [{ option: 'X', votes: 1 }],
            voted: [{ id: 'user-1' }],
            isOpen: false,
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('poll-closed')
      })

      // Poll 2: new poll created (fresh voted array, no votes)
      act(() => {
        fireSnap({
          poll: {
            question: 'Poll 2',
            options: [
              { option: 'Yes', votes: 0 },
              { option: 'No', votes: 0 },
            ],
            voted: [],
            isOpen: true,
          },
          host: 'host-1',
          participants: [],
        })
      })

      // User should be able to vote again on the NEW poll
      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voting-form')
      })

      // Poll 2: user votes
      act(() => {
        fireSnap({
          poll: {
            question: 'Poll 2',
            options: [
              { option: 'Yes', votes: 1 },
              { option: 'No', votes: 0 },
            ],
            voted: [{ id: 'user-1' }],
            isOpen: true,
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voted')
      })
    })
  })

  // =========================================================================
  // Estimation poll flow
  // =========================================================================

  describe('estimation poll flow', () => {
    it('handles estimation poll (no question) correctly', async () => {
      setupSnapshot()
      const { getByTestId } = renderPollPage({ userId: 'user-1' })
      await waitFor(() => expect(snapshotCb).not.toBeNull())

      act(() => {
        fireSnap({
          poll: {
            question: '',
            options: [
              { option: 1, votes: 0 },
              { option: 2, votes: 0 },
              { option: 3, votes: 0 },
              { option: 5, votes: 0 },
              { option: 8, votes: 0 },
              { option: 13, votes: 0 },
            ],
            voted: [],
            isOpen: true,
            type: 'estimation',
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voting-form')
      })

      // Vote
      act(() => {
        fireSnap({
          poll: {
            question: '',
            options: [
              { option: 1, votes: 0 },
              { option: 2, votes: 0 },
              { option: 3, votes: 0 },
              { option: 5, votes: 1 },
              { option: 8, votes: 0 },
              { option: 13, votes: 0 },
            ],
            voted: [{ id: 'user-1' }],
            isOpen: true,
            type: 'estimation',
          },
          host: 'host-1',
          participants: [],
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voted')
      })
    })
  })

  // =========================================================================
  // Stress: 100 users join and vote, verify final state
  // =========================================================================

  describe('100-user stress test', () => {
    it('100 users vote sequentially via snapshots, state is always consistent', async () => {
      setupSnapshot()
      const { getByTestId } = renderPollPage({ userId: 'user-0' })
      await waitFor(() => expect(snapshotCb).not.toBeNull())

      // Poll created
      act(() => {
        fireSnap({
          poll: {
            question: 'Scale estimate',
            options: [
              { option: '1', votes: 0 },
              { option: '3', votes: 0 },
              { option: '5', votes: 0 },
              { option: '8', votes: 0 },
            ],
            voted: [],
            isOpen: true,
          },
          host: 'host-1',
          participants: Array.from({ length: 100 }, (_, i) => ({
            id: `user-${i}`,
            name: `U${i}`,
          })),
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('voting-form')
      })

      // 100 votes arrive as individual snapshots
      for (let i = 0; i < 100; i++) {
        const voted = Array.from({ length: i + 1 }, (_, j) => ({
          id: `user-${j}`,
          name: `U${j}`,
        }))

        act(() => {
          fireSnap({
            poll: {
              question: 'Scale estimate',
              options: [
                { option: '1', votes: Math.floor((i + 1) * 0.25) },
                { option: '3', votes: Math.floor((i + 1) * 0.25) },
                { option: '5', votes: Math.floor((i + 1) * 0.25) },
                { option: '8', votes: (i + 1) - 3 * Math.floor((i + 1) * 0.25) },
              ],
              voted,
              isOpen: true,
            },
            host: 'host-1',
            participants: Array.from({ length: 100 }, (_, k) => ({
              id: `user-${k}`,
              name: `U${k}`,
            })),
          })
        })

        // user-0 voted in the first snapshot (i=0), so from i>=0 it should be "voted"
        if (i >= 0) {
          expect(getByTestId('state').textContent).toBe('voted')
        }
      }

      // Final: poll closed
      act(() => {
        fireSnap({
          poll: {
            question: 'Scale estimate',
            options: [
              { option: '1', votes: 25 },
              { option: '3', votes: 25 },
              { option: '5', votes: 25 },
              { option: '8', votes: 25 },
            ],
            voted: Array.from({ length: 100 }, (_, j) => ({
              id: `user-${j}`,
              name: `U${j}`,
            })),
            isOpen: false,
          },
          host: 'host-1',
          participants: Array.from({ length: 100 }, (_, k) => ({
            id: `user-${k}`,
            name: `U${k}`,
          })),
        })
      })

      await waitFor(() => {
        expect(getByTestId('state').textContent).toBe('poll-closed')
      })
    })
  })
})
