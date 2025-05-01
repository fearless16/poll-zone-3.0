import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '../Firebase/config'
import { pollReducer, SUCCESS, LOADING, FAILURE } from './pollReducer'

/*
  ----------------------------------------------------------------------
  🧠 Context Setup: RoomDataContext
  Centralized state provider for room ID, user ID, and real-time poll state
  ----------------------------------------------------------------------
*/
export const RoomDataContext = createContext()

/*
  ----------------------------------------------------------------------
  🧪 Custom Hook: useRoomData
  Simplifies context access — keeps code DRY in consumers
  ----------------------------------------------------------------------
*/
export const useRoomData = () => useContext(RoomDataContext)

/*
  ----------------------------------------------------------------------
  🚀 Provider Component: RoomDataContextProvider
  Provides real-time state sync from Firestore for poll data
  ----------------------------------------------------------------------
*/
export const RoomDataContextProvider = ({ children }) => {
  // 🎯 Central reducer for poll data
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

  /*
    ----------------------------------------------------------------------
    🔄 Sync: Store latest pollState in a ref to avoid stale closures
    Firestore listener can lag behind render cycle, so we mirror stateRef
    ----------------------------------------------------------------------
  */
  const stateRef = useRef(pollState)
  useEffect(() => {
    stateRef.current = pollState
  }, [pollState])

  /*
    ----------------------------------------------------------------------
    🔥 Firestore onSnapshot Listener
    - Runs when both roomId and userId are available
    - Uses fallback if Firestore gets stuck on optimistic local writes
    - Avoids re-dispatching same poll data via optional `same` check
    ----------------------------------------------------------------------
  */
  useEffect(() => {
    if (!roomId || !userId) return

    dispatch({ type: LOADING })

    const docRef = doc(db, 'rooms', roomId)

    let confirmed = false
    let lastPayload = null

    // ⏳ Fallback if metadata.hasPendingWrites stays true forever
    const fallbackTimeout = setTimeout(() => {
      if (!confirmed && lastPayload) {
        console.warn('🔥 Dispatching SUCCESS via fallback')
        dispatch({ type: SUCCESS, payload: lastPayload })
      }
    }, 3000)

    const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
      const data = docSnapshot.data()

      // 🚫 Defensive check — invalid doc or no poll = failure
      if (!docSnapshot.exists() || !data || !data.poll) {
        dispatch({ type: FAILURE })
        return
      }

      const payload = { ...data, userId, roomId }
      lastPayload = payload

      if (!docSnapshot.metadata.hasPendingWrites) {
        confirmed = true
        clearTimeout(fallbackTimeout)
        dispatch({ type: SUCCESS, payload })
      }
    })

    // 🧹 Cleanup on room/user switch or component unmount
    return () => {
      clearTimeout(fallbackTimeout)
      unsubscribe()
    }
  }, [roomId, userId])

  const value = {
    pollState,
    dispatch,
    roomId,
    setRoomId,
    userId,
    setUserId,
  }

  return (
    <RoomDataContext.Provider value={value}>
      {children}
    </RoomDataContext.Provider>
  )
}
