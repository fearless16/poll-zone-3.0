import { db } from './src/Firebase/config'
import { doc, runTransaction, setDoc, getDoc } from 'firebase/firestore'

const ROOM_ID = 'test-room-id'

async function createTestRoom() {
  const roomRef = doc(db, 'rooms', ROOM_ID)
  await setDoc(roomRef, {
    poll: {
      isOpen: true,
      options: [
        { option: 1, votes: 0 },
        { option: 2, votes: 0 },
        { option: 3, votes: 0 },
        { option: 4, votes: 0 },
      ],
      voted: []
    }
  })
}

const castVote = async (userId, userName, optionIndex) => {
  const roomRef = doc(db, 'rooms', ROOM_ID)

  await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef)

    if (!roomDoc.exists()) {
      throw new Error('Room does not exist!')
    }

    const roomData = roomDoc.data()
    const poll = roomData.poll

    if (!poll || !poll.isOpen) {
      throw new Error('Poll is closed!')
    }

    const voters = poll.voted?.map((voter) => voter.id || voter) || []

    if (voters.includes(userId)) {
      throw new Error('Already Voted!')
    }

    const options = poll.options || []

    if (optionIndex < 0 || optionIndex >= options.length) {
      throw new Error('Invalid voting option selected!')
    }

    options[optionIndex].votes = (options[optionIndex].votes || 0) + 1
    const updatedVoted = [...(poll.voted || []), { id: userId, name: userName }]

    transaction.update(roomRef, {
      'poll.options': options,
      'poll.voted': updatedVoted,
    })
  })
}

export const autoVote = async () => {
  try {
    await createTestRoom()
    console.log('✅ Test Room Created!')
  } catch (err) {
    console.error('❌ Room Creation Failed:', err.message)
    return
  }

  console.log('🔥 AutoVoting 50 users started...')

  const roomDoc = await getDoc(doc(db, 'rooms', ROOM_ID))
  const options = roomDoc.data()?.poll?.options || []
  const OPTIONS_COUNT = options.length

  const promises = []

  for (let i = 1; i <= 50; i++) {
    const userId = `user-${i}`
    const userName = `User ${i}`
    const randomOptionIndex = Math.floor(Math.random() * OPTIONS_COUNT)

    promises.push(
      castVote(userId, userName, randomOptionIndex)
        .then(() => ({ success: true }))
        .catch((err) => ({ success: false, error: err.message }))
    )
  }

  const results = await Promise.allSettled(promises)

  const successfulVotes = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failedVotes = results.length - successfulVotes

  console.log(`🎯 AutoVoting completed! Success: ${successfulVotes}, Failures: ${failedVotes}`)

  const finalRoomDoc = await getDoc(doc(db, 'rooms', ROOM_ID))
  const finalPoll = finalRoomDoc.data()?.poll

  let totalVotes = 0
  finalPoll?.options?.forEach(opt => {
    totalVotes += opt.votes || 0
  })

  console.log(`📊 Actual votes counted in DB: ${totalVotes}`)
}
