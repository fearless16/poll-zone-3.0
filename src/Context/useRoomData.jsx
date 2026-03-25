import { createContext, useContext, useEffect, useReducer, useState } from 'react'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '../Firebase/config'
import { REDUCER_ACTIONS } from '../Utils/constants'
import { pollReducer } from './pollReducer'

/**
 * RoomDataContext provides the current poll state and user/room identifiers.
 */
export const RoomDataContext = createContext()

/**
 * Custom hook to access RoomDataContext.
 */
export const useRoomData = () => useContext(RoomDataContext)

/**
 * RoomDataContextProvider sets up a real-time listener to the Firestore document
 * representing the current room and updates the poll state accordingly.
 *
 * @param {Object} props - React props.
 * @param {React.ReactNode} props.children - Child components.
 * @returns {JSX.Element} The context provider component.
 */
export const RoomDataContextProvider = ({ children }) => {
  const [pollState, dispatch] = useReducer(pollReducer, {
    loading: true,
    currentPollData: {},
    roomData: {},
    error: '',
    isHost: false,
    isOpen: false,
    voted: false,
    isPoll: false,
  })

  const [roomId, setRoomId] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    if (!roomId || !userId) return

    dispatch({ type: REDUCER_ACTIONS.LOADING })

    const docRef = doc(db, 'rooms', roomId)

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          dispatch({ type: REDUCER_ACTIONS.FAILURE })
          return
        }

        const data = docSnap.data()
        if (!data?.poll) {
          dispatch({ type: REDUCER_ACTIONS.FAILURE })
          return
        }

        // Skip local-only snapshots to avoid flicker from stale data
        if (docSnap.metadata.hasPendingWrites) return

        const payload = { ...data, userId, roomId }
        dispatch({ type: REDUCER_ACTIONS.SUCCESS, payload })
      },
      (error) => {
        console.error('Firestore listener error:', error)
        dispatch({ type: REDUCER_ACTIONS.FAILURE })
      }
    )

    return () => unsubscribe()
  }, [roomId, userId])

  const value = {
    pollState,
    dispatch,
    roomId,
    setRoomId,
    userId,
    setUserId,
  }

  return <RoomDataContext.Provider value={value}>{children}</RoomDataContext.Provider>
}
