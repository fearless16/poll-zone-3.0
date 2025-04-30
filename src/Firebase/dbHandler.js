import { db } from './config'
import {
  addDoc,
  collection,
  updateDoc,
  getDoc,
  doc,
  arrayUnion,
  runTransaction,
  Timestamp,
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

/** Creates a new room with host info and default poll state */
export const createRoom = async (name, roomName) => {
  const hostId = uuidv4()
  let response = {}
  let error = {}

  localStorage.setItem('id', hostId)
  localStorage.setItem('displayName', name)

  const roomDetails = {
    participants: [{ id: hostId, name }],
    host: hostId,
    roomName,
    createdAt: Timestamp.now(),
    poll: {},
  }

  const collectionRef = collection(db, 'rooms')
  try {
    const res = await addDoc(collectionRef, roomDetails)
    const roomId = res.id
    localStorage.setItem('roomId', roomId)
    error = undefined
    response = { success: true, roomId }
  } catch (err) {
    error = { ...err }
    response = undefined
    throw err
  }
  return { response, error }
}

/** Adds a user to an existing poll room */
export const joinPoll = async (roomId, name) => {
  const id = localStorage.getItem('id')
  let response = {}
  let error = {}
  try {
    const docRef = doc(db, 'rooms', roomId.trim())
    const dataSnapshot = await getDoc(docRef)

    if (!dataSnapshot.data()) {
      return { response: undefined, error: 'Room does not exist' }
    }

    /** Case: user already exists */
    if (id) {
      const { participants } = dataSnapshot.data()
      const existingUser = participants.find((participant) => participant.id === id)
      if (existingUser) {
        response = { success: true, data: 'Already a room member' }
        return { response, error }
      }
    }

    /** New user joining the room */
    const userId = uuidv4()
    localStorage.setItem('id', userId)
    localStorage.setItem('displayName', name)
    await updateDoc(docRef, { participants: arrayUnion({ id: userId, name }) })
    localStorage.setItem('roomId', roomId)

    response = { success: true, data: 'user registered successfully' }
    error = undefined
    return { response, error }
  } catch (err) {
    response = undefined
    error = { ...err }
    return { response, error }
  }
}

/** Adds a new poll to an existing room */
export const addPoll = async (roomId, options, question, dbInstance = db) => {
  let response = {}
  let error = {}
  const docRef = doc(dbInstance, 'rooms', roomId)
  const createdAt = new Date()

  const poll = {
    type: question ? 'voting' : 'estimation',
    question: question || '',
    options: options,
    createdAt: createdAt,
    voted: [],
    isOpen: true,
  }

  try {
    await updateDoc(docRef, { poll: poll })
    response = { success: true }
    return { response, error: undefined }
  } catch (err) {
    response = undefined
    error = { ...err }
    throw error
  }
}

/** Fetches data of a specific room */
export const getRoomData = async (roomId, dbInstance = db) => {
  let response = {}
  let error = {}
  const docRef = doc(dbInstance, 'rooms', roomId)

  try {
    const docSnapshot = await getDoc(docRef)
    if (!docSnapshot || !docSnapshot.data()) {
      response = { success: true, data: 'not available' }
      return { response, error: undefined }
    }
    response = { success: true, data: docSnapshot.data() }
    error = undefined
    return { response, error }
  } catch (error) {
    response = undefined
    throw error
  }
}

/** Checks whether the current user has already voted */
export const isVoted = async () => {
  const roomId = localStorage.getItem('roomId')
  const userId = localStorage.getItem('id')
  try {
    const docRef = doc(db, 'rooms', roomId)
    const dataSnapshot = await getDoc(docRef)
    const { participants, poll } = dataSnapshot.data()

    if (!participants.find((participant) => participant.id === userId)) {
      throw new Error('Invalid user')
    }

    return Array.isArray(poll.voted) && poll.voted.some((v) => v.id === userId)
  } catch (err) {
    throw err
  }
}

/** Closes the poll by updating isOpen to false */
export const closePoll = async (roomId, dbInstance = db) => {
  try {
    const docRef = doc(dbInstance, 'rooms', roomId)
    await updateDoc(docRef, {
      'poll.isOpen': false,
    })
    return { data: 'success', error: undefined }
  } catch (err) {
    throw err
  }
}

/**
 * Cast a vote using Firestore transaction to ensure consistency
 * @param {string} roomId - Room document ID
 * @param {number} optionIndex - Index of selected option
 * @param {string} userId - Voter ID
 * @param {string} userName - Voter name
 */
export const castVote = async (roomId, optionIndex, userId, userName, dbInstance = db) => {
  const roomRef = doc(dbInstance, 'rooms', roomId)

  await runTransaction(dbInstance, async (transaction) => {
    const roomDoc = await transaction.get(roomRef)

    if (!roomDoc.exists()) {
      throw new Error('Room does not exist!')
    }

    const roomData = roomDoc.data()
    const poll = roomData.poll

    if (!poll || !poll.isOpen) {
      throw new Error('Poll is closed or invalid!')
    }

    const voters = poll.voted?.map((voter) => voter.id || voter) || []

    if (voters.includes(userId)) {
      throw new Error('Already voted!')
    }

    const options = poll.options || []

    if (optionIndex < 0 || optionIndex >= options.length) {
      throw new Error('Invalid voting option selected!')
    }

    /** Increment vote count and update voter list */
    options[optionIndex].votes = (options[optionIndex].votes || 0) + 1
    const updatedVoted = [...(poll.voted || []), { id: userId, name: userName }]

    transaction.update(roomRef, {
      'poll.options': options,
      'poll.voted': updatedVoted,
    })
  })
}
