import { describe, test, expect } from 'vitest'
import { pollReducer, SUCCESS, VOTED, FAILURE } from '../src/Context/pollReducer'

describe('🧠 pollReducer logic', () => {
  test('SUCCESS sets poll and voted state', () => {
    const payload = {
      userId: 'abc',
      poll: {
        isOpen: true,
        voted: [{ id: 'abc' }],
        options: [{ option: '1', votes: 1 }],
      },
      host: 'abc',
    }

    const state = pollReducer({}, { type: SUCCESS, payload })
    expect(state.voted).toBe(true)
    expect(state.isOpen).toBe(true)
    expect(state.isPoll).toBe(true)
  })

  test('VOTED sets voted true', () => {
    const state = pollReducer({}, { type: VOTED })
    expect(state.voted).toBe(true)
  })

  test('FAILURE sets error', () => {
    const state = pollReducer({}, { type: FAILURE })
    expect(state.error).toBe('Something went wrong')
  })

  test('should return default state when action is unknown', () => {
    const state = pollReducer({ voted: false }, { type: 'UNKNOWN' })
    expect(state.voted).toBe(false)
  })
})
