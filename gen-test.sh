#!/bin/bash

mkdir -p tests

echo "✅ Creating test: addPoll.test.js"
cat <<EOF > tests/addPoll.test.js
import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import { initTestEnv } from './setupTestDB.js'
import { addPoll } from '../src/Firebase/dbHandler.js'
import { doc, getDoc } from 'firebase/firestore'

describe('📥 Add Poll', () => {
  let db, testEnv
  const roomId = 'poll-room'

  beforeAll(async () => {
    testEnv = await initTestEnv()
    db = testEnv.unauthenticatedContext().firestore()
    await db.doc('rooms/' + roomId).set({ poll: {} })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should create a poll with correct options', async () => {
    await addPoll([
      { option: 'Yes', votes: 0 },
      { option: 'No', votes: 0 }
    ], 'Are you dumb?', db)

    const snap = await getDoc(doc(db, 'rooms', roomId))
    const poll = snap.data().poll

    expect(poll.question).toBe('Are you dumb?')
    expect(poll.options.length).toBe(2)
    expect(poll.isOpen).toBe(true)
  })
})
EOF

echo "✅ Creating test: closePoll.test.js"
cat <<EOF > tests/closePoll.test.js
import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import { initTestEnv } from './setupTestDB.js'
import { closePoll } from '../src/Firebase/dbHandler.js'
import { doc, setDoc, getDoc } from 'firebase/firestore'

describe('🔒 Close Poll', () => {
  let db, testEnv
  const roomId = 'room-close'

  beforeAll(async () => {
    testEnv = await initTestEnv()
    db = testEnv.unauthenticatedContext().firestore()
    await setDoc(doc(db, 'rooms', roomId), {
      poll: { isOpen: true }
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should close the poll', async () => {
    await closePoll(roomId, db)
    const snap = await getDoc(doc(db, 'rooms', roomId))
    expect(snap.data().poll.isOpen).toBe(false)
  })
})
EOF

echo "✅ Creating test: getRoomData.test.js"
cat <<EOF > tests/getRoomData.test.js
import { describe, beforeAll, afterAll, test, expect } from 'vitest'
import { initTestEnv } from './setupTestDB.js'
import { getRoomData } from '../src/Firebase/dbHandler.js'
import { doc, setDoc } from 'firebase/firestore'

describe('📦 Get Room Data', () => {
  let db, testEnv
  const roomId = 'fetch-room'

  beforeAll(async () => {
    testEnv = await initTestEnv()
    db = testEnv.unauthenticatedContext().firestore()
    await setDoc(doc(db, 'rooms', roomId), {
      roomName: 'Bakchodi Central',
      host: 'ramu'
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should fetch correct room data', async () => {
    const { response } = await getRoomData(roomId, db)
    expect(response.success).toBe(true)
    expect(response.data.roomName).toBe('Bakchodi Central')
  })
})
EOF

echo "✅ Creating test: pollReducer.test.js"
cat <<EOF > tests/pollReducer.test.js
import { describe, test, expect } from 'vitest'
import { pollReducer, SUCCESS, VOTED, FAILURE } from '../src/Context/pollReducer'

describe('🧠 pollReducer logic', () => {
  test('SUCCESS sets poll and voted state', () => {
    const payload = {
      userId: 'abc',
      poll: {
        isOpen: true,
        voted: [{ id: 'abc' }],
        options: [{ option: '1', votes: 1 }]
      },
      host: 'abc'
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
})
EOF

echo "✅ All test files generated in ./tests"
