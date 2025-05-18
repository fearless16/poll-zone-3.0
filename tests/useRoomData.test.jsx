import React from 'react'
import { render, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RoomDataContextProvider, useRoomData } from '../src/Context/useRoomData'
import { onSnapshot } from 'firebase/firestore'
import { useEffect } from 'react'

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    onSnapshot: vi.fn(),
    doc: vi.fn(),
  }
})

function TestComponent({ skipSet = false }) {
  const { pollState, setRoomId, setUserId } = useRoomData()

  useEffect(() => {
    if (!skipSet) {
      setRoomId('room-1')
      setUserId('user-1')
    }
  }, [skipSet, setRoomId, setUserId])

  return <div data-testid="question">{pollState.currentPollData?.question || ''}</div>
}

describe('useRoomData hook', () => {
  let unsubMock
  let warnSpy

  beforeEach(() => {
    unsubMock = vi.fn()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    cleanup()
  })

  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('does not subscribe if roomId/userId not set', () => {
    render(
      <RoomDataContextProvider>
        <TestComponent skipSet />
      </RoomDataContextProvider>
    )
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('dispatches FAILURE if poll is null despite document existing', async () => {
    onSnapshot.mockImplementation((_, cb) => {
      cb({
        exists: () => true,
        data: () => ({
          poll: null,
          host: 'user-1',
          participants: [],
        }),
        metadata: { hasPendingWrites: false },
      })
      return unsubMock
    })

    const { getByTestId } = render(
      <RoomDataContextProvider>
        <TestComponent />
      </RoomDataContextProvider>
    )

    await waitFor(() => {
      expect(getByTestId('question').textContent).toBe('')
    })
  })

  it('dispatches FAILURE when document does not exist', async () => {
    onSnapshot.mockImplementation((_, cb) => {
      cb({ exists: () => false })
      return unsubMock
    })

    const { getByTestId } = render(
      <RoomDataContextProvider>
        <TestComponent />
      </RoomDataContextProvider>
    )

    await waitFor(() => {
      expect(getByTestId('question').textContent).toBe('')
    })
  })

  it('dispatches FAILURE when poll field is missing', async () => {
    onSnapshot.mockImplementation((_, cb) => {
      cb({
        exists: () => true,
        data: () => ({}),
        metadata: { hasPendingWrites: false },
      })
      return unsubMock
    })

    const { getByTestId } = render(
      <RoomDataContextProvider>
        <TestComponent />
      </RoomDataContextProvider>
    )

    await waitFor(() => {
      expect(getByTestId('question').textContent).toBe('')
    })
  })

  it('dispatches SUCCESS when poll present and no pendingWrites', async () => {
    onSnapshot.mockImplementation((_, cb) => {
      cb({
        exists: () => true,
        data: () => ({
          poll: { question: 'Q1', options: [], voted: [], isOpen: true },
          participants: [],
          host: 'user-1',
        }),
        metadata: { hasPendingWrites: false },
      })
      return unsubMock
    })

    const { getByTestId } = render(
      <RoomDataContextProvider>
        <TestComponent />
      </RoomDataContextProvider>
    )

    await waitFor(() => {
      expect(getByTestId('question').textContent).toBe('Q1')
    })
    expect(onSnapshot).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('dispatches SUCCESS and warns when hasPendingWrites is true', async () => {
    onSnapshot.mockImplementation((_, cb) => {
      cb({
        exists: () => true,
        data: () => ({
          poll: { question: 'Q2', options: [], voted: [], isOpen: true },
          participants: [],
          host: 'user-1',
        }),
        metadata: { hasPendingWrites: true },
      })
      return unsubMock
    })

    const { getByTestId } = render(
      <RoomDataContextProvider>
        <TestComponent />
      </RoomDataContextProvider>
    )

    await waitFor(() => {
      expect(getByTestId('question').textContent).toBe('Q2')
    })
    expect(warnSpy).toHaveBeenCalledWith('Local changes pending sync with server.')
  })

  it('cleans up the listener on unmount', () => {
    onSnapshot.mockReturnValue(unsubMock)

    const { unmount } = render(
      <RoomDataContextProvider>
        <TestComponent />
      </RoomDataContextProvider>
    )
    unmount()
    expect(unsubMock).toHaveBeenCalled()
  })
})
