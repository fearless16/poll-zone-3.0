import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  runTransaction,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import { v4 as uuidv4 } from 'uuid'

/**
 * Creates a new room in Firestore with host info
 * @param {string} name - Display name of host
 * @param {string} roomName - Custom room name
 * @returns {Promise<{ response?: object, error?: object }>}
 */
export const createRoom = async (name, roomName) => {
  const hostId = uuidv4()

  const roomDetails = {
    participants: [{ id: hostId, name }],
    host: hostId,
    roomName,
    createdAt: Timestamp.now(),
    poll: {},
  }

  try {
    const res = await addDoc(collection(db, 'rooms'), roomDetails)
    const roomId = res.id
    
    localStorage.setItem('id', hostId)
    localStorage.setItem('displayName', name)
    localStorage.setItem('roomId', roomId)

    return { response: { success: true, roomId } }
  } catch (error) {
    return { error }
  }
}

/**
 * Joins a user into an existing room
 * @param {string} roomId
 * @param {string} name - User's display name
 * @returns {Promise<{ response?: object, error?: object }>}
 */
export const joinPoll = async (roomId, name) => {
  const id = localStorage.getItem('id')
  const docRef = doc(db, 'rooms', roomId.trim())

  try {
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { error: new Error('Room does not exist') }

    const data = snap.data()
    if (!data.participants || !Array.isArray(data.participants)) {
      return { error: new Error('Invalid room data') }
    }
    
    if (id && data.participants.some((p) => p.id === id)) {
      return { response: { success: true, data: 'Already a room member' } }
    }

    const userId = uuidv4()
    localStorage.setItem('id', userId)
    localStorage.setItem('displayName', name)
    await updateDoc(docRef, {
      participants: arrayUnion({ id: userId, name }),
    })
    localStorage.setItem('roomId', roomId)
    return { response: { success: true, data: 'User registered successfully' } }
  } catch (error) {
    return { error }
  }
}

/**
 * Adds a poll to an existing room
 * @param {string} roomId
 * @param {Array} options - Poll options
 * @param {string} [question] - Poll question (optional)
 * @returns {Promise<{ response?: object, error?: object }>}
 */
export const addPoll = async (roomId, options, question = '') => {
  const docRef = doc(db, 'rooms', roomId)
  const userId = localStorage.getItem('id')
  
  try {
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { error: new Error('Room not found') }
    
    const roomData = snap.data()
    if (roomData.host !== userId) {
      return { error: new Error('Only host can create polls') }
    }
    
    const poll = {
      type: question ? 'voting' : 'estimation',
      question,
      options,
      createdAt: Timestamp.now(),
      voted: [],
      isOpen: true,
    }
    
    await updateDoc(docRef, { poll })
    return { response: { success: true } }
  } catch (error) {
    return { error }
  }
}

/**
 * Retrieves data for a specific room from Firestore.
 *
 * @param {string} roomId - The ID of the room to fetch data for.
 * @throws Will throw an error if the Firestore instance is not provided.
 * @returns {Promise<Object>} An object containing the response status and room data if successful,
 *                            or an error if the room is not found or the data is empty.
 */
export const getRoomData = async (roomId) => {
  if (!db) throw new Error('Firestore instance is required')

  try {
    const snap = await getDoc(doc(db, 'rooms', roomId))

    if (!snap.exists()) {
      return {
        response: { success: false },
        error: new Error('Room not found'),
      }
    }

    const data = snap.data()
    if (!data || Object.keys(data).length === 0) {
      return {
        response: { success: false },
        error: new Error('Empty room data'),
      }
    }

    return {
      response: { success: true, data },
    }
  } catch (error) {
    return { error }
  }
}

/**
 * Checks if current user already voted
 * @returns {Promise<boolean>}
 */
export const isVoted = async () => {
  try {
    const roomId = localStorage.getItem('roomId')
    const userId = localStorage.getItem('id')
    
    if (!roomId || !userId) return false
    
    const snap = await getDoc(doc(db, 'rooms', roomId))
    if (!snap.exists()) return false
    
    const data = snap.data()
    return data?.poll?.voted?.some((v) => v.id === userId) || false
  } catch (error) {
    console.error('Error checking vote status:', error)
    return false
  }
}

/**
 * Closes an open poll in a specified room within the Firestore database.
 *
 * @param {string} roomId - The unique identifier of the room containing the poll.
 * @throws {Error} Throws an error if the roomId or db is not provided,
 *                 if the room does not exist, or if the poll is missing or malformed.
 * @returns {Promise<void>} Resolves when the poll is successfully closed.
 */
export const closePoll = async (roomId) => {
  if (!roomId) throw new Error('Room ID is required')
  if (!db) throw new Error('Firestore instance (db) is required')

  const userId = localStorage.getItem('id')
  const roomRef = doc(db, 'rooms', roomId)

  await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef)
    
    if (!roomSnap.exists()) {
      throw new Error('Room does not exist')
    }
    
    const room = roomSnap.data()
    
    if (room.host !== userId) {
      throw new Error('Only host can close the poll')
    }

    if (!room.poll || typeof room.poll !== 'object') {
      throw new Error('Poll is missing or malformed')
    }
    
    if (!room.poll.isOpen) return

    transaction.update(roomRef, { 'poll.isOpen': false })
  })
}

/**
 * Safely casts a vote using Firestore transaction
 * @param {string} roomId
 * @param {number} optionIndex
 * @param {string} userId
 * @param {string} userName
 * @returns {Promise<void>}
 */
export const castVote = async (roomId, optionIndex, userId, userName) => {
  const roomRef = doc(db, 'rooms', roomId)

  await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef)
    if (!roomSnap.exists()) throw new Error('Room does not exist')

    const data = roomSnap.data()
    const poll = data.poll
    if (!poll?.isOpen) throw new Error('Poll is closed')

    const alreadyVoted = poll.voted.some((v) => v.id === userId)
    if (alreadyVoted) throw new Error('Already voted')
    
    if (!poll.options || optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new Error('Invalid option index')
    }

    const updatedOptions = [...poll.options]
    updatedOptions[optionIndex].votes += 1

    const updatedVoted = [...poll.voted, { id: userId, name: userName }]

    transaction.update(roomRef, {
      'poll.options': updatedOptions,
      'poll.voted': updatedVoted,
      'poll.lastUpdated': Timestamp.now(),
    })
  })
}
