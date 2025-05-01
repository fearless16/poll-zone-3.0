
import { render, waitFor, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { RoomDataContextProvider, useRoomData } from '../../src/Context/useRoomData'
import { onSnapshot } from 'firebase/firestore'

// 🔧 Mocks
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore')
  return {
    ...actual,
    onSnapshot: vi.fn(),
    doc: vi.fn(),
  }
})

// 🧪 Consumer Test Component
function TestComponent() {
  const { pollState, setRoomId, setUserId } = useRoomData()

  useEffect(() => {
    setRoomId('room-123')
    setUserId('user-456')
  }, [])

  return <div>{pollState?.currentPollData?.question || 'No Question'}</div>
}

describe('🧠 useRoomData — Full Test Suite', () => {
  let unsubMock

  beforeEach(() => {
    unsubMock = vi.fn()
    vi.useFakeTimers()

    onSnapshot.mockImplementation((_ref, cb) => {
      // Simulate valid doc data
      cb({
        exists: () => true,
        data: () => ({
          poll: {
            question: 'Is this working?',
            options: [{ option: 'Yes', votes: 1 }],
            voted: [],
            isOpen: true,
          },
          participants: [{ id: 'user-456' }],
          host: 'user-456'
        }),
        metadata: { hasPendingWrites: false }
      })
      return unsubMock
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('✅ dispatches SUCCESS on valid snapshot without pendingWrites', async () => {
    const { getByText } = render(
      <RoomDataContextProvider>
        <TestComponent />
      </RoomDataContextProvider>
    )

    await waitFor(() => {
      expect(getByText('Is this working?')).toBeDefined()
    })

    expect(onSnapshot).toHaveBeenCalledTimes(1)
    expect(unsubMock).not.toHaveBeenCalled()
  })

  test('🕒 uses fallback dispatch when hasPendingWrites is stuck', async () => {
    onSnapshot.mockImplementation((_ref, cb) => {
      cb({
        exists: () => true,
        data: () => ({
          poll: {
            question: 'Fallback test',
            options: [{ option: 'A', votes: 0 }],
            voted: [],
            isOpen: true,
          },
          participants: [],
          host: 'user-456'
        }),
        metadata: { hasPendingWrites: true }
      })
      return unsubMock
    })

    const { getByText } = render(
      <RoomDataContextProvider>
        <TestComponent />
      </RoomDataContextProvider>
    )

    // Advance fake timer to trigger fallback
    await act(() => {
      vi.advanceTimersByTime(3100)
    })

    expect(getByText('Fallback test')).toBeDefined()
  })

  test('🚫 dispatches FAILURE if doc does not exist or poll missing', async () => {
    onSnapshot.mockImplementation((_ref, cb) => {
      cb({
        exists: () => false,
        data: () => null,
        metadata: { hasPendingWrites: false }
      })
      return unsubMock
    })

    const { getByText } = render(
      <RoomDataContextProvider>
        <TestComponent />
      </RoomDataContextProvider>
    )

    await waitFor(() => {
      expect(getByText('No Question')).toBeDefined()
    })
  })

  test('🧹 unsubscribes and clears timeout on unmount', () => {
    const { unmount } = render(
      <RoomDataContextProvider>
        <TestComponent />
      </RoomDataContextProvider>
    )

    unmount()
    expect(unsubMock).toHaveBeenCalledTimes(1)
  })
})
